const express = require('express');
const routes = require('./routes/routes');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`Webhook URL: http://localhost:${PORT}/api/webhook`);
    console.log(`Send message URL: http://localhost:${PORT}/api/send-message`);
});