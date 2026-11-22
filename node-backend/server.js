require('dotenv').config({ path: require('node:path').join(__dirname, '.env'), quiet: true });
const express = require('express');
const http = require('node:http');
const path = require('node:path');
const fs = require('node:fs');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const { Server } = require('socket.io');
const Task = require('./models/Task');
const User = require('./models/User');
const { prepareUserIndexes } = require('./identity');

const app = express();
const server = http.createServer(app);
const io = new Server(server);
app.set('sockets', io);
const uploads = path.resolve(process.env.UPLOAD_DIR || path.join(__dirname, 'uploads'));

app.use(express.json());
app.get('/uploads/:filename', require('./feedbackMedia').serve);
app.use('/uploads', express.static(uploads, {
  index: false,
  setHeaders: (res) => res.setHeader('X-Content-Type-Options', 'nosniff')
}));
app.get('/api/health', (_req, res) => {
  const ready = mongoose.connection.readyState === 1;
  res.status(ready ? 200 : 503).json({ status: ready ? 'ok' : 'database unavailable' });
});
app.use('/api/auth', require('./routes/auth'));
app.use('/api/feedback', require('./routes/feedback')(uploads));
app.use('/api/tasks', require('./routes/tasks'));
app.use('/api/admin', require('./routes/admin')(uploads));
app.use(['/api', '/uploads'], (_req, res) => res.status(404).json({ msg: 'Not found' }));

const dist = path.join(__dirname, '../frontend/dist');
if (fs.existsSync(path.join(dist, 'index.html'))) {
  app.use(express.static(dist));
  app.get('/{*route}', (_req, res) => res.sendFile(path.join(dist, 'index.html')));
}

io.use(async (socket, next) => {
  try {
    socket.data.userId = jwt.verify(socket.handshake.auth.token, process.env.JWT_SECRET).user.id;
    if (!await User.exists({ _id: socket.data.userId })) throw new Error('Account not found');
    next();
  } catch {
    next(new Error('Sign in to track a task'));
  }
});

io.on('connection', (socket) => {
  socket.join(`account:${socket.data.userId}`);
  socket.on('joinTaskRoom', async (taskId, acknowledge) => {
    if (typeof acknowledge !== 'function') return;
    try {
      const task = mongoose.isValidObjectId(taskId) && await Task.findById(taskId);
      const { userId } = socket.data;
      if (!task?.worker || task.status === 'Completed' ||
          ![String(task.requester), String(task.worker)].includes(userId)) {
        return acknowledge({ error: 'Tracking is available to assigned task participants.' });
      }
      await socket.join(`task_${taskId}`);
      acknowledge({ ok: true });
    } catch {
      acknowledge({ error: 'Unable to connect to tracking.' });
    }
  });

  socket.on('sendLocation', async (data) => {
    const { taskId, location } = data || {};
    const { lat, lng } = location || {};
    if (!socket.rooms.has(`task_${taskId}`) || !Number.isFinite(lat) || !Number.isFinite(lng) ||
        Math.abs(lat) > 90 || Math.abs(lng) > 180) return;
    try {
      const task = await Task.exists({ _id: taskId, worker: socket.data.userId, status: 'In Progress' });
      if (task) socket.to(`task_${taskId}`).emit('receiveLocation', { lat, lng });
    } catch (err) {
      console.error('Unable to relay tracking update:', err.name);
    }
  });
});

async function start() {
  if (!process.env.MONGO_URI || (process.env.JWT_SECRET || '').length < 32) {
    throw new Error('Set MONGO_URI and a JWT_SECRET of at least 32 characters in node-backend/.env or the environment.');
  }
  fs.mkdirSync(uploads, { recursive: true });
  await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 8000 });
  await prepareUserIndexes();
  const port = Number(process.env.PORT || 5000);
  server.listen(port, process.env.HOST || '127.0.0.1', () => console.log(`Campus Connect listening on port ${port}`));
}

start().catch((err) => {
  console.error('Unable to start Campus Connect:', err.message);
  process.exit(1);
});
