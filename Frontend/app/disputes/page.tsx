"use client"

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import Header from '@/components/header'
import Footer from '@/components/footer'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useAllMarkets } from '@/hooks/getAllMarkets'
import { useDisputes, DisputeInfo, DisputeStatus } from '@/hooks/useDisputes'
import { usePDXDisputes, PDXDisputeInfo, DisputeStatus as PDXDisputeStatus } from '@/hooks/usePDXDisputes'
import { VoteModal } from '@/components/dispute/VoteModal'
import { CreateDisputeModal } from '@/components/dispute/CreateDisputeModal'
import { useAccount } from 'wagmi'
import { AlertCircle, TrendingUp, Clock, Users, Award, Coins } from 'lucide-react'
import { LogoLoading } from '@/components/ui/logo-loading'
import LightRays from '@/components/LightRays'
import { HowItWorksSection } from '@/components/dispute/HowItWorksSection'
import { ClaimTransactionTable } from '@/components/claim/ClaimTransactionTable'

export default function DisputesPage() {
    const { markets, isLoading: marketsLoading } = useAllMarkets()
    const { getMarketDispute, getUserVoteInfo } = useDisputes()
    const { getMarketDispute: getPDXMarketDispute, getUserVoteInfo: getPDXUserVoteInfo } = usePDXDisputes()
    const { address, isConnected } = useAccount()

    const [activeDisputes, setActiveDisputes] = useState<Array<{ market: any; dispute: DisputeInfo; userVote: any }>>([])
    const [resolvedMarkets, setResolvedMarkets] = useState<any[]>([])
    const [inactiveMarkets, setInactiveMarkets] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [selectedDispute, setSelectedDispute] = useState<any>(null)
    const [showVoteModal, setShowVoteModal] = useState(false)
    const [showCreateModal, setShowCreateModal] = useState(false)
    const [selectedMarket, setSelectedMarket] = useState<any>(null)

    useEffect(() => {
        loadDisputes()
    }, [markets, address])

    const loadDisputes = async () => {
        setLoading(true)
        const disputes = []
        const resolved = []
        const inactiveMarkets = [] // All inactive markets
        const closedMarkets = [] // Markets that are closed but not yet resolved

        const now = Math.floor(Date.now() / 1000) // Current time in seconds

        // DEBUG: Log all markets
        console.log('=== DISPUTES PAGE DEBUG ===')
        console.log('Total markets loaded:', markets.length)
        console.log('Current timestamp:', now)

        // Count by payment token
        const bnbMarkets = markets.filter(m => m.paymentToken === 'BNB')
        const pdxMarkets = markets.filter(m => m.paymentToken === 'PDX')
        console.log('BNB Markets:', bnbMarkets.length)
        console.log('PDX Markets:', pdxMarkets.length)

        // Count by status
        const statusCounts = {
            Open: markets.filter(m => m.status === 0).length,
            Closed: markets.filter(m => m.status === 1).length,
            ResolutionRequested: markets.filter(m => m.status === 2).length,
            Resolved: markets.filter(m => m.status === 3).length,
            Disputed: markets.filter(m => m.status === 4).length,
        }
        console.log('Market Status Breakdown:', statusCounts)

        // Count time-based ended markets
        const endedByTime = markets.filter(m => m.status === 0 && m.endTime <= now).length
        console.log('Markets ended by time (status=0, endTime passed):', endedByTime)

        for (const market of markets) {
            // Collect ALL inactive markets (status !== 0 OR endTime passed)
            const isEnded = market.status !== 0 || market.endTime <= now
            if (isEnded) {
                inactiveMarkets.push(market)
            }

            // Check for CLOSED markets: status 0 but endTime has passed, OR status 1
            const isClosed = (market.status === 0 && market.endTime <= now) || market.status === 1
            if (isClosed && market.status !== 3) { // Not already resolved
                console.log(`Found closed market: ${market.id} (${market.paymentToken}) - Status ${market.status}, EndTime: ${market.endTime}, Now: ${now}`)
                closedMarkets.push(market)
            }

            // Check for RESOLVED markets (status 3) - Check for disputes
            if (market.status === 3) {
                console.log(`Processing resolved market: ${market.id} (${market.paymentToken})`)

                let dispute = null
                let userVote = null

                // Use appropriate dispute hook based on payment token
                if (market.paymentToken === 'PDX') {
                    console.log(`  Checking PDX dispute for market ${market.numericId}...`)
                    dispute = await getPDXMarketDispute(market.numericId)
                    console.log(`  PDX dispute result:`, dispute ? `Found ID ${dispute.disputeId}` : 'None')
                    if (dispute && address) {
                        userVote = await getPDXUserVoteInfo(dispute.disputeId)
                    }
                } else {
                    // BNB market
                    console.log(`  Checking BNB dispute for market ${market.numericId}...`)
                    dispute = await getMarketDispute(market.numericId)
                    console.log(`  BNB dispute result:`, dispute ? `Found ID ${dispute.disputeId}` : 'None')
                    if (dispute && address) {
                        userVote = await getUserVoteInfo(dispute.disputeId)
                    }
                }

                if (dispute) {
                    // Market has a dispute
                    disputes.push({ market, dispute, userVote })
                } else {
                    // Market resolved but no dispute - eligible for dispute creation
                    resolved.push(market)
                }
            }
        }

        console.log('\n--- Final Results ---')
        console.log('Active disputes found:', disputes.length)
        console.log('Resolved markets (disputable):', resolved.length)
        console.log('Closed markets (awaiting resolution):', closedMarkets.length)
        console.log('Total inactive markets:', inactiveMarkets.length)
        console.log('=========================\n')

        setActiveDisputes(disputes)
        setResolvedMarkets([...closedMarkets, ...resolved]) // Include both closed and resolved
        setInactiveMarkets(inactiveMarkets) // Store inactive markets
        setLoading(false)
    }

    const handleVote = (market: any, dispute: DisputeInfo) => {
        setSelectedDispute({ market, dispute })
        setShowVoteModal(true)
    }

    const handleCreateDispute = (market: any) => {
        setSelectedMarket(market)
        setShowCreateModal(true)
    }

    const formatTimeRemaining = (seconds: number) => {
        if (seconds <= 0) return 'Voting ended'

        const days = Math.floor(seconds / 86400)
        const hours = Math.floor((seconds % 86400) / 3600)
        const minutes = Math.floor((seconds % 3600) / 60)

        if (days > 0) return `${days}d ${hours}h left`
        if (hours > 0) return `${hours}h ${minutes}m left`
        return `${minutes}m left`
    }

    const getOutcomeText = (outcome: number) => {
        switch (outcome) {
            case 1: return 'YES'
            case 2: return 'NO'
            default: return 'UNDECIDED'
        }
    }

    if (!isConnected) {
        return (
            <main className="min-h-screen bg-background">
                <Header />
                <div className="max-w-7xl mx-auto px-4 py-20">
                    <Card className="p-12 text-center">
                        <AlertCircle className="w-16 h-16 mx-auto mb-4 text-yellow-500" />
                        <h2 className="text-2xl font-bold mb-2">Connect Your Wallet</h2>
                        <p className="text-muted-foreground">Please connect your wallet to view and vote on disputes</p>
                    </Card>
                </div>
                <Footer />
            </main>
        )
    }

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

                <div className="max-w-7xl mx-auto px-4 py-8">
                    {/* Header */}
                    <div className="mb-10 mt-[10vh]">
                        <h1 className="text-4xl font-bold mb-2 text-white">Market Disputes & Voting</h1>
                        <p className="text-muted-foreground">Validate market resolutions and earn rewards by voting</p>
                    </div>

                    {loading || marketsLoading ? (
                        <div className="flex justify-center py-20">
                            <LogoLoading size={64} />
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 xl:grid-cols-[1fr_400px] gap-6">
                            <div className="space-y-8">
                                {/* Active Disputes */}
                                <div>
                                    <h2 className="text-2xl font-bold mb-4 text-white flex items-center gap-2">
                                        <AlertCircle className="w-6 h-6 text-yellow-500" />
                                        Active Disputes ({activeDisputes.length})
                                    </h2>

                                    {activeDisputes.length === 0 ? (
                                        <Card className="p-8 text-center bg-card/50 backdrop-blur-sm">
                                            <p className="text-muted-foreground">No active disputes at the moment</p>
                                        </Card>
                                    ) : (
                                        <div className="grid md:grid-cols-2 gap-4">
                                            {activeDisputes.map(({ market, dispute, userVote }) => (
                                                <Card key={dispute.disputeId} className="p-6 bg-card/80 backdrop-blur-sm hover:bg-card/90 transition-colors">
                                                    <div className="space-y-4">
                                                        {/* Token Badge */}
                                                        <div className="flex justify-between items-center">
                                                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${market.paymentToken === 'PDX'
                                                                ? 'bg-purple-500/20 text-purple-400'
                                                                : 'bg-yellow-500/20 text-yellow-400'
                                                                }`}>
                                                                <Coins className="w-3 h-3" />
                                                                {market.paymentToken}
                                                            </span>
                                                        </div>

                                                        {/* Market Question */}
                                                        <div>
                                                            <p className="text-sm text-muted-foreground">Market Question:</p>
                                                            <h3 className="font-semibold text-foreground line-clamp-2">{market.question}</h3>
                                                        </div>

                                                        {/* AI Resolution - What's being disputed */}
                                                        <div className="bg-gradient-to-r from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 rounded-lg p-3">
                                                            <div className="flex items-center gap-2 mb-1">
                                                                <span className="text-sm">🤖</span>
                                                                <p className="text-xs text-indigo-300 font-medium">AI Resolved As:</p>
                                                            </div>
                                                            <p className={`text-lg font-bold text-center ${market.outcome === 1 ? 'text-green-400' :
                                                                market.outcome === 2 ? 'text-red-400' :
                                                                    'text-yellow-400'
                                                                }`}>
                                                                {getOutcomeText(market.outcome)}
                                                            </p>
                                                            <p className="text-xs text-center text-muted-foreground mt-1 italic">
                                                                Disputed as incorrect
                                                            </p>
                                                        </div>

                                                        {/* Dispute Info */}
                                                        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
                                                            <p className="text-xs text-yellow-500 mb-1">Dispute Reason:</p>
                                                            <p className="text-sm text-yellow-400/90 italic">"{dispute.reason}"</p>
                                                        </div>

                                                        {/* Voting Stats */}
                                                        <div className="grid grid-cols-2 gap-3">
                                                            <div className="bg-green-500/10 rounded-lg p-3">
                                                                <div className="flex items-center gap-1 mb-1">
                                                                    <TrendingUp className="w-3 h-3 text-green-500" />
                                                                    <span className="text-xs text-green-400">ACCEPT</span>
                                                                </div>
                                                                <p className="text-lg font-bold text-green-500">{dispute.totalAcceptStake} {market.paymentToken}</p>
                                                                <p className="text-xs text-green-400/70">{dispute.acceptVotePercentage.toFixed(1)}%</p>
                                                            </div>

                                                            <div className="bg-red-500/10 rounded-lg p-3">
                                                                <div className="flex items-center gap-1 mb-1">
                                                                    <Users className="w-3 h-3 text-red-500" />
                                                                    <span className="text-xs text-red-400">REJECT</span>
                                                                </div>
                                                                <p className="text-lg font-bold text-red-500">{dispute.totalRejectStake} {market.paymentToken}</p>
                                                                <p className="text-xs text-red-400/70">{dispute.rejectVotePercentage.toFixed(1)}%</p>
                                                            </div>
                                                        </div>

                                                        {/* Progress Bar */}
                                                        <div className="h-2 bg-background rounded-full overflow-hidden flex">
                                                            <div
                                                                className="bg-green-500 transition-all"
                                                                style={{ width: `${dispute.acceptVotePercentage}%` }}
                                                            />
                                                            <div
                                                                className="bg-red-500 transition-all"
                                                                style={{ width: `${dispute.rejectVotePercentage}%` }}
                                                            />
                                                        </div>

                                                        {/* Time Remaining */}
                                                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                            <Clock className="w-4 h-4" />
                                                            <span>{formatTimeRemaining(dispute.timeRemaining)}</span>
                                                        </div>

                                                        {/* User Vote Status */}
                                                        {userVote?.hasVoted && (
                                                            <div className="bg-primary/10 border border-primary/30 rounded-lg p-3">
                                                                <div className="flex items-center gap-2">
                                                                    <Award className="w-4 h-4 text-primary" />
                                                                    <span className="text-sm font-medium text-primary">
                                                                        You voted: {userVote.vote ? 'ACCEPT' : 'REJECT'} ({userVote.stake} {market.paymentToken})
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        )}

                                                        {/* Vote Button */}
                                                        {!userVote?.hasVoted && dispute.status === DisputeStatus.Active && (
                                                            <Button
                                                                onClick={() => handleVote(market, dispute)}
                                                                className="w-full bg-primary hover:bg-primary/90"
                                                            >
                                                                Vote on Dispute
                                                            </Button>
                                                        )}

                                                        {userVote?.hasVoted && dispute.status === DisputeStatus.Active && (
                                                            <div className="text-center text-sm text-muted-foreground">
                                                                ✅ You've voted on this dispute
                                                            </div>
                                                        )}
                                                    </div>
                                                </Card>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Resolved Markets - Eligible for Disputes */}
                                <div>
                                    <h2 className="text-2xl font-bold mb-4 text-white flex items-center gap-2">
                                        <AlertCircle className="w-6 h-6 text-blue-500" />
                                        Markets Ready for Action ({resolvedMarkets.length})
                                    </h2>
                                    <p className="text-sm text-muted-foreground mb-4">
                                        Closed markets awaiting resolution requests • Resolved markets ready for dispute creation
                                    </p>

                                    {resolvedMarkets.length === 0 ? (
                                        <Card className="p-8 text-center bg-card/50 backdrop-blur-sm">
                                            <p className="text-muted-foreground">No markets ready for action</p>
                                        </Card>
                                    ) : (
                                        <div className="grid md:grid-cols-3 gap-4">
                                            {resolvedMarkets.slice(0, 12).map((market) => (
                                                <Card key={market.id} className="p-4 bg-card/80 backdrop-blur-sm hover:bg-card/90 transition-colors">
                                                    <div className="space-y-3">
                                                        {/* Token Badge */}
                                                        <div className="flex items-center justify-between">
                                                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${market.paymentToken === 'PDX'
                                                                ? 'bg-purple-500/20 text-purple-400'
                                                                : 'bg-yellow-500/20 text-yellow-400'
                                                                }`}>
                                                                <Coins className="w-3 h-3" />
                                                                {market.paymentToken}
                                                            </span>

                                                            {/* Status badge */}
                                                            <span className={`text-xs px-2 py-0.5 rounded ${market.status === 1
                                                                ? 'bg-orange-500/20 text-orange-400'
                                                                : 'bg-blue-500/20 text-blue-400'
                                                                }`}>
                                                                {market.status === 1 ? 'Closed' : 'Resolved'}
                                                            </span>
                                                        </div>

                                                        <div>
                                                            <h3 className="font-medium text-foreground text-sm line-clamp-2">{market.question}</h3>
                                                        </div>

                                                        {/* AI Resolution Display - Prominent */}
                                                        {market.status === 3 ? (
                                                            <div className="bg-gradient-to-r from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 rounded-lg p-4 space-y-2">
                                                                <div className="flex items-center gap-2">
                                                                    <span className="text-xl">🤖</span>
                                                                    <p className="text-xs font-medium text-indigo-300">AI Resolution Decision:</p>
                                                                </div>
                                                                <p className={`text-2xl font-bold text-center ${market.outcome === 1 ? 'text-green-400' :
                                                                    market.outcome === 2 ? 'text-red-400' :
                                                                        'text-yellow-400'
                                                                    }`}>
                                                                    {getOutcomeText(market.outcome)}
                                                                </p>
                                                                <p className="text-xs text-center text-muted-foreground italic">
                                                                    Validators: Vote to dispute if you think this is wrong
                                                                </p>
                                                            </div>
                                                        ) : (
                                                            <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-3">
                                                                <p className="text-xs text-orange-400">⏳ Awaiting AI Resolution</p>
                                                                <p className="text-sm text-muted-foreground mt-1">Request resolution to enable disputes</p>
                                                            </div>
                                                        )}

                                                        <Button
                                                            onClick={() => handleCreateDispute(market)}
                                                            variant="outline"
                                                            size="sm"
                                                            className={`w-full text-xs ${market.paymentToken === 'PDX'
                                                                ? 'border-purple-500/30 hover:bg-purple-500/10'
                                                                : ''
                                                                }`}
                                                        >
                                                            {market.status === 1 ? 'Request Resolution' : `Create Dispute (${market.paymentToken === 'PDX' ? '10 PDX' : '0.01 BNB'})`}
                                                        </Button>
                                                    </div>
                                                </Card>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                <HowItWorksSection />
                            </div>

                            {/* Recent Claims Column */}
                            <div className="xl:sticky xl:top-24 xl:self-start border-l border-white/5 pl-6 hidden xl:block">
                                <ClaimTransactionTable />
                            </div>

                            {/* Mobile/Small screen Recent Claims */}
                            <div className="xl:hidden mt-8">
                                <ClaimTransactionTable />
                            </div>
                        </div>
                    )}

                    <Footer />

                    {/* Vote Modal */}
                    {showVoteModal && selectedDispute && (
                        <VoteModal
                            disputeId={selectedDispute.dispute.disputeId}
                            marketQuestion={selectedDispute.market.question}
                            aiResolution={getOutcomeText(selectedDispute.market.outcome)}
                            disputeReason={selectedDispute.dispute.reason}
                            acceptStake={selectedDispute.dispute.totalAcceptStake}
                            rejectStake={selectedDispute.dispute.totalRejectStake}
                            onClose={() => {
                                setShowVoteModal(false)
                                setSelectedDispute(null)
                            }}
                            onSuccess={async () => {
                                await loadDisputes()
                            }}
                        />
                    )}

                    {/* Create Dispute Modal */}
                    {showCreateModal && selectedMarket && (
                        <CreateDisputeModal
                            marketId={selectedMarket.numericId}
                            marketQuestion={selectedMarket.question}
                            resolution={getOutcomeText(selectedMarket.outcome)}
                            paymentToken={selectedMarket.paymentToken}
                            onClose={() => {
                                setShowCreateModal(false)
                                setSelectedMarket(null)
                            }}
                            onSuccess={async () => {
                                await loadDisputes()
                            }}
                        />
                    )}
                </div>
            </div>
        </main>
    )
}
