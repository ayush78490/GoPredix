'use client';

import React from 'react';
import { formatEther } from 'viem';
import { Trophy, Sparkles, Loader2 } from 'lucide-react';
import { useClaimWinnings, MarketStatus } from '@/hooks/useClaimWinnings';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';

interface ClaimWinningsBannerProps {
    marketId: number;
    contractAddress: `0x${string}`;
}

/**
 * Compact banner that appears at the top of market detail page
 * when user has claimable winnings
 */
export function ClaimWinningsBanner({ marketId, contractAddress }: ClaimWinningsBannerProps) {
    const { claimableInfo, claimWinnings, isLoading, isSuccess } = useClaimWinnings(marketId, contractAddress);

    // Don't show if not resolved or no claimable amount
    if (!claimableInfo ||
        claimableInfo.status !== MarketStatus.Resolved ||
        !claimableInfo.canClaim ||
        isSuccess) {
        return null;
    }

    const claimableAmountEth = parseFloat(formatEther(claimableInfo.claimableAmount));

    return (
        <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="w-full"
        >
            <div className="bg-gradient-to-r from-yellow-500 via-amber-500 to-yellow-600 rounded-xl p-0.5 shadow-2xl">
                <div className="bg-gradient-to-br from-yellow-50 to-amber-50 dark:from-yellow-950/90 dark:to-amber-950/90 rounded-[10px] p-4">
                    <div className="flex items-center justify-between gap-4 flex-wrap">
                        {/* Left: Trophy Icon + Message */}
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-gradient-to-br from-yellow-400 to-amber-500 rounded-lg shadow-lg animate-pulse">
                                <Trophy className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <h3 className="text-lg font-bold bg-gradient-to-r from-yellow-700 to-amber-700 bg-clip-text text-transparent">
                                        Congratulations, You Won!
                                    </h3>
                                </div>
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                    You have <span className="font-bold text-yellow-700 dark:text-yellow-500">{claimableAmountEth.toFixed(4)} BNB</span> waiting to be claimed
                                </p>
                            </div>
                        </div>

                        {/* Right: Claim Button */}
                        <Button
                            onClick={claimWinnings}
                            disabled={isLoading}
                            size="lg"
                            className="bg-gradient-to-r from-yellow-500 via-amber-500 to-yellow-600 hover:from-yellow-600 hover:via-amber-600 hover:to-yellow-700 text-white font-bold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
                        >
                            {isLoading ? (
                                <span className="flex items-center gap-2">
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    Claiming...
                                </span>
                            ) : (
                                <span className="flex items-center gap-2">
                                    <Trophy className="w-5 h-5" />
                                    Claim {claimableAmountEth.toFixed(4)} BNB
                                </span>
                            )}
                        </Button>
                    </div>
                </div>
            </div>
        </motion.div>
    );
}
