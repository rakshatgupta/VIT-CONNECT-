const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const Feedback = require('../models/Feedback');
const User = require('../models/User');
const auth = require('../middleware/auth');

const storage = multer.diskStorage({
  destination: function(req, file, cb) { cb(null, path.join(__dirname, '../uploads')); },
  filename: function(req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});
const upload = multer({ storage: storage });

// @route   GET /api/feedback
router.get('/', auth, async (req, res) => {
  try {
    const feedbacks = await Feedback.find().sort({ createdAt: -1 });
    res.json(feedbacks);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   POST /api/feedback (Anonymous but authenticated platform users)
router.post('/', [auth, upload.single('media')], async (req, res) => {
  const { text, category } = req.body;
  
  if (!text || !category) {
    return res.status(400).json('Please provide text and category');
  }

  try {
    const user = await User.findById(req.user.id);
    const alias = user ? user.anonymousAlias : 'Anonymous Student';

    const newFeedback = new Feedback({
      text,
      category,
      authorAlias: alias,
      author: req.user.id,
      mediaUrl: req.file ? `/uploads/${req.file.filename}` : null
    });

    const feedback = await newFeedback.save();
    res.json(feedback);
  } catch (err) {
    console.error('Feedback Post Error:', err);
    res.status(500).json(err.message || 'Server Error processing upload');
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
    res.json(feedback);
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
    res.json(feedback);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   POST /api/feedback/:id/comment
router.post('/:id/comment', auth, async (req, res) => {
  try {
    const feedback = await Feedback.findById(req.params.id);
    if (!feedback) return res.status(404).json('Feedback not found');

    const userEntry = await User.findById(req.user.id);
    const alias = userEntry ? userEntry.anonymousAlias : 'Anonymous Reply';

    const newComment = {
      text: req.body.text,
      authorAlias: alias,
      user: req.user.id
    };

    feedback.comments.push(newComment);
    await feedback.save();

    res.json(feedback);
  } catch (err) {
    console.error('Comment Error:', err);
    res.status(500).json('Server Error');
  }
});

// @route   PUT /api/feedback/:id/delete
router.put('/:id/delete', auth, async (req, res) => {
  try {
    const feedback = await Feedback.findById(req.params.id);
    if (!feedback) return res.status(404).json('Feedback not found');
    
    // Check user match
    if (feedback.author && feedback.author.toString() !== req.user.id) {
      return res.status(401).json('Not authorized to delete this feedback');
    }

    feedback.isDeleted = true;
    await feedback.save();
    res.json(feedback);
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
    res.json(feedback);
  } catch (err) {
    console.error('Delete Comment Error:', err);
    res.status(500).json('Server Error');
  }
});

module.exports = router;
