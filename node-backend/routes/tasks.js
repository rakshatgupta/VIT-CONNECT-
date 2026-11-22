const express = require('express');
const router = express.Router();
const Task = require('../models/Task');

const auth = require('../middleware/auth');

// @route   GET /api/tasks
// @desc    Get all active tasks
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const tasks = await Task.find({
      $and: [
        { status: { $ne: 'Completed' } },
        { 
          $or: [
            { status: 'Open' },
            { requester: req.user.id },
            { worker: req.user.id }
          ]
        }
      ]
    })
      .populate('requester', ['name', 'phone', 'hostelBlock', 'roomNumber'])
      .populate('worker', ['name', 'phone', 'hostelBlock', 'roomNumber'])
      .sort({ createdAt: -1 });
    res.json(tasks.map(task => {
      const result = task.toObject();
      if (String(task.requester?._id) !== req.user.id && String(task.worker?._id) !== req.user.id && result.requester) {
        const { _id } = result.requester;
        result.requester = { _id };
      }
      return result;
    }));
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   POST /api/tasks
// @desc    Create a new task
// @access  Private
router.post('/', auth, async (req, res) => {
  const { title, description, location, price, time } = req.body;

  try {
    const newTask = new Task({
      title,
      description,
      location,
      price,
      time,
      requester: req.user.id
    });

    const task = await newTask.save();
    
    const populatedTask = await Task.findById(task._id).populate('requester', ['name', 'phone', 'hostelBlock', 'roomNumber']);
    res.json(populatedTask);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   PUT /api/tasks/:id/accept
// @desc    Accept a task
// @access  Private
router.put('/:id/accept', auth, async (req, res) => {
  try {
    let task = await Task.findById(req.params.id);
    
    if (!task) return res.status(404).json({ msg: 'Task not found' });
    if (task.status !== 'Open') return res.status(400).json({ msg: 'Task is not available' });
    if (task.requester.toString() === req.user.id) return res.status(400).json({ msg: 'Cannot accept own task' });

    task = await Task.findOneAndUpdate(
      { _id: task._id, status: 'Open' },
      { status: 'Accepted', worker: req.user.id },
      { returnDocument: 'after' }
    )
      .populate('requester', ['name', 'phone', 'hostelBlock', 'roomNumber'])
      .populate('worker', ['name', 'phone', 'hostelBlock', 'roomNumber']);
    if (!task) return res.status(409).json({ msg: 'Task is no longer available' });

    res.json(task);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
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
      { _id: task._id, status: { $in: from } }, { status }, { returnDocument: 'after' }
    );
    if (!task) return res.status(409).json({ msg: 'Task cannot change to that status' });

    res.json(task);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;
