require('dotenv').config({ quiet: true });

const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/auth');
const roadtripRoutes = require('./routes/roadtrips');
const stepRoutes = require('./routes/steps');
const activityRoutes = require('./routes/activities');
const accommodationRoutes = require('./routes/accommodations');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/roadtrips', roadtripRoutes);
app.use('/api/steps', stepRoutes);
app.use('/api/activities', activityRoutes);
app.use('/api/accommodations', accommodationRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`✓ Server running on http://localhost:${PORT}`);
  console.log(`  Health: http://localhost:${PORT}/health`);
});
