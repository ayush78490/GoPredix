'use client';

import { GoPredixProvider, useMarkets, useTrading } from '@gopredix/react';
import { WagmiProvider } from 'wagmi';

export default function App() {
    return (
        <WagmiProvider config={wagmiConfig}>
            <GoPredixProvider config={{ network: 'testnet' }}>
                <MarketDashboard />
            </GoPredixProvider>
        </WagmiProvider>
    );
}

function MarketDashboard() {
    const { markets, loading } = useMarkets('BNB');
    const { buyYes, buyNo } = useTrading();

    if (loading) return <div>Loading markets...</div>;

    return (
        <div className="p-8">
            <h1 className="text-3xl font-bold mb-6">GoPredix Markets</h1>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {markets.map((market) => (
                    <div key={market.id} className="border rounded-lg p-4">
                        <h3 className="font-semibold mb-2">{market.question}</h3>

                        <div className="flex justify-between mb-4">
                            <div>
                                <span className="text-green-600">YES: {market.yesPrice}%</span>
                            </div>
                            <div>
                                <span className="text-red-600">NO: {market.noPrice}%</span>
                            </div>
                        </div>

                        <div className="flex gap-2">
                            <button
                                onClick={() => buyYes(market.id, '0.1', 'BNB')}
                                className="flex-1 bg-green-500 text-white py-2 rounded"
                            >
                                Buy YES
                            </button>
                            <button
                                onClick={() => buyNo(market.id, '0.1', 'BNB')}
                                className="flex-1 bg-red-500 text-white py-2 rounded"
                            >
                                Buy NO
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

// Wagmi config (simplified for example)
const wagmiConfig = {} as any;
