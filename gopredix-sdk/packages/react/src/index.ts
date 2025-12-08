// Export provider
export { GoPredixProvider, useGoPredix, useGoPredixReady } from './providers/GoPredixProvider';

// Export hooks
export { useMarkets, useMarket, useActiveMarkets, useMarketsByCategory } from './hooks/useMarkets';
export { useTrading } from './hooks/useTrading';
export { useUserPositions, useUserStats } from './hooks/useAccount';

// Re-export core types
export type * from '@gopredix/core';
