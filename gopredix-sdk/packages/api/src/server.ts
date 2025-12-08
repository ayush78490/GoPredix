import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { marketsRouter } from './routes/markets.js';
import { tradingRouter } from './routes/trading.js';
import { usersRouter } from './routes/users.js';
import { errorHandler } from './middleware/errorHandler.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', version: '1.0.0' });
});

// API Routes
app.use('/api/markets', marketsRouter);
app.use('/api/trading', tradingRouter);
app.use('/api/users', usersRouter);

// Error handling
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
    console.log(`🚀 GoPredix API Server running on port ${PORT}`);
    console.log(`📊 Health check: http://localhost:${PORT}/health`);
});

export default app;
