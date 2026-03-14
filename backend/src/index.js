require('dotenv').config({ quiet: true });

const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/auth');
const roadtripRoutes = require('./routes/roadtrips');
const memberRoutes = require('./routes/members');
const stepRoutes = require('./routes/steps');
const activityRoutes = require('./routes/activities');
const accommodationRoutes = require('./routes/accommodations');
const photoRoutes = require('./routes/photos');
const invitationRoutes = require('./routes/invitations');
const betaRoutes = require('./routes/beta');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Request logging
app.use((req, res, next) => {
  const start = Date.now();
  const isSync = ['PUT', 'PATCH', 'DELETE'].includes(req.method) &&
    /^\/(roadtrips|steps|activities|accommodations|photos)/.test(req.path.replace('/api/', ''));

  res.on('finish', () => {
    const ms = Date.now() - start;
    const tag = isSync ? '[SYNC]' : '[API] ';
    const status = res.statusCode;
    const color = status >= 500 ? '\x1b[31m' : status >= 400 ? '\x1b[33m' : '\x1b[32m';
    console.log(`${color}${tag}\x1b[0m ${req.method} ${req.path} → ${status} (${ms}ms)`);
  });
  next();
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/roadtrips', memberRoutes);
app.use('/api/roadtrips', roadtripRoutes);
app.use('/api/steps', stepRoutes);
app.use('/api/activities', activityRoutes);
app.use('/api/accommodations', accommodationRoutes);
app.use('/api/photos', photoRoutes);
app.use('/api/invitations', invitationRoutes);
app.use('/api/beta', betaRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`✓ Server running on http://0.0.0.0:${PORT}`);
  console.log(`  Health: http://localhost:${PORT}/health`);
});
