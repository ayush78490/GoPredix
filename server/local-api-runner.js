const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(bodyParser.json());

// Mock Vercel Request/Response objects for compatibility
const createVercelHandler = (handler) => {
    return async (req, res) => {
        // Vercel functions expect req.body to be parsed
        // Express does this with body-parser, so we're good

        // Add helper methods if needed (Vercel adds some)
        // res.status shim removed as Express handles it natively

        try {
            await handler(req, res);
        } catch (error) {
            console.error('Handler error:', error);
            if (!res.headersSent) {
                res.status(500).json({ error: error.message });
            }
        }
    };
};

// Import handlers
const validateMarketHandler = require('./api/validateMarket');
const resolveMarketHandler = require('./api/resolveMarket');

// Routes
console.log('🔌 Mounting /api/validateMarket');
app.post('/api/validateMarket', createVercelHandler(validateMarketHandler));

console.log('🔌 Mounting /api/resolveMarket');
app.post('/api/resolveMarket', createVercelHandler(resolveMarketHandler));

// Start server
app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n🚀 Local API Server running at http://localhost:${PORT}`);
    console.log(`   - POST http://localhost:${PORT}/api/validateMarket`);
    console.log(`   - POST http://localhost:${PORT}/api/resolveMarket`);
    console.log('\nPress Ctrl+C to stop');
});
