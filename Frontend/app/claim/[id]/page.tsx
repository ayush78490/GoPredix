"use client"

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAccount } from 'wagmi'
import Header from '@/components/header'
import Footer from '@/components/footer'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Clock, CheckCircle, AlertCircle, Trophy, Loader2 } from 'lucide-react'
import { useAllMarkets } from '@/hooks/getAllMarkets'
import { useDisputes } from '@/hooks/useDisputes'
import { usePDXDisputes } from '@/hooks/usePDXDisputes'
import { usePredictionMarketBNB } from '@/hooks/use-predection-market'
import { usePredictionMarketPDX } from '@/hooks/use-prediction-market-pdx'
import LightRays from '@/components/LightRays'
import { LogoLoading } from '@/components/ui/logo-loading'

export default function ClaimStatusPage() {
    const params = useParams()
    const router = useRouter()
    const { address, isConnected } = useAccount()
    const { markets, isLoading: marketsLoading } = useAllMarkets()
    const { getMarketDispute: getBNBDispute } = useDisputes()
    const { getMarketDispute: getPDXDispute } = usePDXDisputes()
    const bnbHook = usePredictionMarketBNB()
    const pdxHook = usePredictionMarketPDX()

    const [market, setMarket] = useState<any>(null)
    const [userPosition, setUserPosition] = useState<any>(null)
    const [dispute, setDispute] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [claiming, setClaiming] = useState(false)

    const marketId = params.id as string

    useEffect(() => {
        loadMarketData()
    }, [markets, marketId, address])

    const loadMarketData = async () => {
        if (!markets || markets.length === 0 || !marketId) return

        setLoading(true)
        try {
            // Find the market
            const foundMarket = markets.find((m: any) => m.numericId?.toString() === marketId)
            if (!foundMarket) {
                setLoading(false)
                return
            }
            setMarket(foundMarket)

            // Get user position
            if (address) {
                const position = await getUserPosition(foundMarket)
                setUserPosition(position)
            }

            // Check for dispute
            if (foundMarket.status === 3 || foundMarket.status === 4) {
                const disputeData = foundMarket.paymentToken === 'PDX'
                    ? await getPDXDispute(foundMarket.numericId)
                    : await getBNBDispute(foundMarket.numericId)
                setDispute(disputeData)
            }
        } catch (error) {
            console.error('Error loading market data:', error)
        } finally {
            setLoading(false)
        }
    }

    const getUserPosition = async (market: any) => {
        if (!address) return { yesTokens: 0, noTokens: 0, expectedPayout: 0 }

        try {
            const { ethers } = await import('ethers')
            const provider = new ethers.JsonRpcProvider(
                process.env.NEXT_PUBLIC_RPC_URL || 'https://data-seed-prebsc-1-s1.binance.org:8545'
            )

            // Create YES and NO token contracts
            const tokenABI = ['function balanceOf(address account) view returns (uint256)']
            const yesTokenContract = new ethers.Contract(market.yesToken, tokenABI, provider)
            const noTokenContract = new ethers.Contract(market.noToken, tokenABI, provider)

            // Get balances
            const [yesBalanceWei, noBalanceWei] = await Promise.all([
                yesTokenContract.balanceOf(address),
                noTokenContract.balanceOf(address)
            ])

            const yesTokens = parseFloat(ethers.formatEther(yesBalanceWei))
            const noTokens = parseFloat(ethers.formatEther(noBalanceWei))

            return {
                yesTokens,
                noTokens,
                expectedPayout: calculateExpectedPayout(market, yesTokens, noTokens)
            }
        } catch (error) {
            console.error('Error getting user position:', error)
            return { yesTokens: 0, noTokens: 0, expectedPayout: 0 }
        }
    }

    const calculateExpectedPayout = (market: any, yesTokens: number, noTokens: number) => {
        if (market.status !== 3) return 0

        // If outcome is YES (1), user gets payout for YES tokens
        if (market.outcome === 1) {
            return yesTokens
        }
        // If outcome is NO (2), user gets payout for NO tokens
        else if (market.outcome === 2) {
            return noTokens
        }
        return 0
    }

    const getStatusText = (status: number) => {
        const statusMap: Record<number, string> = {
            0: 'Open',
            1: 'Closed',
            2: 'Resolving',
            3: 'Resolved',
            4: 'Disputed'
        }
        return statusMap[status] || 'Unknown'
    }

    const getOutcomeText = (outcome: number) => {
        if (outcome === 1) return 'YES'
        if (outcome === 2) return 'NO'
        return 'UNDECIDED'
    }

    const canClaim = () => {
        if (!market || !userPosition) return false
        if (market.status !== 3) return false
        if (userPosition.expectedPayout <= 0) return false

        // Check if dispute period has ended
        const now = Math.floor(Date.now() / 1000)
        if (market.disputeDeadline && market.disputeDeadline > now) return false

        return true
    }

    const getTimeRemaining = () => {
        if (!market || !market.disputeDeadline) return null
        const now = Math.floor(Date.now() / 1000)
        const remaining = market.disputeDeadline - now

        if (remaining <= 0) return 'Ended'

        const days = Math.floor(remaining / 86400)
        const hours = Math.floor((remaining % 86400) / 3600)
        const minutes = Math.floor((remaining % 3600) / 60)

        if (days > 0) return `${days}d ${hours}h remaining`
        if (hours > 0) return `${hours}h ${minutes}m remaining`
        return `${minutes}m remaining`
    }

    const handleClaim = async () => {
        if (!market || !canClaim()) return

        setClaiming(true)
        try {
            if (market.paymentToken === 'PDX') {
                await pdxHook.claimPDXRedemption(market.numericId)
            } else {
                await bnbHook.claimRedemption(market.numericId)
            }

            // Refresh data
            await loadMarketData()
        } catch (error: any) {
            console.error('Error claiming:', error)
            alert(error.message || 'Failed to claim rewards')
        } finally {
            setClaiming(false)
        }
    }

    const formatDate = (timestamp: number) => {
        if (!timestamp) return 'N/A'
        return new Date(timestamp * 1000).toLocaleString()
    }

    if (!isConnected) {
        return (
            <main className="min-h-screen bg-background">
                <Header />
                <div className="max-w-4xl mx-auto px-4 py-20">
                    <Card>
                        <CardContent className="p-12 text-center">
                            <AlertCircle className="w-16 h-16 mx-auto mb-4 text-yellow-500" />
                            <h2 className="text-2xl font-bold mb-2">Connect Your Wallet</h2>
                            <p className="text-muted-foreground">Please connect your wallet to view claim status</p>
                        </CardContent>
                    </Card>
                </div>
                <Footer />
            </main>
        )
    }

    if (loading || marketsLoading) {
        return (
            <main className="min-h-screen bg-background">
                <Header />
                <div className="flex justify-center items-center py-20">
                    <LogoLoading size={64} />
                </div>
                <Footer />
            </main>
        )
    }

    if (!market) {
        return (
            <main className="min-h-screen bg-background">
                <Header />
                <div className="max-w-4xl mx-auto px-4 py-20">
                    <Card>
                        <CardContent className="p-12 text-center">
                            <AlertCircle className="w-16 h-16 mx-auto mb-4 text-red-500" />
                            <h2 className="text-2xl font-bold mb-2">Market Not Found</h2>
                            <p className="text-muted-foreground mb-6">The market you're looking for doesn't exist</p>
                            <Button onClick={() => router.push('/profile')}>
                                <ArrowLeft className="w-4 h-4 mr-2" />
                                Back to Profile
                            </Button>
                        </CardContent>
                    </Card>
                </div>
                <Footer />
            </main>
        )
    }

    const timeRemaining = getTimeRemaining()
    const claimable = canClaim()

    return (
        <main className="min-h-screen bg-background relative overflow-hidden">
            <div className="fixed inset-0 z-0">
                <LightRays
                    raysOrigin="top-center"
                    raysColor="#6366f1"
                    raysSpeed={1.5}
                    lightSpread={0.8}
                    rayLength={1.2}
                    followMouse={true}
                    noiseAmount={0.1}
                    distortion={0.05}
                />
            </div>

            <div className="relative z-10 bg-black/80 min-h-screen">
                <Header />

                <div className="max-w-4xl mx-auto px-4 py-8">
                    {/* Back Button */}
                    <Button
                        variant="outline"
                        onClick={() => router.push('/profile')}
                        className="mb-6"
                    >
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Back to Profile
                    </Button>

                    {/* Market Info Card */}
                    <Card className="mb-6 bg-card/80 backdrop-blur-sm">
                        <CardHeader>
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex-1">
                                    <CardTitle className="text-2xl mb-2">{market.question}</CardTitle>
                                    <div className="flex flex-wrap items-center gap-2">
                                        <Badge variant="secondary">{market.category}</Badge>
                                        <Badge className={`${market.paymentToken === 'PDX'
                                            ? 'bg-purple-500/20 text-purple-400'
                                            : 'bg-yellow-500/20 text-yellow-400'
                                            }`}>
                                            {market.paymentToken}
                                        </Badge>
                                        <Badge className={`${market.status === 0 ? 'bg-green-500' :
                                            market.status === 1 ? 'bg-yellow-500' :
                                                market.status === 2 ? 'bg-blue-500' :
                                                    market.status === 3 ? 'bg-purple-500' :
                                                        'bg-red-500'
                                            }`}>
                                            {getStatusText(market.status)}
                                        </Badge>
                                    </div>
                                </div>
                            </div>
                        </CardHeader>
                    </Card>

                    {/* Timeline Card */}
                    <Card className="mb-6 bg-card/80 backdrop-blur-sm">
                        <CardHeader>
                            <CardTitle>Market Timeline</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {/* Market Closed */}
                                <div className="flex items-start gap-4">
                                    <div className="mt-1">
                                        <CheckCircle className="w-6 h-6 text-green-500" />
                                    </div>
                                    <div className="flex-1">
                                        <h4 className="font-semibold">Market Closed</h4>
                                        <p className="text-sm text-muted-foreground">
                                            {formatDate(market.endTime)}
                                        </p>
                                    </div>
                                </div>

                                {/* Resolution Requested */}
                                {market.resolutionRequestedAt > 0 && (
                                    <div className="flex items-start gap-4">
                                        <div className="mt-1">
                                            <CheckCircle className="w-6 h-6 text-green-500" />
                                        </div>
                                        <div className="flex-1">
                                            <h4 className="font-semibold">Resolution Requested</h4>
                                            <p className="text-sm text-muted-foreground">
                                                {formatDate(market.resolutionRequestedAt)}
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {/* AI Resolved */}
                                {market.status === 3 && (
                                    <div className="flex items-start gap-4">
                                        <div className="mt-1">
                                            <CheckCircle className="w-6 h-6 text-green-500" />
                                        </div>
                                        <div className="flex-1">
                                            <h4 className="font-semibold">AI Resolved</h4>
                                            <div className="mt-2 bg-gradient-to-r from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 rounded-lg p-3">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="text-lg">🤖</span>
                                                    <p className="text-sm font-medium text-indigo-300">AI Decision:</p>
                                                </div>
                                                <p className={`text-xl font-bold ${market.outcome === 1 ? 'text-green-400' :
                                                    market.outcome === 2 ? 'text-red-400' :
                                                        'text-yellow-400'
                                                    }`}>
                                                    {getOutcomeText(market.outcome)}
                                                </p>
                                                {market.resolutionReason && (
                                                    <p className="text-sm text-muted-foreground mt-2 italic">
                                                        "{market.resolutionReason}"
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Dispute Period */}
                                {market.status === 3 && market.disputeDeadline && (
                                    <div className="flex items-start gap-4">
                                        <div className="mt-1">
                                            {timeRemaining === 'Ended' ? (
                                                <CheckCircle className="w-6 h-6 text-green-500" />
                                            ) : (
                                                <Clock className="w-6 h-6 text-yellow-500" />
                                            )}
                                        </div>
                                        <div className="flex-1">
                                            <h4 className="font-semibold">Dispute Period</h4>
                                            <p className="text-sm text-muted-foreground">
                                                {timeRemaining === 'Ended' ? 'Ended' : timeRemaining}
                                            </p>
                                            {timeRemaining !== 'Ended' && (
                                                <p className="text-xs text-yellow-400 mt-1">
                                                    ⚠️ Validators can still dispute this resolution
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Disputed */}
                                {dispute && (
                                    <div className="flex items-start gap-4">
                                        <div className="mt-1">
                                            <AlertCircle className="w-6 h-6 text-red-500" />
                                        </div>
                                        <div className="flex-1">
                                            <h4 className="font-semibold text-red-400">Market Disputed</h4>
                                            <p className="text-sm text-muted-foreground">
                                                Resolution is being challenged by validators
                                            </p>
                                            <div className="mt-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                                                <p className="text-sm text-red-300">
                                                    Validators are voting on whether the AI's decision is correct.
                                                    You'll be able to claim once the dispute is resolved.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Ready to Claim */}
                                {claimable && (
                                    <div className="flex items-start gap-4">
                                        <div className="mt-1">
                                            <Trophy className="w-6 h-6 text-green-500" />
                                        </div>
                                        <div className="flex-1">
                                            <h4 className="font-semibold text-green-400">Ready to Claim!</h4>
                                            <p className="text-sm text-muted-foreground">
                                                Dispute period has ended. You can now claim your rewards.
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* User Position Card */}
                    {userPosition && (
                        <Card className="mb-6 bg-card/80 backdrop-blur-sm">
                            <CardHeader>
                                <CardTitle>Your Position</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
                                        <p className="text-sm text-muted-foreground mb-1">YES Tokens</p>
                                        <p className="text-2xl font-bold text-green-400">
                                            {userPosition.yesTokens.toFixed(4)}
                                        </p>
                                    </div>
                                    <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
                                        <p className="text-sm text-muted-foreground mb-1">NO Tokens</p>
                                        <p className="text-2xl font-bold text-red-400">
                                            {userPosition.noTokens.toFixed(4)}
                                        </p>
                                    </div>
                                    <div className="p-4 bg-purple-500/10 border border-purple-500/30 rounded-lg">
                                        <p className="text-sm text-muted-foreground mb-1">Expected Payout</p>
                                        <p className="text-2xl font-bold text-purple-400">
                                            {userPosition.expectedPayout.toFixed(4)} {market.paymentToken}
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Claim Button */}
                    <Card className="bg-card/80 backdrop-blur-sm">
                        <CardContent className="p-6">
                            {claimable ? (
                                <Button
                                    onClick={handleClaim}
                                    disabled={claiming}
                                    className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white text-lg py-6"
                                >
                                    {claiming ? (
                                        <>
                                            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                            Claiming...
                                        </>
                                    ) : (
                                        <>
                                            <Trophy className="w-5 h-5 mr-2" />
                                            Claim {userPosition?.expectedPayout.toFixed(4)} {market.paymentToken}
                                        </>
                                    )}
                                </Button>
                            ) : market.status === 3 && timeRemaining !== 'Ended' ? (
                                <div className="text-center">
                                    <Button disabled className="w-full py-6 text-lg">
                                        <Clock className="w-5 h-5 mr-2" />
                                        Claim Available in {timeRemaining}
                                    </Button>
                                    <p className="text-sm text-muted-foreground mt-2">
                                        Waiting for dispute period to end
                                    </p>
                                </div>
                            ) : market.status < 3 ? (
                                <div className="text-center">
                                    <Button disabled className="w-full py-6 text-lg">
                                        <Clock className="w-5 h-5 mr-2" />
                                        Awaiting AI Resolution
                                    </Button>
                                    <p className="text-sm text-muted-foreground mt-2">
                                        Market needs to be resolved before you can claim
                                    </p>
                                </div>
                            ) : dispute ? (
                                <div className="text-center">
                                    <Button disabled className="w-full py-6 text-lg">
                                        <AlertCircle className="w-5 h-5 mr-2" />
                                        Claim Unavailable
                                    </Button>
                                    <p className="text-sm text-muted-foreground mt-2">
                                        Market is under dispute. Wait for resolution.
                                    </p>
                                </div>
                            ) : (
                                <div className="text-center">
                                    <Button disabled className="w-full py-6 text-lg">
                                        No Rewards to Claim
                                    </Button>
                                    <p className="text-sm text-muted-foreground mt-2">
                                        You don't have winning tokens for this market
                                    </p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                <Footer />
            </div>
        </main>
    )
}
