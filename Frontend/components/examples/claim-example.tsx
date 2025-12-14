'use client';

import React from 'react';
import { ClaimWinningsCard } from '@/components/claim-winnings-card';
import { ClaimWinningsBanner } from '@/components/claim-winnings-banner';

/**
 * Example page showing how to use the claim components
 * 
 * Usage in your market list or dashboard:
 * - Add ClaimWinningsCard for dedicated claim section
 * - Add ClaimWinningsBanner at top of market detail pages
 */

interface ExampleClaimPageProps {
    // Example: These would come from your market data
    markets?: Array<{
        id: number;
        question: string;
        endTime: number;
        contractAddress: `0x${string}`;
    }>;
}

export default function ExampleClaimPage({ markets }: ExampleClaimPageProps) {
    // Example contract addresses - replace with your actual addresses
    const BNB_CONTRACT = process.env.NEXT_PUBLIC_BNB_PREDICTION_MARKET as `0x${string}`;
    const PDX_CONTRACT = process.env.NEXT_PUBLIC_PDX_PREDICTION_MARKET as `0x${string}`;

    return (
        <div className="container mx-auto px-4 py-8 space-y-8">
            <div>
                <h1 className="text-3xl font-bold mb-2">My Winnings</h1>
                <p className="text-gray-600 dark:text-gray-400">
                    Claim your winnings from resolved markets
                </p>
            </div>

            {/* Example 1: Banner at top of market detail page */}
            <section>
                <h2 className="text-xl font-semibold mb-4">Banner Example (Market Detail Page)</h2>
                <ClaimWinningsBanner
                    marketId={0} // Replace with actual market ID
                    contractAddress={BNB_CONTRACT}
                />
            </section>

            {/* Example 2: Card in dashboard/list */}
            <section>
                <h2 className="text-xl font-semibold mb-4">Card Example (Dashboard)</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <ClaimWinningsCard
                        marketId={0} // Replace with actual market ID
                        contractAddress={BNB_CONTRACT}
                        marketQuestion="Will Bitcoin reach $100,000 by end of 2024?"
                        marketEndTime={Math.floor(Date.now() / 1000) - 86400}
                    />

                    <ClaimWinningsCard
                        marketId={1} // Replace with actual market ID
                        contractAddress={BNB_CONTRACT}
                        marketQuestion="Will Ethereum merge to Proof of Stake successfully?"
                        marketEndTime={Math.floor(Date.now() / 1000) - 172800}
                    />
                </div>
            </section>

            {/* Example 3: Integration with your existing market list */}
            <section>
                <h2 className="text-xl font-semibold mb-4">Integration Example</h2>
                <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-6">
                    <pre className="text-sm overflow-x-auto">
                        <code>{`
// In your market list component:
import { ClaimWinningsCard } from '@/components/claim-winnings-card';

{markets.map((market) => (
  <div key={market.id}>
    {/* Your existing market card */}
    <MarketCard market={market} />
    
    {/* Claim card will only show if user has claimable winnings */}
    <ClaimWinningsCard
      marketId={market.id}
      contractAddress={market.contractAddress}
      marketQuestion={market.question}
      marketEndTime={market.endTime}
    />
  </div>
))}

// Or use the banner at top of market detail page:
<ClaimWinningsBanner 
  marketId={marketId} 
  contractAddress={contractAddress} 
/>
            `}</code>
                    </pre>
                </div>
            </section>

            {/* Integration Guide */}
            <section className="bg-blue-50 dark:bg-blue-950/20 rounded-xl p-6 border border-blue-200 dark:border-blue-800">
                <h2 className="text-xl font-semibold mb-4 text-blue-900 dark:text-blue-100">
                    📚 Integration Guide
                </h2>
                <div className="space-y-4 text-sm text-blue-800 dark:text-blue-200">
                    <div>
                        <h3 className="font-semibold mb-2">1. Add to Dashboard:</h3>
                        <p>Use <code className="bg-blue-100 dark:bg-blue-900 px-2 py-1 rounded">ClaimWinningsCard</code> in your user dashboard to show all claimable markets.</p>
                    </div>
                    <div>
                        <h3 className="font-semibold mb-2">2. Add to Market Detail:</h3>
                        <p>Use <code className="bg-blue-100 dark:bg-blue-900 px-2 py-1 rounded">ClaimWinningsBanner</code> at the top of market detail pages.</p>
                    </div>
                    <div>
                        <h3 className="font-semibold mb-2">3. Auto-hide behavior:</h3>
                        <p>Both components automatically hide if:</p>
                        <ul className="list-disc list-inside ml-4 mt-1">
                            <li>Market is not resolved</li>
                            <li>User has no claimable tokens</li>
                            <li>Claim has been successfully submitted</li>
                        </ul>
                    </div>
                    <div>
                        <h3 className="font-semibold mb-2">4. Required props:</h3>
                        <ul className="list-disc list-inside ml-4 mt-1">
                            <li><code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">marketId</code>: The market ID</li>
                            <li><code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">contractAddress</code>: The prediction market contract address</li>
                            <li><code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">marketQuestion</code>: (Card only) Market question text</li>
                        </ul>
                    </div>
                </div>
            </section>
        </div>
    );
}
