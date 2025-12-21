"use client"

import { useEffect, useState } from 'react'
import { useDisputes, DisputeInfo, DisputeStatus, DisputeOutcome } from '@/hooks/useDisputes'
import { Button } from '@/components/ui/button'
import { VoteModal } from './VoteModal'
import { Clock, Users, TrendingUp, Award } from 'lucide-react'
import { toast } from 'react-hot-toast'

interface DisputeDetailsProps {
    marketId: number
    marketQuestion: string
}

export function DisputeDetails({ marketId, marketQuestion }: DisputeDetailsProps) {
    const { getMarketDispute, getUserVoteInfo, claimStake, isLoading, calculateWinnings } = useDisputes()
    const [dispute, setDispute] = useState<DisputeInfo | null>(null)
    const [voteInfo, setVoteInfo] = useState<any>(null)
    const [showVoteModal, setShowVoteModal] = useState(false)
    const [winnings, setWinnings] = useState<any>(null)

    useEffect(() => {
        loadDisputeData()
    }, [marketId])

    const loadDisputeData = async () => {
        const disputeData = await getMarketDispute(marketId)
        setDispute(disputeData)

        if (disputeData) {
            const vote = await getUserVoteInfo(disputeData.disputeId)
            setVoteInfo(vote)

            const potentialWinnings = await calculateWinnings(disputeData.disputeId)
            setWinnings(potentialWinnings)
        }
    }

    const handleClaim = async () => {
        if (!dispute) return

        try {
            await claimStake(dispute.disputeId)
            toast.success('Stake claimed successfully!')
            await loadDisputeData()
        } catch (error: any) {
            toast.error(error.message || 'Failed to claim stake')
        }
    }

    if (!dispute) return null

    const formatTimeRemaining = (seconds: number) => {
        if (seconds <= 0) return 'Ended'

        const days = Math.floor(seconds / 86400)
        const hours = Math.floor((seconds % 86400) / 3600)
        const minutes = Math.floor((seconds % 3600) / 60)

        if (days > 0) return `${days}d ${hours}h remaining`
        if (hours > 0) return `${hours}h ${minutes}m remaining`
        return `${minutes}m remaining`
    }

    const getStatusBadge = () => {
        switch (dispute.status) {
            case DisputeStatus.Active:
                return <span className="px-3 py-1 bg-yellow-500/20 text-yellow-400 rounded-full text-sm font-medium">Active</span>
            case DisputeStatus.VotingInProgress:
                return <span className="px-3 py-1 bg-blue-500/20 text-blue-400 rounded-full text-sm font-medium">Voting</span>
            case DisputeStatus.Resolved:
                return <span className="px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-sm font-medium">Resolved</span>
            case DisputeStatus.Rejected:
                return <span className="px-3 py-1 bg-red-500/20 text-red-400 rounded-full text-sm font-medium">Rejected</span>
        }
    }

    const canVote = dispute.status === DisputeStatus.Active && !voteInfo?.hasVoted
    const canClaim = (dispute.status === DisputeStatus.Resolved || dispute.status === DisputeStatus.Rejected) &&
        voteInfo?.hasVoted && !voteInfo?.claimed

    return (
        <div className="bg-card border border-border rounded-xl p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <h3 className="text-xl font-bold text-foreground">Dispute Details</h3>
                    {getStatusBadge()}
                </div>
                {dispute.timeRemaining > 0 && (
                    <div className="flex items-center gap-2 text-muted-foreground text-sm">
                        <Clock className="w-4 h-4" />
                        <span>{formatTimeRemaining(dispute.timeRemaining)}</span>
                    </div>
                )}
            </div>

            {/* Dispute Reason */}
            <div className="bg-muted/50 rounded-lg p-4">
                <p className="text-sm text-muted-foreground mb-2">Dispute Reason:</p>
                <p className="text-foreground italic">"{dispute.reason}"</p>
                <p className="text-xs text-muted-foreground mt-3">
                    Disputer: {dispute.disputer.slice(0, 6)}...{dispute.disputer.slice(-4)} •
                    Stake: {dispute.disputeStake} BNB
                </p>
            </div>

            {/* Voting Stats */}
            <div className="grid grid-cols-2 gap-4">
                <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                        <TrendingUp className="w-4 h-4 text-green-500" />
                        <span className="text-sm text-green-400">ACCEPT</span>
                    </div>
                    <p className="text-2xl font-bold text-green-500">{dispute.totalAcceptStake} BNB</p>
                    <p className="text-sm text-green-400/70 mt-1">{dispute.acceptVotePercentage.toFixed(1)}% of total</p>
                </div>

                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                        <Users className="w-4 h-4 text-red-500" />
                        <span className="text-sm text-red-400">REJECT</span>
                    </div>
                    <p className="text-2xl font-bold text-red-500">{dispute.totalRejectStake} BNB</p>
                    <p className="text-sm text-red-400/70 mt-1">{dispute.rejectVotePercentage.toFixed(1)}% of total</p>
                </div>
            </div>

            {/* Progress Bar */}
            <div className="space-y-2">
                <div className="flex justify-between text-sm text-muted-foreground">
                    <span>ACCEPT</span>
                    <span>REJECT</span>
                </div>
                <div className="h-3 bg-background rounded-full overflow-hidden flex">
                    <div
                        className="bg-green-500 transition-all duration-300"
                        style={{ width: `${dispute.acceptVotePercentage}%` }}
                    />
                    <div
                        className="bg-red-500 transition-all duration-300"
                        style={{ width: `${dispute.rejectVotePercentage}%` }}
                    />
                </div>
            </div>

            {/* Your Vote Status */}
            {voteInfo?.hasVoted && (
                <div className="bg-primary/10 border border-primary/30 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                        <Award className="w-4 h-4 text-primary" />
                        <span className="text-sm font-medium text-primary">Your Vote</span>
                    </div>
                    <div className="space-y-1 text-sm">
                        <p className="text-foreground">
                            Voted: <span className={voteInfo.vote ? 'text-green-500' : 'text-red-500'}>
                                {voteInfo.vote ? 'ACCEPT' : 'REJECT'}
                            </span>
                        </p>
                        <p className="text-muted-foreground">
                            Stake: {voteInfo.stake} BNB
                        </p>
                        {winnings && (
                            <p className={winnings.isWinning ? 'text-green-500' : 'text-red-500'}>
                                Status: {winnings.isWinning ? `✅ Winning (${winnings.potentialWinnings} BNB)` : '❌ Losing'}
                            </p>
                        )}
                    </div>
                </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3">
                {canVote && (
                    <Button
                        onClick={() => setShowVoteModal(true)}
                        className="flex-1 bg-primary hover:bg-primary/90"
                    >
                        Vote on Dispute
                    </Button>
                )}

                {canClaim && (
                    <Button
                        onClick={handleClaim}
                        disabled={isLoading}
                        className="flex-1 bg-green-500 hover:bg-green-600"
                    >
                        {isLoading ? 'Claiming...' : 'Claim Stake'}
                    </Button>
                )}

                {!canVote && !canClaim && voteInfo?.claimed && (
                    <div className="flex-1 text-center py-3 text-sm text-muted-foreground">
                        ✅ Stake already claimed
                    </div>
                )}
            </div>

            {/* Vote Modal */}
            {showVoteModal && (
                <VoteModal
                    disputeId={dispute.disputeId}
                    marketQuestion={marketQuestion}
                    disputeReason={dispute.reason}
                    acceptStake={dispute.totalAcceptStake}
                    rejectStake={dispute.totalRejectStake}
                    onClose={() => setShowVoteModal(false)}
                    onSuccess={loadDisputeData}
                />
            )}
        </div>
    )
}
