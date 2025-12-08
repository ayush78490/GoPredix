'use client';

import React, { createContext, useContext, useMemo, useEffect } from 'react';
import { GoPredixClient, GoPredixConfig } from '@gopredix/core';
import { useWalletClient, usePublicClient } from 'wagmi';
import { walletClientToSigner } from '../utils/walletAdapter';

interface GoPredixContextValue {
    client: GoPredixClient;
    isReady: boolean;
}

const GoPredixContext = createContext<GoPredixContextValue | null>(null);

interface GoPredixProviderProps {
    children: React.ReactNode;
    config: Omit<GoPredixConfig, 'provider' | 'signer'>;
}

/**
 * GoPredix Provider Component
 * 
 * Wrap your app with this provider to use GoPredix hooks
 * 
 * @example
 * ```tsx
 * <GoPredixProvider config={{ network: 'testnet' }}>
 *   <App />
 * </GoPredixProvider>
 * ```
 */
export function GoPredixProvider({ children, config }: GoPredixProviderProps) {
    const publicClient = usePublicClient();
    const { data: walletClient } = useWalletClient();

    const { client, isReady } = useMemo(() => {
        const gopredix = new GoPredixClient({
            ...config,
            provider: publicClient as any,
        });

        return {
            client: gopredix,
            isReady: !!publicClient,
        };
    }, [config, publicClient]);

    // Update signer when wallet changes
    useEffect(() => {
        if (walletClient && client) {
            const signer = walletClientToSigner(walletClient);
            client.setSigner(signer as any).catch(console.error);
        }
    }, [walletClient, client]);

    return (
        <GoPredixContext.Provider value={{ client, isReady }}>
            {children}
        </GoPredixContext.Provider>
    );
}

/**
 * Hook to access GoPredix client
 * 
 * @example
 * ```tsx
 * const client = useGoPredix();
 * const markets = await client.markets.getAllMarkets();
 * ```
 */
export function useGoPredix(): GoPredixClient {
    const context = useContext(GoPredixContext);
    if (!context) {
        throw new Error('useGoPredix must be used within GoPredixProvider');
    }
    return context.client;
}

/**
 * Hook to check if SDK is ready
 */
export function useGoPredixReady(): boolean {
    const context = useContext(GoPredixContext);
    if (!context) {
        throw new Error('useGoPredixReady must be used within GoPredixProvider');
    }
    return context.isReady;
}
