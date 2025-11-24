require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();

// CORS configuration
const allowedOrigins = [
  'https://sigma-predection.vercel.app',
  'https://gopredix.vercel.app',
  'https://sigma-prediction.vercel.app',
  'https://www.gopredix.xyz',
  'http://localhost:3000',
  'http://localhost:3001'
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

app.use(express.json());

// Import the validator function
const validateMarket = require('./api/validate-market.js');

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    env: {
      hasOpenAIKey: !!process.env.OPEN_AI_API_KEY,
      nodeVersion: process.version
    }
  });
});

// Validation endpoint
app.post('/api/validate-market', async (req, res) => {
  try {
    await validateMarket(req, res);
  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({
      valid: false,
      reason: 'Internal server error',
      apiError: true,
      error: error.message
    });
  }
});

// Test endpoint
app.get('/test', (req, res) => {
  res.json({
    message: 'Test endpoint working',
    timestamp: new Date().toISOString()
  });
});

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log('🚀 Local Test Server Started');
  console.log(`📍 Server running on: http://localhost:${PORT}`);
  console.log(`🏥 Health check: http://localhost:${PORT}/health`);
  console.log(`🧪 Test endpoint: http://localhost:${PORT}/test`);
  console.log(`✅ Validation endpoint: POST http://localhost:${PORT}/api/validate-market`);
  console.log(`🔑 OpenAI API Key: ${process.env.OPEN_AI_API_KEY ? 'Found ✅' : 'Missing ❌'}`);
  console.log('\nReady to receive requests!\n');
});