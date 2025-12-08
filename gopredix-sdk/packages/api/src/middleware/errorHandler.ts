import { Request, Response, NextFunction } from 'express';

export function errorHandler(
    error: Error,
    req: Request,
    res: Response,
    next: NextFunction
) {
    console.error('API Error:', error);

    res.status(500).json({
        success: false,
        error: error.message || 'Internal server error',
    });
}
