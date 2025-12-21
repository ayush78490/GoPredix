"use client"

import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useDisputes } from '@/hooks/useDisputes'
import { DollarSign, Award, Loader2 } from 'lucide-react'
import { toast } from 'react-hot-toast'

interface ClaimableMarketsProps {
    positions: Array<{
        marketId: number
        question: string
        status: string
        marketStatus: number
    }>
}

export function ClaimableMarkets({ positions }: ClaimableMarketsProps) {
    const { getMarketDispute, getUserVoteInfo, claimStake, calculateWinnings, isLoading } = useDisputes()
    const [claimableDisputes, setClaimableDisputes] = useState<Array<{
        marketId: number
        question: string
        disputeId: number
        potentialWinnings: string
        isWinning: boolean
    }>>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        checkClaimableDisputes()
    }, [positions])

    const checkClaimableDisputes = async () => {
        setLoading(true)
        const claimable = []

        for (const position of positions) {
            // Check resolved markets (status 3)
            if (position.marketStatus === 3) {
                const dispute = await getMarketDispute(position.marketId)

                if (dispute) {
                    const voteInfo = await getUserVoteInfo(dispute.disputeId)

                    // Check if user voted and hasn't claimed
                    if (voteInfo?.hasVoted && !voteInfo.claimed) {
                        // Check if dispute is resolved
                        if (dispute.status === 3 || dispute.status === 4) {
                            const winnings = await calculateWinnings(dispute.disputeId)

                            if (winnings) {
                                claimable.push({
                                    marketId: position.marketId,
                                    question: position.question,
                                    disputeId: dispute.disputeId,
                                    potentialWinnings: winnings.potentialWinnings,
                                    isWinning: winnings.isWinning
                                })
                            }
                        }
                    }
                }
            }
        }

        setClaimableDisputes(claimable)
        setLoading(false)
    }

    const handleClaim = async (disputeId: number, question: string) => {
        try {
            await claimStake(disputeId)
            toast.success('Stake claimed successfully!')

            // Remove from claimable list
            setClaimableDisputes(prev => prev.filter(d => d.disputeId !== disputeId))
        } catch (error: any) {
            toast.error(error.message || 'Failed to claim stake')
        }
    }

    if (loading) {
        return (
            <Card className="p-6">
                <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
            </Card>
        )
    }

    if (claimableDisputes.length === 0) {
        return null
    }

    return (
        <Card className="p-6 bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-green-500/30">
            <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-green-500/20 rounded-lg">
                    <DollarSign className="w-6 h-6 text-green-400" />
                </div>
                <div>
                    <h3 className="text-lg font-bold text-white">Claimable Rewards</h3>
                    <p className="text-sm text-muted-foreground">You have {claimableDisputes.length} dispute{claimableDisputes.length !== 1 ? 's' : ''} to claim</p>
                </div>
            </div>

            <div className="space-y-3">
                {claimableDisputes.map((dispute) => (
                    <div
                        key={dispute.disputeId}
                        className="bg-background/50 rounded-lg p-4 flex items-start justify-between gap-4"
                    >
                        <div className="flex-1">
                            <p className="font-medium text-foreground text-sm line-clamp-2 mb-2">
                                {dispute.question}
                            </p>

                            {dispute.isWinning ? (
                                <div className="flex items-center gap-2">
                                    <Award className="w-4 h-4 text-green-500" />
                                    <span className="text-sm text-green-500 font-medium">
                                        Won {dispute.potentialWinnings} BNB
                                    </span>
                                </div>
                            ) : (
                                <div className="flex items-center gap-2">
                                    <span className="text-sm text-red-500 font-medium">
                                        Lost - No rewards
                                    </span>
                                </div>
                            )}
                        </div>

                        <Button
                            onClick={() => handleClaim(dispute.disputeId, dispute.question)}
                            disabled={isLoading}
                            size="sm"
                            className={dispute.isWinning ? 'bg-green-500 hover:bg-green-600' : 'bg-muted hover:bg-muted/80'}
                        >
                            {isLoading ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                'Claim'
                            )}
                        </Button>
                    </div>
                ))}
            </div>
        </Card>
    )
}
