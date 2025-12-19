"use client"

import { useState } from 'react'
import { useDisputes } from '@/hooks/useDisputes'
import { Button } from '@/components/ui/button'
import { X, ThumbsUp, ThumbsDown, AlertTriangle } from 'lucide-react'
import { toast } from 'react-hot-toast'

interface VoteModalProps {
    disputeId: number
    marketQuestion: string
    disputeReason: string
    acceptStake: string
    rejectStake: string
    onClose: () => void
    onSuccess: () => void
}

export function VoteModal({
    disputeId,
    marketQuestion,
    disputeReason,
    acceptStake,
    rejectStake,
    onClose,
    onSuccess
}: VoteModalProps) {
    const { voteOnDispute, isLoading } = useDisputes()
    const [voteType, setVoteType] = useState<'accept' | 'reject' | null>(null)
    const [stakeAmount, setStakeAmount] = useState('0.01')

    const handleSubmit = async () => {
        if (!voteType) {
            toast.error('Please select ACCEPT or REJECT')
            return
        }

        if (parseFloat(stakeAmount) < 0.001) {
            toast.error('Minimum stake is 0.001 BNB')
            return
        }

        try {
            await voteOnDispute(disputeId, voteType === 'accept', stakeAmount)

            toast.success(`Vote submitted! You voted to ${voteType.toUpperCase()} the dispute`)
            onSuccess()
            onClose()
        } catch (error: any) {
            toast.error(error.message || 'Failed to submit vote')
        }
    }

    const totalStake = parseFloat(acceptStake) + parseFloat(rejectStake)
    const acceptPercentage = totalStake > 0 ? (parseFloat(acceptStake) / totalStake) * 100 : 50
    const rejectPercentage = totalStake > 0 ? (parseFloat(rejectStake) / totalStake) * 100 : 50

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-card border border-border rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-border">
                    <h2 className="text-2xl font-bold text-foreground">Vote on Dispute</h2>
                    <button
                        onClick={onClose}
                        className="text-muted-foreground hover:text-foreground transition-colors"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">
                    {/* Market Info */}
                    <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                        <div>
                            <p className="text-sm text-muted-foreground">Market Question:</p>
                            <p className="font-medium text-foreground mt-1">{marketQuestion}</p>
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">Dispute Reason:</p>
                            <p className="text-sm text-foreground mt-1 italic">"{disputeReason}"</p>
                        </div>
                    </div>

                    {/* Current Votes */}
                    <div className="space-y-3">
                        <p className="text-sm font-medium text-foreground">Current Voting Status:</p>
                        <div className="space-y-2">
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-green-400">✅ ACCEPT (Resolution Wrong)</span>
                                <span className="font-medium text-green-400">{acceptStake} BNB ({acceptPercentage.toFixed(1)}%)</span>
                            </div>
                            <div className="h-2 bg-background rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-green-500 transition-all duration-300"
                                    style={{ width: `${acceptPercentage}%` }}
                                />
                            </div>

                            <div className="flex items-center justify-between text-sm mt-3">
                                <span className="text-red-400">❌ REJECT (Resolution Correct)</span>
                                <span className="font-medium text-red-400">{rejectStake} BNB ({rejectPercentage.toFixed(1)}%)</span>
                            </div>
                            <div className="h-2 bg-background rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-red-500 transition-all duration-300"
                                    style={{ width: `${rejectPercentage}%` }}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Vote Selection */}
                    <div className="space-y-3">
                        <p className="text-sm font-medium text-foreground">Your Vote:</p>
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                onClick={() => setVoteType('accept')}
                                className={`p-4 rounded-lg border-2 transition-all ${voteType === 'accept'
                                        ? 'border-green-500 bg-green-500/10'
                                        : 'border-border hover:border-green-500/50'
                                    }`}
                            >
                                <div className="flex flex-col items-center gap-2">
                                    <ThumbsUp className={`w-6 h-6 ${voteType === 'accept' ? 'text-green-500' : 'text-muted-foreground'}`} />
                                    <span className={`font-medium ${voteType === 'accept' ? 'text-green-500' : 'text-foreground'}`}>
                                        ACCEPT
                                    </span>
                                    <span className="text-xs text-muted-foreground text-center">
                                        Resolution is incorrect
                                    </span>
                                </div>
                            </button>

                            <button
                                onClick={() => setVoteType('reject')}
                                className={`p-4 rounded-lg border-2 transition-all ${voteType === 'reject'
                                        ? 'border-red-500 bg-red-500/10'
                                        : 'border-border hover:border-red-500/50'
                                    }`}
                            >
                                <div className="flex flex-col items-center gap-2">
                                    <ThumbsDown className={`w-6 h-6 ${voteType === 'reject' ? 'text-red-500' : 'text-muted-foreground'}`} />
                                    <span className={`font-medium ${voteType === 'reject' ? 'text-red-500' : 'text-foreground'}`}>
                                        REJECT
                                    </span>
                                    <span className="text-xs text-muted-foreground text-center">
                                        Resolution is correct
                                    </span>
                                </div>
                            </button>
                        </div>
                    </div>

                    {/* Stake Amount */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground">
                            Stake Amount (BNB) <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="number"
                            value={stakeAmount}
                            onChange={(e) => setStakeAmount(e.target.value)}
                            min="0.001"
                            step="0.001"
                            className="w-full px-4 py-3 bg-background border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                        <p className="text-xs text-muted-foreground">
                            Minimum: 0.001 BNB • Higher stake = more influence + potential profit
                        </p>
                    </div>

                    {/* Warning */}
                    <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
                        <div className="flex gap-3">
                            <AlertTriangle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                            <div className="space-y-2">
                                <p className="font-medium text-yellow-500">Risk Warning</p>
                                <ul className="text-sm text-yellow-400/80 space-y-1">
                                    <li>• If your side WINS, you get stake back + profit from losers</li>
                                    <li>• If your side LOSES, you lose your ENTIRE stake (100% loss)</li>
                                    <li>• Vote expires in 3 days - winner determined by total stake</li>
                                    <li>• 5% platform fee on winnings only</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 p-6 border-t border-border">
                    <Button
                        onClick={onClose}
                        variant="outline"
                        disabled={isLoading}
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        disabled={isLoading || !voteType || parseFloat(stakeAmount) < 0.001}
                        className={voteType === 'accept' ? 'bg-green-500 hover:bg-green-600' : 'bg-red-500 hover:bg-red-600'}
                    >
                        {isLoading ? 'Submitting...' : `Vote ${voteType?.toUpperCase()} - ${stakeAmount} BNB`}
                    </Button>
                </div>
            </div>
        </div>
    )
}
