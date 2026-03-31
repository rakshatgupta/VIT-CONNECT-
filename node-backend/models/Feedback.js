const mongoose = require('mongoose');

const FeedbackSchema = new mongoose.Schema({
  text: { type: String, required: true },
  authorAlias: { type: String, default: 'Anonymous Student' },
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  isDeleted: { type: Boolean, default: false },
  category: { 
    type: String, 
    enum: ['Faculties', 'Hostel rooms', 'Mess food', 'Transportation', 'Campus life'],
    required: true
  },
  mediaUrl: { type: String }, // Optional image/video path
  comments: [{
    text: { type: String, required: true },
    authorAlias: { type: String, default: 'Anonymous Reply' },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    isDeleted: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now }
  }],
  upvotedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  downvotedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  upvotes: { type: Number, default: 0 },
  downvotes: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Feedback', FeedbackSchema);
