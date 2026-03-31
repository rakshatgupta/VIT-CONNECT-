const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const otpStore = new Map();

router.post('/send-otp', async (req, res) => {
  const { name, anonymousAlias, email, regNo, phone, hostelBlock, roomNumber, password } = req.body;

  try {
    if (!email || !email.match(/^[a-zA-Z0-9._%+-]+@vitstudent\.ac\.in$/)) {
      return res.status(400).json('Email must end in @vitstudent.ac.in');
    }

    let user = await User.findOne({ 
      $or: [{ email }, { regNo }, { anonymousAlias }] 
    });
    if (user) {
      return res.status(400).json('User with this Email, Reg No, or Alias already exists');
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    console.log(`\n========================================\n[VIRTUAL SMS] OTP for ${phone}: ${otp}\n========================================\n`);

    otpStore.set(phone, {
      otp,
      userData: { name, anonymousAlias, email, regNo, phone, hostelBlock, roomNumber, password },
      expires: Date.now() + 10 * 60 * 1000
    });

    res.json({ msg: 'Mock OTP generated. Please check the backend console.' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

router.post('/verify-register', async (req, res) => {
  const { phone, otp } = req.body;

  try {
    const pending = otpStore.get(phone);
    if (!pending) return res.status(400).json('OTP expired or not requested');
    if (Date.now() > pending.expires) return res.status(400).json('OTP expired');
    if (pending.otp !== otp) return res.status(400).json('Invalid OTP');

    const userData = pending.userData;
    let user = new User(userData);
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(userData.password, salt);

    await user.save();
    otpStore.delete(phone);

    const payload = { user: { id: user.id, regNo: user.regNo, email: user.email } };

    jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1d' }, (err, token) => {
      if (err) throw err;
      res.json({ token });
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

router.post('/login', async (req, res) => {
  const { regNo, password } = req.body;

  try {
    let user = await User.findOne({ regNo });
    if (!user) {
      return res.status(400).json('Invalid Credentials');
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json('Invalid Credentials');
    }

    const payload = { user: { id: user.id, regNo: user.regNo, email: user.email } };

    jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1d' }, (err, token) => {
      if (err) throw err;
      res.json({ token });
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;
