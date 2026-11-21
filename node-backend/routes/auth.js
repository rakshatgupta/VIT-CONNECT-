const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { randomInt, randomUUID } = require('node:crypto');
const User = require('../models/User');

const router = express.Router();
const pending = new Map();
const lifetime = 10 * 60 * 1000;
const fields = ['name', 'anonymousAlias', 'email', 'regNo', 'phone', 'hostelBlock', 'roomNumber', 'password'];

function tokenFor(user) {
  return jwt.sign({ user: { id: user.id, regNo: user.regNo, email: user.email } },
    process.env.JWT_SECRET, { expiresIn: '1d' });
}

router.post('/send-otp', async (req, res) => {
  const data = Object.fromEntries(fields.map(key => [
    key, typeof req.body?.[key] === 'string' ? (key === 'password' ? req.body[key] : req.body[key].trim()) : ''
  ]));
  data.email = data.email.toLowerCase();
  const { email, regNo, anonymousAlias, password } = data;
  if (!/^[a-z0-9._%+-]+@vitstudent\.ac\.in$/.test(email)) {
    return res.status(400).json('Email must end in @vitstudent.ac.in');
  }
  if (fields.some(key => !data[key] || data[key].length > 254) ||
      password.length < 8 || Buffer.byteLength(password) > 72) {
    return res.status(400).json('Complete every field and use a password of at least 8 characters and at most 72 bytes.');
  }

  const now = Date.now();
  for (const [key, entry] of pending) {
    if (entry.expires <= now) pending.delete(key);
  }
  if (pending.has(email) || pending.size >= 1000) {
    return res.status(429).json('A code is already pending or registration is busy. Try again in ten minutes.');
  }

  const mock = process.env.NODE_ENV !== 'production' && process.env.DEV_MOCK_OTP === 'true';
  if (!mock && (!process.env.RESEND_API_KEY || !process.env.OTP_FROM_EMAIL)) {
    return res.status(503).json('Registration email is unavailable. Contact the site administrator.');
  }

  const otp = String(randomInt(100000, 1000000));
  const challengeId = randomUUID();
  const entry = { challengeId, otp, expires: now + lifetime, attempts: 0, ready: false };
  pending.set(email, entry);
  try {
    if (await User.exists({ $or: [{ email }, { regNo }, { anonymousAlias }] })) {
      pending.delete(email);
      return res.status(400).json('Email, registration number, or alias is already in use.');
    }
    entry.data = { ...data, password: await bcrypt.hash(password, 10) };
    if (mock) {
      console.log(`[Local registration] Code for ${email}: ${otp}`);
    } else {
      const delivery = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: process.env.OTP_FROM_EMAIL,
          to: email,
          subject: 'Your VIT Connect verification code',
          text: `Your verification code is ${otp}. It expires in ten minutes.`
        }),
        signal: AbortSignal.timeout(10000)
      });
      if (!delivery.ok) throw new Error(`Email provider returned HTTP ${delivery.status}`);
    }
    entry.ready = true;
    res.json({ challengeId, msg: mock ? 'Check the local backend terminal for your code.' : 'Check your VIT student email for your code.' });
  } catch (err) {
    pending.delete(email);
    console.error('Registration code request failed:', err.message);
    res.status(503).json('Unable to send a verification code. Try again later.');
  }
});

router.post('/verify-register', async (req, res) => {
  const { email, challengeId, otp } = req.body || {};
  const key = typeof email === 'string' ? email.trim().toLowerCase() : '';
  const entry = pending.get(key);
  if (!entry?.ready || entry.challengeId !== challengeId || entry.expires <= Date.now() || entry.attempts >= 5) {
    return res.status(400).json('Verification code expired or unavailable.');
  }
  entry.attempts += 1;
  if (entry.otp !== otp) return res.status(400).json('Invalid verification code.');
  entry.ready = false;
  try {
    const user = await User.create(entry.data);
    pending.delete(key);
    res.json({ token: tokenFor(user) });
  } catch (err) {
    entry.ready = true;
    if (err.code === 11000) return res.status(409).json('Email, registration number, or alias is already in use.');
    console.error('Registration failed:', err.name);
    res.status(500).json('Unable to complete registration.');
  }
});

router.post('/login', async (req, res) => {
  const { regNo, password } = req.body || {};
  if (typeof regNo !== 'string' || typeof password !== 'string') {
    return res.status(400).json('Enter your registration number and password.');
  }
  try {
    const user = await User.findOne({ regNo: regNo.trim() });
    if (!user || !await bcrypt.compare(password, user.password)) {
      return res.status(400).json('Invalid credentials.');
    }
    res.json({ token: tokenFor(user) });
  } catch (err) {
    console.error('Login failed:', err.name);
    res.status(500).json('Unable to sign in.');
  }
});

module.exports = router;
