'use client';

import React from 'react';
import { formatEther } from 'viem';
import { Trophy, TrendingUp, TrendingDown, Clock, Sparkles, CheckCircle2, XCircle } from 'lucide-react';
import { useClaimWinnings, MarketStatus, Outcome } from '@/hooks/useClaimWinnings';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { motion } from 'framer-motion';

interface ClaimWinningsCardProps {
    marketId: number;
    contractAddress: `0x${string}`;
    marketQuestion: string;
    marketEndTime?: number;
}

export function ClaimWinningsCard({
    marketId,
    contractAddress,
    marketQuestion,
    marketEndTime
}: ClaimWinningsCardProps) {
    const {
        claimableInfo,
        claimWinnings,
        isLoading,
        isSuccess
    } = useClaimWinnings(marketId, contractAddress);

    // Don't show card if market is not resolved or user has no position
    if (!isLoading && (!claimableInfo || claimableInfo.status !== MarketStatus.Resolved)) {
        return null;
    }

    // Don't show if user has no claimable amount
    if (!isLoading && !claimableInfo?.canClaim) {
        return null;
    }

    if (isLoading) {
        return <ClaimWinningsCardSkeleton />;
    }

    // Type guard: ensure claimableInfo is not null
    if (!claimableInfo) {
        return null;
    }

    const outcomeLabel = claimableInfo.outcome === Outcome.Yes ? 'YES' : 'NO';
    const outcomeColor = claimableInfo.outcome === Outcome.Yes
        ? 'bg-gradient-to-r from-green-500 to-emerald-600'
        : 'bg-gradient-to-r from-red-500 to-rose-600';

    const claimableAmountEth = parseFloat(formatEther(claimableInfo.claimableAmount));
    const confidencePercent = Number(claimableInfo.resolutionConfidence);

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
        >
            <Card className="overflow-hidden border-2 border-yellow-500/50 bg-gradient-to-br from-yellow-50 via-white to-amber-50 dark:from-yellow-950/20 dark:via-gray-900 dark:to-amber-950/20 shadow-2xl">
                {/* Sparkle Effect Header */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-yellow-400 via-amber-500 to-yellow-600 animate-pulse" />

                <CardHeader className="pb-4 space-y-3">
                    <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-3 rounded-xl bg-gradient-to-br from-yellow-400 to-amber-500 shadow-lg animate-pulse">
                                <Trophy className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <CardTitle className="text-2xl font-bold bg-gradient-to-r from-yellow-600 to-amber-600 bg-clip-text text-transparent">
                                    You Won!
                                </CardTitle>
                                <CardDescription className="text-sm mt-1">
                                    Congratulations! Claim your winnings now
                                </CardDescription>
                            </div>
                        </div>
                        <Badge className={`${outcomeColor} text-white font-bold px-4 py-1 shadow-lg`}>
                            {outcomeLabel}
                        </Badge>
                    </div>

                    {/* Market Question */}
                    <div className="bg-white/50 dark:bg-gray-800/50 rounded-lg p-3 border border-yellow-200 dark:border-yellow-800">
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300 line-clamp-2">
                            {marketQuestion}
                        </p>
                    </div>
                </CardHeader>

                <CardContent className="space-y-6 pb-6">
                    {/* Claimable Amount - Big Display */}
                    <div className="text-center py-8 bg-gradient-to-br from-yellow-100 to-amber-100 dark:from-yellow-900/30 dark:to-amber-900/30 rounded-2xl border-2 border-yellow-300 dark:border-yellow-700 shadow-inner relative overflow-hidden">
                        {/* Animated Background */}
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-yellow-200/30 to-transparent animate-shimmer" />

                        <div className="relative z-10">
                            <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2 flex items-center justify-center gap-2">
                                <Sparkles className="w-4 h-4 text-yellow-600" />
                                Your Winnings
                                <Sparkles className="w-4 h-4 text-yellow-600" />
                            </p>
                            <div className="flex items-baseline justify-center gap-2">
                                <span className="text-5xl font-black bg-gradient-to-r from-yellow-600 via-amber-600 to-yellow-700 bg-clip-text text-transparent">
                                    {claimableAmountEth.toFixed(4)}
                                </span>
                                <span className="text-2xl font-bold text-gray-600 dark:text-gray-400">
                                    BNB
                                </span>
                            </div>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                                ≈ ${(claimableAmountEth * 600).toFixed(2)} USD
                            </p>
                        </div>
                    </div>

                    {/* Resolution Details */}
                    <div className="grid grid-cols-1 gap-4">
                        {/* Outcome Icon */}
                        <div className="flex items-center gap-3 p-4 bg-white/50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700">
                            <div className={`p-2 rounded-lg ${outcomeColor}`}>
                                {claimableInfo.outcome === Outcome.Yes ? (
                                    <TrendingUp className="w-5 h-5 text-white" />
                                ) : (
                                    <TrendingDown className="w-5 h-5 text-white" />
                                )}
                            </div>
                            <div className="flex-1">
                                <p className="text-xs text-gray-500 dark:text-gray-400">Market Result</p>
                                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                                    Resolved to {outcomeLabel}
                                </p>
                            </div>
                        </div>

                        {/* Confidence Level */}
                        <div className="space-y-2 p-4 bg-white/50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700">
                            <div className="flex items-center justify-between">
                                <p className="text-xs text-gray-500 dark:text-gray-400">AI Confidence</p>
                                <p className="text-sm font-bold text-gray-900 dark:text-gray-100">
                                    {confidencePercent}%
                                </p>
                            </div>
                            <Progress value={confidencePercent} className="h-2" />
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                {confidencePercent >= 90 ? 'Very High Confidence' :
                                    confidencePercent >= 70 ? 'High Confidence' :
                                        'Moderate Confidence'}
                            </p>
                        </div>

                        {/* Resolution Reason */}
                        {claimableInfo.resolutionReason && (
                            <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-xl border border-blue-200 dark:border-blue-800">
                                <p className="text-xs font-medium text-blue-600 dark:text-blue-400 mb-1">
                                    Resolution Reason
                                </p>
                                <p className="text-sm text-gray-700 dark:text-gray-300">
                                    {claimableInfo.resolutionReason}
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Token Balances */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="p-3 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
                            <p className="text-xs text-green-600 dark:text-green-400 mb-1 flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" />
                                Winning Tokens
                            </p>
                            <p className="text-lg font-bold text-green-700 dark:text-green-300">
                                {parseFloat(formatEther(claimableInfo.winningTokenBalance)).toFixed(4)}
                            </p>
                        </div>
                        <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1 flex items-center gap-1">
                                <XCircle className="w-3 h-3" />
                                Losing Tokens
                            </p>
                            <p className="text-lg font-bold text-gray-600 dark:text-gray-400">
                                {parseFloat(formatEther(claimableInfo.losingTokenBalance)).toFixed(4)}
                            </p>
                        </div>
                    </div>
                </CardContent>

                <CardFooter className="flex flex-col gap-3 pt-6 border-t border-yellow-200 dark:border-yellow-800 bg-gradient-to-b from-transparent to-yellow-50/50 dark:to-yellow-950/20">
                    <Button
                        onClick={claimWinnings}
                        disabled={isLoading || isSuccess || !claimableInfo?.canClaim}
                        className="w-full h-14 text-lg font-bold bg-gradient-to-r from-yellow-500 via-amber-500 to-yellow-600 hover:from-yellow-600 hover:via-amber-600 hover:to-yellow-700 text-white shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isLoading ? (
                            <span className="flex items-center gap-2">
                                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                Processing...
                            </span>
                        ) : isSuccess ? (
                            <span className="flex items-center gap-2">
                                <CheckCircle2 className="w-5 h-5" />
                                Claimed Successfully!
                            </span>
                        ) : (
                            <span className="flex items-center gap-2">
                                <Trophy className="w-5 h-5" />
                                Claim {claimableAmountEth.toFixed(4)} BNB
                            </span>
                        )}
                    </Button>

                    {isSuccess && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="flex items-center justify-center gap-2 text-sm text-green-600 dark:text-green-400 font-medium"
                        >
                            <CheckCircle2 className="w-4 h-4" />
                            Your BNB has been sent to your wallet!
                        </motion.div>
                    )}

                    <p className="text-xs text-center text-gray-500 dark:text-gray-400">
                        Claiming will burn your winning tokens and transfer BNB to your wallet
                    </p>
                </CardFooter>
            </Card>
        </motion.div>
    );
}

// Skeleton Loader
function ClaimWinningsCardSkeleton() {
    return (
        <Card className="overflow-hidden border-2 border-yellow-500/50">
            <CardHeader className="pb-4 space-y-3">
                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                        <Skeleton className="w-12 h-12 rounded-xl" />
                        <div>
                            <Skeleton className="w-32 h-6 mb-2" />
                            <Skeleton className="w-48 h-4" />
                        </div>
                    </div>
                    <Skeleton className="w-16 h-8 rounded-full" />
                </div>
                <Skeleton className="w-full h-16 rounded-lg" />
            </CardHeader>
            <CardContent className="space-y-6 pb-6">
                <Skeleton className="w-full h-32 rounded-2xl" />
                <div className="space-y-4">
                    <Skeleton className="w-full h-20 rounded-xl" />
                    <Skeleton className="w-full h-20 rounded-xl" />
                </div>
            </CardContent>
            <CardFooter>
                <Skeleton className="w-full h-14 rounded-lg" />
            </CardFooter>
        </Card>
    );
}

// Shimmer animation for background
const styles = `
  @keyframes shimmer {
    0% {
      transform: translateX(-100%);
    }
    100% {
      transform: translateX(100%);
    }
  }
  
  .animate-shimmer {
    animation: shimmer 3s infinite;
  }
`;

// Inject styles
if (typeof document !== 'undefined') {
    const styleSheet = document.createElement('style');
    styleSheet.textContent = styles;
    document.head.appendChild(styleSheet);
}
