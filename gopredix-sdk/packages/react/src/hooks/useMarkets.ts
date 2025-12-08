'use client';

import { useState, useEffect } from 'react';
import { useGoPredix } from '../providers/GoPredixProvider';
import { Market, MarketStatus } from '@gopredix/core';

/**
 * Hook to fetch all markets
 * 
 * @param token - 'BNB' or 'PDX'
 * @param filters - Optional filters
 * @returns Markets array, loading state, and error
 * 
 * @example
 * ```tsx
 * const { markets, loading, error, refetch } = useMarkets('BNB');
 * ```
 */
export function useMarkets(
    token: 'BNB' | 'PDX' = 'BNB',
    filters?: { status?: MarketStatus; category?: string }
) {
    const client = useGoPredix();
    const [markets, setMarkets] = useState<Market[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    const fetchMarkets = async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await client.markets.getAllMarkets(token, filters);
            setMarkets(data);
        } catch (err) {
            setError(err as Error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMarkets();
    }, [client, token, filters?.status, filters?.category]);

    return { markets, loading, error, refetch: fetchMarkets };
}

/**
 * Hook to fetch a single market
 * 
 * @param id - Market ID
 * @param token - 'BNB' or 'PDX'
 * @returns Market object, loading state, and error
 * 
 * @example
 * ```tsx
 * const { market, loading } = useMarket(0, 'BNB');
 * ```
 */
export function useMarket(id: number, token: 'BNB' | 'PDX' = 'BNB') {
    const client = useGoPredix();
    const [market, setMarket] = useState<Market | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    const fetchMarket = async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await client.markets.getMarket(id, token);
            setMarket(data);
        } catch (err) {
            setError(err as Error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMarket();
    }, [client, id, token]);

    return { market, loading, error, refetch: fetchMarket };
}

/**
 * Hook to get active markets only
 */
export function useActiveMarkets(token: 'BNB' | 'PDX' = 'BNB') {
    return useMarkets(token, { status: MarketStatus.Open });
}

/**
 * Hook to get markets by category
 */
export function useMarketsByCategory(category: string, token: 'BNB' | 'PDX' = 'BNB') {
    return useMarkets(token, { category });
}
