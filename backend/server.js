const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    credentials: true,
  },
});

app.set('io', io);

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));

// Regular restaurant routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/menu', require('./routes/menu'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/tables', require('./routes/tables'));
app.use('/api/restaurant', require('./routes/restaurant'));

// Super admin panel — completely separate auth, separate JWT secret
// Non-obvious URL prefix for security through obscurity (in addition to real auth)
app.use('/api/sx-control/auth', require('./routes/superAuth'));
app.use('/api/sx-control', require('./routes/superAdmin'));

// Public feedback route
app.use('/api/feedback', require('./routes/feedback'));

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok', timestamp: new Date() }));

// Socket.io handler
require('./socket/handler')(io);

// MongoDB connection + server start
const PORT = process.env.PORT || 5000;

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/smartqr')
  .then(() => {
    console.log('✅ MongoDB connected');
    if (!process.env.SUPER_ADMIN_JWT_SECRET) {
      console.warn('⚠️  SUPER_ADMIN_JWT_SECRET not set — super admin panel is disabled');
    }
    server.listen(PORT, () => {
      console.log(`🚀 SmartQR server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('❌ MongoDB connection failed:', err.message);
    process.exit(1);
  });
