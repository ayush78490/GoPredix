import { Router } from 'express';
import { MarketService } from '../services/MarketService.js';

const router = Router();
const marketService = new MarketService();

/**
 * GET /api/markets
 * Get all markets with optional filters
 */
router.get('/', async (req, res, next) => {
    try {
        const { token = 'BNB', status, category, limit, offset } = req.query;

        const markets = await marketService.getAllMarkets(
            token as 'BNB' | 'PDX',
            {
                status: status ? Number(status) : undefined,
                category: category as string | undefined,
            }
        );

        // Apply pagination
        const start = Number(offset) || 0;
        const end = limit ? start + Number(limit) : markets.length;
        const paginated = markets.slice(start, end);

        res.json({
            success: true,
            data: paginated,
            count: paginated.length,
            total: markets.length,
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/markets/:id
 * Get single market by ID
 */
router.get('/:id', async (req, res, next) => {
    try {
        const { id } = req.params;
        const { token = 'BNB' } = req.query;

        const market = await marketService.getMarket(
            Number(id),
            token as 'BNB' | 'PDX'
        );

        if (!market) {
            return res.status(404).json({
                success: false,
                error: 'Market not found',
            });
        }

        res.json({
            success: true,
            data: market,
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/markets/active
 * Get only active markets
 */
router.get('/status/active', async (req, res, next) => {
    try {
        const { token = 'BNB' } = req.query;

        const markets = await marketService.getActiveMarkets(token as 'BNB' | 'PDX');

        res.json({
            success: true,
            data: markets,
            count: markets.length,
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/markets/category/:category
 * Get markets by category
 */
router.get('/category/:category', async (req, res, next) => {
    try {
        const { category } = req.params;
        const { token = 'BNB' } = req.query;

        const markets = await marketService.getMarketsByCategory(
            category,
            token as 'BNB' | 'PDX'
        );

        res.json({
            success: true,
            data: markets,
            count: markets.length,
        });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /api/markets/validate
 * Validate market question
 */
router.post('/validate', async (req, res, next) => {
    try {
        const { question, endTime, initialYes, initialNo } = req.body;

        const validation = await marketService.validateMarket({
            question,
            endTime,
            initialYes,
            initialNo,
        });

        res.json(validation);
    } catch (error) {
        next(error);
    }
});

export { router as marketsRouter };
