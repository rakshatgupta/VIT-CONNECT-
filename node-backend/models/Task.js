const mongoose = require('mongoose');

const TaskSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  location: { type: String, required: true }, // e.g., 'Main Gate -> D Block'
  price: { type: Number, required: true },
  time: { type: String, required: true },
  status: { 
    type: String, 
    enum: ['Open', 'Accepted', 'In Progress', 'Completed'],
    default: 'Open'
  },
  requester: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  worker: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  offers: [{
    applicant: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    extra: { type: Number, required: true },
    status: { type: String, enum: ['Pending', 'Declined'], default: 'Pending' }
  }],
  review: {
    stars: Number,
    comment: String,
    createdAt: Date
  },
  completedAt: Date,
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Task', TaskSchema);
