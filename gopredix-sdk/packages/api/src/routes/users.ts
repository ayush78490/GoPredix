import { Router } from 'express';
import { UserService } from '../services/UserService.js';

const router = Router();
const userService = new UserService();

/**
 * GET /api/users/:address/positions
 * Get user positions
 */
router.get('/:address/positions', async (req, res, next) => {
    try {
        const { address } = req.params;
        const { token = 'BNB' } = req.query;

        const positions = await userService.getUserPositions(
            address,
            token as 'BNB' | 'PDX'
        );

        res.json({
            success: true,
            data: positions,
            count: positions.length,
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/users/:address/stats
 * Get user statistics
 */
router.get('/:address/stats', async (req, res, next) => {
    try {
        const { address } = req.params;
        const { token = 'BNB' } = req.query;

        const stats = await userService.getUserStats(
            address,
            token as 'BNB' | 'PDX'
        );

        res.json({
            success: true,
            data: stats,
        });
    } catch (error) {
        next(error);
    }
});

export { router as usersRouter };
