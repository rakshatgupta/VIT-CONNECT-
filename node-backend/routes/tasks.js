const express = require('express');
const router = express.Router();
const Task = require('../models/Task');

const auth = require('../middleware/auth');

const mongoose = require('mongoose');

router.get('/reviews', async (_req, res, next) => {
  try {
    const tasks = await Task.find({ status: 'Completed', 'review.stars': { $exists: true } })
      .select('worker review').populate('worker', 'name').sort({ 'review.createdAt': -1 }).lean();
    res.json(tasks.map(({ _id, worker, review }) => ({
      id: _id, worker: worker?.name || 'Former student', ...review
    })));
  } catch (error) { next(error); }
});

router.get('/requests', auth, async (req, res, next) => {
  try {
    const tasks = await Task.find({ requester: req.user.id, status: 'Open', 'offers.status': 'Pending' })
      .select('title price offers').populate('offers.applicant', 'name').lean();
    res.json(tasks.flatMap(task => task.offers.filter(offer => offer.status === 'Pending' && offer.applicant).map(offer => ({
      id: offer._id, task: task._id, owner: req.user.id, title: task.title, applicant: offer.applicant.name,
      extra: offer.extra, total: Math.round((task.price + offer.extra) * 100) / 100
    }))));
  } catch (error) { next(error); }
});

router.get('/', auth, async (req, res, next) => {
  try {
    const viewer = req.user.id;
    const tasks = await Task.find({ $or: [{ status: 'Open' }, { requester: viewer }, { worker: viewer }] })
      .populate('requester worker', 'name phone').populate('offers.applicant', 'name')
      .sort({ createdAt: -1 });
    res.json(tasks.filter(task => task.status !== 'Open' || task.requester).map(task => {
      const result = task.toObject();
      const owns = String(task.requester?._id) === viewer;
      const assigned = task.status === 'Accepted' || task.status === 'In Progress';
      result.offers = task.status === 'Open' ? result.offers.filter(offer => offer.applicant &&
        (owns || String(offer.applicant._id) === viewer)) : [];
      for (const role of ['requester', 'worker']) {
        const user = result[role];
        if (!user) continue;
        if (!assigned) delete user.phone;
      }
      return result;
    }));
  } catch (error) { next(error); }
});

function taskDetails(body = {}) {
  const { title, description, location, price, time } = body || {};
  const text = { title, description, location, time };
  if (!validMoney(price) || Object.values(text).some(value => typeof value !== 'string' || !value.trim())) return null;
  return { ...Object.fromEntries(Object.entries(text).map(([key, value]) => [key, value.trim()])), price: Number(price) };
}

router.post('/', auth, async (req, res, next) => {
  const details = taskDetails(req.body);
  if (!details) return res.status(400).json({ msg: 'Complete all task fields and enter a valid offered amount.' });
  try {
    const task = await Task.create({ ...details, requester: req.user.id });
    await task.populate('requester', 'name');
    res.json(task);
  } catch (error) { next(error); }
});

router.put('/:id', auth, async (req, res, next) => {
  const details = taskDetails(req.body);
  if (!details) return res.status(400).json({ msg: 'Complete all task fields and enter a valid offered amount.' });
  try {
    const result = await Task.updateOne({ _id: req.params.id, requester: req.user.id, status: 'Open' },
      { $set: { ...details, offers: [] } });
    if (!result.matchedCount) return res.status(409).json({ msg: 'Only the owner can edit an open task.' });
    res.sendStatus(204);
  } catch (error) { next(error); }
});

router.delete('/:id', auth, async (req, res, next) => {
  try {
    const result = await Task.deleteOne({ _id: req.params.id, requester: req.user.id, status: 'Open' });
    if (!result.deletedCount) return res.status(409).json({ msg: 'Only the owner can delete an open task.' });
    res.sendStatus(204);
  } catch (error) { next(error); }
});

function validMoney(value) {
  return (typeof value === 'number' || typeof value === 'string') && /^\d{1,7}(?:\.\d{1,2})?$/.test(String(value));
}

router.param('id', (_req, res, next, id) => {
  if (!mongoose.isObjectIdOrHexString(id)) return res.status(400).json({ msg: 'Invalid task ID.' });
  next();
});

router.put('/:id/accept', auth, async (req, res, next) => {
  const extra = req.body?.extra ?? 0;
  if (!validMoney(extra)) return res.status(400).json({ msg: 'Enter a valid additional amount.' });
  try {
    const result = await Task.updateOne({
      _id: req.params.id, status: 'Open', requester: { $ne: req.user.id },
      offers: { $not: { $elemMatch: { applicant: req.user.id, status: 'Pending' } } }
    }, { $push: { offers: { applicant: req.user.id, extra: Number(extra) } } });
    if (!result.modifiedCount) return res.status(409).json({ msg: 'This task is unavailable or you already sent a request.' });
    res.sendStatus(204);
  } catch (error) { next(error); }
});

router.put('/:id/offers/:offerId', auth, async (req, res, next) => {
  const { approve } = req.body || {};
  if (typeof approve !== 'boolean' || !mongoose.isObjectIdOrHexString(req.params.offerId)) {
    return res.status(400).json({ msg: 'Invalid decision.' });
  }
  try {
    const filter = { _id: req.params.id, requester: req.user.id, status: 'Open',
      offers: { $elemMatch: { _id: req.params.offerId, status: 'Pending' } } };
    const task = await Task.findOne(filter);
    if (!task) return res.status(409).json({ msg: 'This request is no longer pending.' });
    const offer = task.offers.id(req.params.offerId);
    if (approve && !await mongoose.model('User').exists({ _id: offer.applicant })) {
      return res.status(409).json({ msg: 'This applicant no longer has an account.' });
    }
    const update = approve
      ? { $set: { status: 'Accepted', worker: offer.applicant, price: Math.round((task.price + offer.extra) * 100) / 100, offers: [] } }
      : { $set: { 'offers.$.status': 'Declined' } };
    const result = await Task.updateOne(filter, update);
    if (!result.modifiedCount) return res.status(409).json({ msg: 'This request is no longer pending.' });
    res.sendStatus(204);
  } catch (error) { next(error); }
});

router.post('/:id/review', auth, async (req, res, next) => {
  const { stars, comment } = req.body || {};
  if (!Number.isInteger(stars) || stars < 1 || stars > 5 ||
      typeof comment !== 'string' || comment.trim().length > 280) {
    return res.status(400).json({ msg: 'Choose 1â€“5 stars and enter up to 280 characters.' });
  }
  try {
    const result = await Task.updateOne({ _id: req.params.id, requester: req.user.id,
      status: 'Completed', worker: { $exists: true, $ne: null }, 'review.stars': { $exists: false }
    }, { $set: { review: { stars, comment: comment.trim(), createdAt: new Date() } } });
    if (!result.modifiedCount) return res.status(409).json({ msg: 'A review cannot be added to this task.' });
    res.sendStatus(204);
  } catch (error) { next(error); }
});

// @route   PUT /api/tasks/:id/status
// @desc    Update task status (e.g. In Progress, Completed)
// @access  Private
router.put('/:id/status', auth, async (req, res) => {
  const { status } = req.body;
  if (!['In Progress', 'Completed'].includes(status)) {
    return res.status(400).json({ msg: 'Invalid status' });
  }

  try {
    let task = await Task.findById(req.params.id);
    
    if (!task) return res.status(404).json({ msg: 'Task not found' });
    
    const allowedUser = status === 'Completed' ? task.requester : task.worker;
    if (String(allowedUser) !== req.user.id) return res.status(403).json({ msg: 'You cannot change this task status' });
    if (task.status === status) return res.json(task);
    const from = status === 'Completed' ? ['Accepted', 'In Progress'] : ['Accepted'];
    task = await Task.findOneAndUpdate(
      { _id: task._id, status: { $in: from } },
      { $set: status === 'Completed' ? { status, completedAt: new Date() } : { status } }, { returnDocument: 'after' }
    );
    if (!task) return res.status(409).json({ msg: 'Task cannot change to that status' });

    res.json(task);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;
