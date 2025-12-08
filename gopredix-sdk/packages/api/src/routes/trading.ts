import { Router } from 'express';

const router = Router();

/**
 * GET /api/trading/multiplier
 * Calculate trade multiplier
 */
router.get('/multiplier', async (req, res, next) => {
    try {
        const { marketId, amount, isYes, token = 'BNB' } = req.query;

        // Would use GoPredixClient here
        // const multiplier = await tradingService.getMultiplier(...)

        res.json({
            success: true,
            data: {
                multiplier: 1.5,
                totalOut: '0.15',
                totalFee: '0.005',
            },
        });
    } catch (error) {
        next(error);
    }
});

export { router as tradingRouter };
