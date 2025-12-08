'use client';

import { useState } from 'react';
import { useGoPredix } from '../providers/GoPredixProvider';

/**
 * Hook for trading operations
 * 
 * @example
 * ```tsx
 * const { buyYes, buyNo, loading } = useTrading();
 * 
 * await buyYes(0, '0.1', 'BNB');
 * ```
 */
export function useTrading() {
    const client = useGoPredix();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    const buyYes = async (
        marketId: number,
        amount: string,
        token: 'BNB' | 'PDX' = 'BNB',
        minOut?: string
    ) => {
        try {
            setLoading(true);
            setError(null);
            const hash = await client.trading.buyYes(marketId, amount, token, minOut);
            return hash;
        } catch (err) {
            setError(err as Error);
            throw err;
        } finally {
            setLoading(false);
        }
    };

    const buyNo = async (
        marketId: number,
        amount: string,
        token: 'BNB' | 'PDX' = 'BNB',
        minOut?: string
    ) => {
        try {
            setLoading(true);
            setError(null);
            const hash = await client.trading.buyNo(marketId, amount, token, minOut);
            return hash;
        } catch (err) {
            setError(err as Error);
            throw err;
        } finally {
            setLoading(false);
        }
    };

    const sellYes = async (
        marketId: number,
        tokenAmount: string,
        token: 'BNB' | 'PDX' = 'BNB',
        minOut?: string
    ) => {
        try {
            setLoading(true);
            setError(null);
            const hash = await client.trading.sellYes(marketId, tokenAmount, token, minOut);
            return hash;
        } catch (err) {
            setError(err as Error);
            throw err;
        } finally {
            setLoading(false);
        }
    };

    const sellNo = async (
        marketId: number,
        tokenAmount: string,
        token: 'BNB' | 'PDX' = 'BNB',
        minOut?: string
    ) => {
        try {
            setLoading(true);
            setError(null);
            const hash = await client.trading.sellNo(marketId, tokenAmount, token, minOut);
            return hash;
        } catch (err) {
            setError(err as Error);
            throw err;
        } finally {
            setLoading(false);
        }
    };

    return {
        buyYes,
        buyNo,
        sellYes,
        sellNo,
        loading,
        error,
    };
}
