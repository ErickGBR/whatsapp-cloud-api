require('dotenv').config();
const express = require('express');
const rateLimit = require('express-rate-limit');
const routes = require('./routes/routes');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limiting — 100 requests per 15 minutes per IP
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Too many requests, please try again later.' },
});

app.use('/api/', limiter);

// Routes
app.use('/api', routes);

// Health check endpoint
app.get('/', (req, res) => {
  res.json({ status: 'OK', message: 'WhatsApp Cloud API Server is running' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal server error', message: err.message });
});

// Only listen when not in test mode (so supertest can bind its own port)
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`Webhook URL: http://localhost:${PORT}/api/webhook`);
    console.log(`Send message URL: http://localhost:${PORT}/api/send-message`);
  });
}

module.exports = app;
