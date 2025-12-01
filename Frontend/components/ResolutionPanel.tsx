import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertCircle, CheckCircle2, Clock, TrendingUp } from 'lucide-react'
import { usePredictionMarketBNB } from '@/hooks/use-predection-market'
import { usePredictionMarketPDX } from '@/hooks/use-prediction-market-pdx'

interface ResolutionPanelProps {
    marketId: number
    status: number
    outcome: number
    endTime: number
    paymentToken: 'BNB' | 'PDX'
    yesBalance?: string
    noBalance?: string
    resolutionConfidence?: number
    resolutionReason?: string
}

export function ResolutionPanel({
    marketId,
    status,
    outcome,
    endTime,
    paymentToken,
    yesBalance = '0',
    noBalance = '0',
    resolutionConfidence,
    resolutionReason
}: ResolutionPanelProps) {
    const [isRequesting, setIsRequesting] = useState(false)
    const [isClaiming, setIsClaiming] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState<string | null>(null)

    const bnbHook = usePredictionMarketBNB()
    const pdxHook = usePredictionMarketPDX()

    const hook = paymentToken === 'BNB' ? bnbHook : pdxHook

    const now = Math.floor(Date.now() / 1000)
    const hasEnded = now >= endTime

    // Market statuses: 0=Open, 1=Closed, 2=ResolutionRequested, 3=Resolved, 4=Disputed
    const isOpen = status === 0
    const isResolutionRequested = status === 2
    const isResolved = status === 3

    // Check if user has winning tokens
    const yesBalanceNum = parseFloat(yesBalance)
    const noBalanceNum = parseFloat(noBalance)
    const hasYesTokens = yesBalanceNum > 0
    const hasNoTokens = noBalanceNum > 0

    const isWinner = isResolved && (
        (outcome === 1 && hasYesTokens) || // YES won and user has YES tokens
        (outcome === 2 && hasNoTokens)     // NO won and user has NO tokens
    )

    const winningAmount = outcome === 1 ? yesBalance : noBalance

    const handleRequestResolution = async () => {
        setIsRequesting(true)
        setError(null)
        setSuccess(null)

        try {
            await hook.requestResolution(marketId, 'Market has ended, requesting AI resolution')
            setSuccess('Resolution requested successfully! AI will resolve this market soon.')
        } catch (err: any) {
            console.error('Error requesting resolution:', err)
            setError(err.message || 'Failed to request resolution')
        } finally {
            setIsRequesting(false)
        }
    }

    const handleClaimPayout = async () => {
        setIsClaiming(true)
        setError(null)
        setSuccess(null)

        try {
            if (paymentToken === 'BNB') {
                await bnbHook.claimRedemption(marketId)
            } else {
                await pdxHook.claimRedemption(marketId)
            }
            setSuccess(`Successfully claimed ${winningAmount} ${paymentToken}!`)
        } catch (err: any) {
            console.error('Error claiming payout:', err)
            setError(err.message || 'Failed to claim payout')
        } finally {
            setIsClaiming(false)
        }
    }

    // Show nothing if market is still active
    if (isOpen && !hasEnded) {
        return null
    }

    return (
        <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    {isResolved ? (
                        <>
                            <CheckCircle2 className="w-5 h-5 text-green-500" />
                            Market Resolved
                        </>
                    ) : isResolutionRequested ? (
                        <>
                            <Clock className="w-5 h-5 text-yellow-500" />
                            Resolution Pending
                        </>
                    ) : (
                        <>
                            <AlertCircle className="w-5 h-5 text-orange-500" />
                            Market Ended
                        </>
                    )}
                </CardTitle>
                <CardDescription>
                    {isResolved
                        ? `This market has been resolved. Outcome: ${outcome === 1 ? 'YES' : 'NO'}`
                        : isResolutionRequested
                            ? 'AI is analyzing this market and will resolve it soon'
                            : 'This market has ended and needs resolution'}
                </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
                {/* Resolution Status */}
                {isResolved && (
                    <div className="p-4 bg-primary/10 rounded-lg border border-primary/20">
                        <div className="flex items-start gap-3">
                            <div className="flex-1">
                                <div className="font-semibold text-lg mb-1">
                                    Outcome: {outcome === 1 ? '✅ YES' : '❌ NO'}
                                </div>
                                {resolutionConfidence && (
                                    <div className="text-sm text-muted-foreground mb-2">
                                        Confidence: {resolutionConfidence}%
                                    </div>
                                )}
                                {resolutionReason && (
                                    <div className="text-sm text-muted-foreground">
                                        {resolutionReason}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Winner Payout Section */}
                {isWinner && (
                    <div className="p-4 bg-green-500/10 rounded-lg border border-green-500/20">
                        <div className="flex items-center gap-2 mb-3">
                            <TrendingUp className="w-5 h-5 text-green-500" />
                            <span className="font-semibold text-green-500">You Won!</span>
                        </div>
                        <div className="text-2xl font-bold mb-2">
                            {winningAmount} {paymentToken}
                        </div>
                        <div className="text-sm text-muted-foreground mb-4">
                            You can claim your payout now
                        </div>
                        <Button
                            onClick={handleClaimPayout}
                            disabled={isClaiming}
                            className="w-full bg-green-600 hover:bg-green-700"
                        >
                            {isClaiming ? 'Claiming...' : `Claim ${winningAmount} ${paymentToken}`}
                        </Button>
                    </div>
                )}

                {/* Request Resolution Button */}
                {!isResolved && !isResolutionRequested && hasEnded && (
                    <Button
                        onClick={handleRequestResolution}
                        disabled={isRequesting}
                        className="w-full"
                        variant="default"
                    >
                        {isRequesting ? 'Requesting...' : 'Request AI Resolution'}
                    </Button>
                )}

                {/* Pending Resolution Message */}
                {isResolutionRequested && !isResolved && (
                    <div className="p-4 bg-yellow-500/10 rounded-lg border border-yellow-500/20">
                        <div className="flex items-center gap-2 mb-2">
                            <Clock className="w-4 h-4 text-yellow-500" />
                            <span className="font-semibold text-yellow-500">Resolution in Progress</span>
                        </div>
                        <div className="text-sm text-muted-foreground">
                            Our AI is analyzing this market and will resolve it automatically. This usually takes a few minutes.
                        </div>
                    </div>
                )}

                {/* Error/Success Messages */}
                {error && (
                    <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-500 text-sm">
                        {error}
                    </div>
                )}
                {success && (
                    <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg text-green-500 text-sm">
                        {success}
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
