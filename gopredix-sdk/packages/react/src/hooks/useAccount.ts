'use client';

import { useState, useEffect } from 'react';
import { useGoPredix } from '../providers/GoPredixProvider';
import { Position } from '@gopredix/core';

/**
 * Hook to fetch user positions
 * 
 * @param userAddress - User wallet address
 * @param token - 'BNB' or 'PDX'
 * @returns User positions array
 * 
 * @example
 * ```tsx
 * const { positions, loading } = useUserPositions('0x...', 'BNB');
 * ```
 */
export function useUserPositions(
    userAddress: string | undefined,
    token: 'BNB' | 'PDX' = 'BNB'
) {
    const client = useGoPredix();
    const [positions, setPositions] = useState<Position[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        async function fetchPositions() {
            if (!userAddress) {
                setPositions([]);
                return;
            }

            try {
                setLoading(true);
                setError(null);
                const data = await client.trading.getUserPositions(userAddress, token);
                setPositions(data);
            } catch (err) {
                setError(err as Error);
            } finally {
                setLoading(false);
            }
        }

        fetchPositions();
    }, [client, userAddress, token]);

    return { positions, loading, error };
}

/**
 * Hook to fetch user statistics
 */
export function useUserStats(
    userAddress: string | undefined,
    token: 'BNB' | 'PDX' = 'BNB'
) {
    const client = useGoPredix();
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        async function fetchStats() {
            if (!userAddress) {
                setStats(null);
                return;
            }

            try {
                setLoading(true);
                setError(null);
                const data = await client.accounts.getUserStats(userAddress, token);
                setStats(data);
            } catch (err) {
                setError(err as Error);
            } finally {
                setLoading(false);
            }
        }

        fetchStats();
    }, [client, userAddress, token]);

    return { stats, loading, error };
}
