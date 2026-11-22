const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Task = require('../models/Task');
const auth = require('../middleware/auth');
const { normalizeIdentity } = require('../identity');

const router = express.Router();
const fields = ['name', 'anonymousAlias', 'email', 'phone', 'hostelBlock', 'roomNumber', 'password'];
const uniqueLabels = {
  email: 'email address', phone: 'phone number', anonymousAlias: 'anonymous username'
};

function sessionFor(account) {
  const user = { id: account.id, email: account.email };
  const token = jwt.sign({ user }, process.env.JWT_SECRET, { expiresIn: '1d' });
  return { token, user };
}

router.post('/register', async (req, res) => {
  const data = Object.fromEntries(fields.map(key => [
    key, typeof req.body?.[key] === 'string' ? (key === 'password' ? req.body[key] : req.body[key].trim()) : ''
  ]));
  if (fields.some(key => !data[key] || data[key].length > 254) ||
      data.password.length < 8 || Buffer.byteLength(data.password) > 72) {
    return res.status(400).json('Complete every field. Use a password of at least 8 characters and at most 72 bytes.');
  }

  Object.assign(data, normalizeIdentity(data));
  if (!/^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)*$/.test(data.email) ||
      data.email.split('@')[0].split('.').some(part => !part) || data.email.indexOf('@') > 64) {
    return res.status(400).json('Enter a valid email address.');
  }
  if (!/^[6-9]\d{9}$/.test(data.phone)) {
    return res.status(400).json('Enter a valid 10-digit Indian mobile number.');
  }
  if (!/^[a-z0-9_][a-z0-9_.-]{2,29}$/.test(data.anonymousAlias)) {
    return res.status(400).json('Use 3–30 letters, numbers, periods, underscores, or hyphens for your anonymous username. Start with a letter, number, or underscore.');
  }

  try {
    data.password = await bcrypt.hash(data.password, 10);
    const user = await User.create(data);
    res.status(201).json(sessionFor(user));
  } catch (err) {
    if (err.code === 11000) {
      const label = uniqueLabels[Object.keys(err.keyPattern || {})[0]];
      return res.status(409).json(label ? `That ${label} is already registered.` : 'An account already uses these details.');
    }
    console.error('Registration failed:', err.name);
    res.status(500).json('Unable to create your account.');
  }
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body || {};
  if (typeof email !== 'string' || typeof password !== 'string') {
    return res.status(400).json('Enter your email address and password.');
  }
  try {
    const user = await User.findOne({ email: email.trim().toLowerCase() });
    if (!user || !await bcrypt.compare(password, user.password)) {
      return res.status(400).json('Invalid credentials.');
    }
    res.json(sessionFor(user));
  } catch (err) {
    console.error('Login failed:', err.name);
    res.status(500).json('Unable to sign in.');
  }
});

router.get('/session', auth, (_req, res) => res.sendStatus(204));

router.delete('/account', auth, async (req, res) => {
  const { password } = req.body || {};
  if (typeof password !== 'string' || !password) {
    return res.status(400).json('Enter your password to delete your account.');
  }

  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(401).json('Your session has expired.');
    if (!await bcrypt.compare(password, user.password)) {
      return res.status(400).json('Incorrect password.');
    }
    await Task.deleteMany({
      status: { $ne: 'Completed' },
      $or: [{ requester: user._id }, { worker: user._id }]
    });
    await User.deleteOne({ _id: user._id });
    req.app.get('sockets').in(`account:${user.id}`).disconnectSockets(true);
    res.sendStatus(204);
  } catch (err) {
    console.error('Account deletion failed:', err.name);
    res.status(500).json('Unable to delete your account. Please try again.');
  }
});

module.exports = router;
