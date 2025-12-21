"use client"

import { useState } from 'react'
import { useDisputes } from '@/hooks/useDisputes'
import { usePDXDisputes } from '@/hooks/usePDXDisputes'
import { Button } from '@/components/ui/button'
import { X, AlertTriangle, Coins } from 'lucide-react'
import { toast } from 'react-hot-toast'

interface CreateDisputeModalProps {
    marketId: number
    marketQuestion: string
    resolution: string
    paymentToken?: 'BNB' | 'PDX'  // New prop to determine which dispute hook to use
    onClose: () => void
    onSuccess: () => void
}

export function CreateDisputeModal({
    marketId,
    marketQuestion,
    resolution,
    paymentToken = 'BNB',  // Default to BNB for backwards compatibility
    onClose,
    onSuccess
}: CreateDisputeModalProps) {
    const bnbDisputes = useDisputes()
    const pdxDisputes = usePDXDisputes()

    // Use the appropriate hook based on payment token
    const createDispute = paymentToken === 'PDX' ? pdxDisputes.createDispute : bnbDisputes.createDispute
    const isLoading = paymentToken === 'PDX' ? pdxDisputes.isLoading : bnbDisputes.isLoading

    // Default values based on token type
    const minStake = paymentToken === 'PDX' ? '10' : '0.015'
    const minStakeValue = paymentToken === 'PDX' ? 10 : 0.01

    const [reason, setReason] = useState('')
    const [stakeAmount, setStakeAmount] = useState(minStake)

    const handleSubmit = async () => {
        if (!reason.trim()) {
            toast.error('Please provide a reason for the dispute')
            return
        }

        if (parseFloat(stakeAmount) < minStakeValue) {
            toast.error(`Minimum stake is ${minStakeValue} ${paymentToken}`)
            return
        }

        try {
            const result = await createDispute(marketId, reason, stakeAmount)

            toast.success(`Dispute created! ID: ${result.disputeId}`)
            onSuccess()
            onClose()
        } catch (error: any) {
            toast.error(error.message || 'Failed to create dispute')
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-card border border-border rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-border">
                    <div className="flex items-center gap-3">
                        <h2 className="text-2xl font-bold text-foreground">Create Dispute</h2>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${paymentToken === 'PDX'
                            ? 'bg-purple-500/20 text-purple-400'
                            : 'bg-yellow-500/20 text-yellow-400'
                            }`}>
                            <Coins className="w-3 h-3" />
                            {paymentToken}
                        </span>
                    </div>
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
                        <p className="text-sm text-muted-foreground">Market Question:</p>
                        <p className="font-medium text-foreground">{marketQuestion}</p>
                        <div className="space-y-2 mt-3 pt-3 border-t border-border">
                            {resolution === 'UNDECIDED' ? (
                                <>
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm text-muted-foreground">Market Status:</span>
                                        <span className="px-3 py-1 bg-orange-500/20 text-orange-400 rounded-full text-sm font-medium">
                                            Closed - Awaiting Resolution
                                        </span>
                                    </div>
                                    <p className="text-xs text-muted-foreground italic">
                                        ℹ️ This market has ended but hasn't been resolved yet. You can request resolution instead of creating a dispute.
                                    </p>
                                </>
                            ) : (
                                <>
                                    <div className="bg-gradient-to-r from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 rounded-lg p-4 space-y-2">
                                        <div className="flex items-center gap-2">
                                            <span className="text-xl">🤖</span>
                                            <span className="text-sm font-medium text-indigo-300">AI Resolved This Market As:</span>
                                        </div>
                                        <div className="flex justify-center">
                                            <span className={`px-4 py-2 rounded-lg text-xl font-bold ${resolution === 'YES'
                                                    ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                                                    : 'bg-red-500/20 text-red-400 border border-red-500/30'
                                                }`}>
                                                {resolution}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 mt-2">
                                        <p className="text-sm text-red-400 font-medium">⚠️ By creating this dispute, you claim:</p>
                                        <p className="text-sm text-red-300 mt-1">
                                            "The AI's <strong>{resolution}</strong> resolution is <strong>INCORRECT</strong>"
                                        </p>
                                        <p className="text-xs text-muted-foreground mt-2 italic">
                                            Other validators will vote to either ACCEPT (agree with you) or REJECT (agree with AI) your dispute.
                                        </p>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Warning */}
                    <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
                        <div className="flex gap-3">
                            <AlertTriangle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                            <div className="space-y-2">
                                <p className="font-medium text-yellow-500">Important Information</p>
                                <ul className="text-sm text-yellow-400/80 space-y-1">
                                    <li>• Your stake is at RISK if the dispute is rejected</li>
                                    <li>• If dispute is accepted, you'll get your stake back + profit</li>
                                    <li>• If rejected, you lose your ENTIRE stake</li>
                                    <li>• Voting period is 3 days</li>
                                    {paymentToken === 'PDX' && (
                                        <li>• PDX will be auto-approved from your wallet</li>
                                    )}
                                </ul>
                            </div>
                        </div>
                    </div>

                    {/* Reason Input */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground">
                            Reason for Dispute <span className="text-red-500">*</span>
                        </label>
                        <textarea
                            value={reason}
                            onChange={(e) => setReason(e.target.value.slice(0, 500))}
                            placeholder="Explain why you believe this resolution is incorrect. Provide evidence and details..."
                            className="w-full h-32 px-4 py-3 bg-background border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                        />
                        <p className="text-xs text-muted-foreground text-right">
                            {reason.length}/500 characters
                        </p>
                    </div>

                    {/* Stake Amount */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground">
                            Stake Amount ({paymentToken}) <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="number"
                            value={stakeAmount}
                            onChange={(e) => setStakeAmount(e.target.value)}
                            min={minStakeValue.toString()}
                            step={paymentToken === 'PDX' ? '1' : '0.001'}
                            className="w-full px-4 py-3 bg-background border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                        <p className="text-xs text-muted-foreground">
                            Minimum: {minStakeValue} {paymentToken} • Your stake automatically counts as an ACCEPT vote
                        </p>
                    </div>

                    {/* Potential Outcome */}
                    <div className="bg-muted/30 rounded-lg p-4 space-y-2">
                        <p className="text-sm font-medium text-foreground">If Dispute is Accepted:</p>
                        <ul className="text-sm text-muted-foreground space-y-1">
                            <li>✅ You get your {stakeAmount} {paymentToken} stake back</li>
                            <li>✅ You share profits from losing voters</li>
                            <li>✅ Resolution may be changed</li>
                        </ul>
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
                        disabled={isLoading || !reason.trim() || parseFloat(stakeAmount) < minStakeValue}
                        className={`font-semibold ${paymentToken === 'PDX'
                            ? 'bg-purple-500 hover:bg-purple-600 text-white'
                            : 'bg-yellow-500 hover:bg-yellow-600 text-black'
                            }`}
                    >
                        {isLoading ? 'Processing...' : resolution === 'UNDECIDED' ? 'Request Resolution' : `Create Dispute - ${stakeAmount} ${paymentToken}`}
                    </Button>
                </div>
            </div>
        </div>
    )
}
