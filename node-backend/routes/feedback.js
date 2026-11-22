const express = require('express');

const multer = require('multer');
const { randomUUID } = require('node:crypto');
const Feedback = require('../models/Feedback');
const User = require('../models/User');
const auth = require('../middleware/auth');
const media = require('../feedbackMedia');

function forViewer(feedback, userId) {
  const { author, upvotedBy, downvotedBy, comments, ...post } = feedback.toObject();
  return {
    ...post,
    ownedByViewer: String(author) === userId,
    upvotedBy: upvotedBy.filter(id => String(id) === userId),
    downvotedBy: downvotedBy.filter(id => String(id) === userId),
    comments: comments.map(({ user, ...comment }) => ({
      ...comment, ownedByViewer: String(user) === userId
    }))
  };
}

module.exports = (uploads) => {
  const router = express.Router();
  const extensions = {
    'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp',
    'image/gif': '.gif', 'video/mp4': '.mp4', 'video/webm': '.webm'
  };
  const storage = multer.diskStorage({
    destination: function(req, file, cb) { cb(null, uploads); },
    filename: function(req, file, cb) {
      cb(null, randomUUID() + extensions[file.mimetype]);
    }
  });
  const upload = multer({
    storage,
    limits: { fileSize: 20 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => cb(
      extensions[file.mimetype] ? null : new Error('Choose a JPEG, PNG, WebP, GIF, MP4 or WebM attachment.'),
      Boolean(extensions[file.mimetype])
    )
  });
  // @route   GET /api/feedback
  router.get('/', auth, async (req, res) => {
    try {
      const feedbacks = await Feedback.find().sort({ createdAt: -1 });
      res.json(feedbacks.map(feedback => forViewer(feedback, req.user.id)));
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server Error');
    }
  });
  // @route   POST /api/feedback (Anonymous but authenticated platform users)
  router.post('/', [auth, upload.single('media')], async (req, res) => {
    const { text, category } = req.body;

    let savedMedia = false;
    let feedback;
    try {
      if (typeof text !== 'string' || !text.trim() || !category) {
        return res.status(400).json('Please provide text and category');
      }
      const user = await User.findById(req.user.id);
      const newFeedback = new Feedback({
        text: text.trim(),
        category,
        authorAlias: user?.anonymousAlias || 'Anonymous Student',
        author: req.user.id,
        mediaUrl: req.file ? `/uploads/${req.file.filename}` : null
      });
      await newFeedback.validate();
      if (req.file) {
        await media.store(req.file);
        savedMedia = true;
      }
      feedback = await newFeedback.save();
      res.json(forViewer(feedback, req.user.id));
    } catch (error) {
      if (savedMedia && !feedback) await media.remove(req.file.filename).catch(cleanupError => {
        console.error('Feedback attachment rollback failed:', cleanupError.name);
      });
      if (error.name === 'ValidationError') return res.status(400).json('Please provide valid feedback and category.');
      console.error('Feedback post failed:', error.name);
      res.status(500).json('Unable to save feedback.');
    } finally {
      await media.discardTemporary(req.file);
    }
  });
  // @route   PUT /api/feedback/:id/upvote
  router.put('/:id/upvote', auth, async (req, res) => {
    try {
      const feedback = await Feedback.findById(req.params.id);
      if (!feedback) return res.status(404).json('Feedback not found');

      // Check if downvoted previously, remove it
      if (feedback.downvotedBy.includes(req.user.id)) {
        feedback.downvotedBy = feedback.downvotedBy.filter(id => id.toString() !== req.user.id);
        feedback.downvotes -= 1;
      }
      // Toggle upvote
      if (feedback.upvotedBy.includes(req.user.id)) {
        feedback.upvotedBy = feedback.upvotedBy.filter(id => id.toString() !== req.user.id);
        feedback.upvotes -= 1;
      } else {
        feedback.upvotedBy.push(req.user.id);
        feedback.upvotes += 1;
      }
      await feedback.save();
      res.json(forViewer(feedback, req.user.id));
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server Error');
    }
  });
  // @route   PUT /api/feedback/:id/downvote
  router.put('/:id/downvote', auth, async (req, res) => {
    try {
      const feedback = await Feedback.findById(req.params.id);
      if (!feedback) return res.status(404).json('Feedback not found');

      // Check if upvoted previously, remove it
      if (feedback.upvotedBy.includes(req.user.id)) {
        feedback.upvotedBy = feedback.upvotedBy.filter(id => id.toString() !== req.user.id);
        feedback.upvotes -= 1;
      }
      // Toggle downvote
      if (feedback.downvotedBy.includes(req.user.id)) {
        feedback.downvotedBy = feedback.downvotedBy.filter(id => id.toString() !== req.user.id);
        feedback.downvotes -= 1;
      } else {
        feedback.downvotedBy.push(req.user.id);
        feedback.downvotes += 1;
      }
      await feedback.save();
      res.json(forViewer(feedback, req.user.id));
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server Error');
    }
  });
  // @route   POST /api/feedback/:id/comment
  router.post('/:id/comment', auth, async (req, res) => {
    const { text, replyTo } = req.body || {};
    if (typeof text !== 'string' || !text.trim() || text.trim().length > 2000) {
      return res.status(400).json('Enter a comment of up to 2,000 characters.');
    }
    const validId = value => typeof value === 'string' && /^[a-f0-9]{24}$/i.test(value);
    if (!validId(req.params.id) || (replyTo != null && !validId(replyTo))) {
      return res.status(400).json('Invalid feedback or comment.');
    }

    try {
      const user = await User.findById(req.user.id);
      const filter = { _id: req.params.id, isDeleted: { $ne: true } };
      if (replyTo != null) filter.comments = { $elemMatch: { _id: replyTo, isDeleted: { $ne: true } } };
      const feedback = await Feedback.findOneAndUpdate(filter, {
        $push: { comments: { text: text.trim(), replyTo, authorAlias: user?.anonymousAlias || 'Anonymous Reply', user: req.user.id } }
      }, { returnDocument: 'after', runValidators: true });

      if (!feedback) return res.status(404).json('This feedback or comment is no longer available.');
      res.json(forViewer(feedback, req.user.id));
    } catch (err) {
      console.error('Comment Error:', err);
      res.status(500).json('Unable to post your comment.');
    }
  });

  // @route   PUT /api/feedback/:id/delete
  router.put('/:id/delete', auth, async (req, res) => {
    try {
      const feedback = await Feedback.findById(req.params.id);
      if (!feedback) return res.status(404).json('Feedback not found');

      // Check user match
      if (String(feedback.author) !== req.user.id) {
        return res.status(401).json('Not authorized to delete this feedback');
      }
      feedback.isDeleted = true;
      await feedback.save();
      res.json(forViewer(feedback, req.user.id));
    } catch (err) {
      console.error('Delete Feedback Error:', err);
      res.status(500).json('Server Error');
    }
  });
  // @route   PUT /api/feedback/:id/comment/:commentId/delete
  router.put('/:id/comment/:commentId/delete', auth, async (req, res) => {
    try {
      const feedback = await Feedback.findById(req.params.id);
      if (!feedback) return res.status(404).json('Feedback not found');
      const comment = feedback.comments.id(req.params.commentId);
      if (!comment) return res.status(404).json('Comment not found');
      if (comment.user.toString() !== req.user.id) {
        return res.status(401).json('Not authorized to delete this comment');
      }
      comment.isDeleted = true;
      await feedback.save();
      res.json(forViewer(feedback, req.user.id));
    } catch (err) {
      console.error('Delete Comment Error:', err);
      res.status(500).json('Server Error');
    }
  });
  router.use((err, _req, res, _next) => {
    res.status(400).json(err.code === 'LIMIT_FILE_SIZE' ? 'Attachments must be 20 MB or smaller.' : err.message);
  });
  return router;
};
