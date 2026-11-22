const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const { createHmac, timingSafeEqual } = require('node:crypto');
const fs = require('node:fs/promises');
const path = require('node:path');
const Task = require('../models/Task');
const Feedback = require('../models/Feedback');

module.exports = function adminRoutes(uploads) {
  const router = express.Router();
  const id = process.env.ADMIN_LOGIN_ID;
  const hash = process.env.ADMIN_PASSWORD_HASH;
  const key = id && hash && process.env.JWT_SECRET &&
    createHmac('sha256', process.env.JWT_SECRET).update('campus-admin:' + id + ':' + hash).digest();
  const limits = new Map();

  router.use((_req, res, next) => {
    res.set('Cache-Control', 'no-store');
    if (!key) return res.status(503).json({ msg: 'Admin login is not configured.' });
    next();
  });

  router.post('/login', async (req, res, next) => {
    const { loginId, password } = req.body || {};
    if (typeof loginId !== 'string' || typeof password !== 'string' || Buffer.byteLength(password) > 72) {
      return res.status(400).json({ msg: 'Enter an administrator ID and password.' });
    }
    const now = Date.now();
    for (const [address, record] of limits) {
      if (record.until <= now) limits.delete(address);
    }
    const address = req.ip;
    const record = limits.get(address) || { count: 0, until: now + 10 * 60 * 1000 };
    if (record.count >= 8 || (!limits.has(address) && limits.size >= 1000)) {
      return res.status(429).json({ msg: 'Too many attempts. Try again in ten minutes.' });
    }
    record.count++;
    limits.set(address, record);

    try {
      const actual = createHmac('sha256', key).update(loginId).digest();
      const expected = createHmac('sha256', key).update(id).digest();
      const passwordMatches = await bcrypt.compare(password, hash);
      if (!passwordMatches || !timingSafeEqual(actual, expected)) {
        return res.status(401).json({ msg: 'Invalid administrator credentials.' });
      }
      if (limits.get(address) === record) limits.delete(address);
      res.json({ token: jwt.sign({}, key, { subject: 'administrator', audience: 'campus-admin', expiresIn: '30m' }) });
    } catch (error) { next(error); }
  });

  router.use((req, res, next) => {
    try {
      const [scheme, token] = (req.get('authorization') || '').split(' ');
      if (scheme !== 'Bearer') throw new Error('Missing token');
      jwt.verify(token, key, { algorithms: ['HS256'], subject: 'administrator', audience: 'campus-admin' });
      next();
    } catch {
      res.status(401).json({ msg: 'Sign in as an administrator.' });
    }
  });

  router.get('/content', async (_req, res, next) => {
    try {
      const [tasks, feedback] = await Promise.all([
        Task.find().select('title status requester createdAt').populate('requester', 'name').sort({ createdAt: -1 }).lean(),
        Feedback.find({ isDeleted: { $ne: true } }).select('text category authorAlias createdAt').sort({ createdAt: -1 }).lean()
      ]);
      res.json({ tasks, feedback });
    } catch (error) { next(error); }
  });

  router.delete('/:kind/:id', async (req, res, next) => {
    const { kind, id: itemId } = req.params;
    if (!mongoose.isObjectIdOrHexString(itemId) || !['tasks', 'feedback'].includes(kind)) {
      return res.status(400).json({ msg: 'Invalid item.' });
    }

    try {
      const item = await (kind === 'tasks' ? Task : Feedback).findByIdAndDelete(itemId);
      if (!item) return res.status(404).json({ msg: 'This item has already been removed.' });
      if (kind === 'feedback' && /^\/uploads\/[\w.-]+$/.test(item.mediaUrl || '')) {
        const filename = path.basename(item.mediaUrl);
        if (filename !== '.' && filename !== '..') {
          await fs.unlink(path.join(uploads, filename)).catch(error => {
            if (error.code !== 'ENOENT') console.error('Feedback attachment cleanup failed:', error.code);
          });
        }
      }
      res.sendStatus(204);
    } catch (error) { next(error); }
  });

  return router;
};
