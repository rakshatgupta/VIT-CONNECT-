const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  anonymousAlias: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  regNo: { type: String, required: true, unique: true },
  phone: { type: String, required: true },
  hostelBlock: { type: String, required: true },
  roomNumber: { type: String, required: true },
  password: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', UserSchema);
