require('dotenv').config();
const express = require('express');
const http = require('http');
const mongoose = require('mongoose');
const cors = require('cors');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static('uploads'));

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connection established successfully'))
  .catch(err => console.error('MongoDB connection error:', err));

// Routes Placeholder
app.use('/api/auth', require('./routes/auth')); // Switched to Node.js auth
app.use('/api/feedback', require('./routes/feedback'));
app.use('/api/tasks', require('./routes/tasks'));

// Socket.io for Real-time location tracking
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Join a task-specific room for tracking
  socket.on('joinTaskRoom', (taskId) => {
    socket.join(`task_${taskId}`);
    console.log(`Socket ${socket.id} joined room task_${taskId}`);
  });

  // Receive location update and broadcast to the room
  socket.on('sendLocation', (data) => {
    const { taskId, location } = data;
    socket.to(`task_${taskId}`).emit('receiveLocation', location);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
