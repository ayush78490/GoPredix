"use client"

export const dynamic = 'force-dynamic'

import { useState, useMemo } from "react"
import Header from "@/components/header"
import MarketCard from "@/components/market-card"
import { Button } from "@/components/ui/button"
import { Search, Loader2, ArrowLeft } from "lucide-react"
import { useAllMarkets } from "@/hooks/getAllMarkets"
import Footer from "@/components/footer"
import LightRays from "@/components/LightRays"
import { useRouter } from "next/navigation"
import { useAccount, useChainId } from "wagmi"
import { LogoLoading } from "@/components/ui/logo-loading"

const CATEGORIES = [
    "All Markets", "Politics", "Finance", "Crypto", "Sports", "Tech", "Economy", "General"
]

const extractCategory = (question: string): string => {
    const lower = question.toLowerCase()
    if (lower.includes("bitcoin") || lower.includes("crypto")) return "Crypto"
    if (lower.includes("election") || lower.includes("president")) return "Politics"
    if (lower.includes("stock") || lower.includes("finance")) return "Finance"
    if (lower.includes("sports") || lower.includes("team") || lower.includes("match")) return "Sports"
    if (lower.includes("tech") || lower.includes("ai") || lower.includes("software")) return "Tech"
    if (lower.includes("economy") || lower.includes("inflation") || lower.includes("gdp")) return "Economy"
    return "General"
}

const calculatePrices = (yesPool: string, noPool: string) => {
    const yes = parseFloat(yesPool) || 0
    const no = parseFloat(noPool) || 0
    const total = yes + no
    if (total === 0) return { yesPrice: 50, noPrice: 50 }
    return {
        yesPrice: (yes / total) * 100,
        noPrice: (no / total) * 100
    }
}

const getMarketStatus = (market: any) => {
    const nowInSeconds = Math.floor(Date.now() / 1000)
    const endTimeInSeconds = Number(market.endTime)
    const contractStatus = Number(market.status)

    if (contractStatus === 3) {
        return {
            isActive: false,
            isEnded: true,
            isResolved: true,
            statusLabel: "Resolved",
            statusColor: "green"
        }
    }

    if (contractStatus === 4) {
        return {
            isActive: false,
            isEnded: true,
            isResolved: false,
            statusLabel: "Disputed",
            statusColor: "orange"
        }
    }

    if (contractStatus === 2) {
        return {
            isActive: false,
            isEnded: true,
            isResolved: false,
            statusLabel: "Resolution Requested",
            statusColor: "yellow"
        }
    }

    if (nowInSeconds >= endTimeInSeconds) {
        return {
            isActive: false,
            isEnded: true,
            isResolved: false,
            statusLabel: "Ended",
            statusColor: "red"
        }
    }

    if (contractStatus === 0) {
        return {
            isActive: true,
            isEnded: false,
            isResolved: false,
            statusLabel: "Active",
            statusColor: "green"
        }
    }

    return {
        isActive: false,
        isEnded: true,
        isResolved: false,
        statusLabel: "Closed",
        statusColor: "red"
    }
}

const convertToFrontendMarket = (market: any) => {
    const prices = calculatePrices(market.yesPool, market.noPool)
    const statusInfo = getMarketStatus(market)

    return {
        ...market,
        category: market.category || extractCategory(market.question),
        yesPrice: prices.yesPrice,
        noPrice: prices.noPrice,
        yesMultiplier: prices.yesPrice > 0 ? 100 / prices.yesPrice : 0,
        noMultiplier: prices.noPrice > 0 ? 100 / prices.noPrice : 0,
        paymentToken: market.paymentToken || "BNB",
        ...statusInfo
    }
}

export default function InactiveMarketsPage() {
    const [selectedCategory, setSelectedCategory] = useState("All Markets")
    const [searchQuery, setSearchQuery] = useState("")
    const [statusFilter, setStatusFilter] = useState<"all" | "ended" | "resolved" | "disputed">("all")
    const [loadingMarketId, setLoadingMarketId] = useState<string | null>(null)

    const router = useRouter()
    const { address: account, isConnected } = useAccount()
    const chainId = useChainId()

    const isCorrectNetwork = chainId === 97

    const {
        markets,
        isLoading,
        error,
        refreshMarkets,
    } = useAllMarkets()

    const formattedMarkets = useMemo(() => {
        return markets.map(m => convertToFrontendMarket(m))
    }, [markets])

    // Filter for ONLY inactive markets
    const filteredMarkets = useMemo(() => {
        return formattedMarkets.filter((market) => {
            // Only show inactive markets (ended, resolved, disputed, etc.)
            if (market.isActive) return false

            // Apply status filter
            if (statusFilter === "ended" && (!market.isEnded || market.isResolved)) return false
            if (statusFilter === "resolved" && !market.isResolved) return false
            if (statusFilter === "disputed" && market.statusLabel !== "Disputed") return false

            const cat = (market.category || "general").toLowerCase()
            const matchesCategory =
                selectedCategory.toLowerCase() === "all markets" || cat === selectedCategory.toLowerCase()
            const matchesSearch = market.question.toLowerCase().includes(searchQuery.toLowerCase())

            return matchesCategory && matchesSearch
        })
    }, [formattedMarkets, selectedCategory, searchQuery, statusFilter])

    const stats = useMemo(() => {
        const inactiveMarkets = formattedMarkets.filter(m => !m.isActive)
        const endedCount = inactiveMarkets.filter(m => m.isEnded && !m.isResolved).length
        const resolvedCount = inactiveMarkets.filter(m => m.isResolved).length
        const disputedCount = inactiveMarkets.filter(m => m.statusLabel === "Disputed").length

        return {
            totalInactive: inactiveMarkets.length,
            ended: endedCount,
            resolved: resolvedCount,
            disputed: disputedCount
        }
    }, [formattedMarkets])

    const handleMarketClick = (market: any) => {
        if (!isConnected || !isCorrectNetwork) {
            if (!isConnected) {
                alert("Please connect your wallet first")
            } else if (!isCorrectNetwork) {
                alert("Please switch to BSC Testnet")
            }
            return;
        }

        const questionSlug = market.question
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .substring(0, 60);

        const marketSlug = `${questionSlug}-${market.paymentToken}-${market.id}`;
        setLoadingMarketId(`${market.paymentToken}-${market.id}`);
        router.push(`/markets/${marketSlug}`);
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

                <div className="max-w-7xl mx-auto px-4 py-8 ">
                    {/* Header */}
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 mt-[10vh]">
                        <div className="flex items-center gap-4">
                            <Button
                                onClick={() => router.push('/markets')}
                                variant="ghost"
                                size="sm"
                                className="text-muted-foreground hover:text-foreground"
                            >
                                <ArrowLeft className="w-4 h-4 mr-2" />
                                Back to Active Markets
                            </Button>
                        </div>
                    </div>

                    <div className="mb-6">
                        <h1 className="text-4xl font-bold mb-2 text-white">Inactive Markets</h1>
                        <div className="text-sm text-muted-foreground space-x-4 flex flex-wrap gap-2">
                            <span className="inline-flex items-center gap-1">
                                <span className="font-semibold text-foreground">{stats.totalInactive}</span> Total Inactive
                            </span>
                            <span className="inline-flex items-center gap-1">
                                <span className="font-semibold text-red-400">{stats.ended}</span> Ended
                            </span>
                            <span className="inline-flex items-center gap-1">
                                <span className="font-semibold text-green-400">{stats.resolved}</span> Resolved
                            </span>
                            <span className="inline-flex items-center gap-1">
                                <span className="font-semibold text-orange-400">{stats.disputed}</span> Disputed
                            </span>
                        </div>
                    </div>

                    {/* Search */}
                    <div className="flex flex-col sm:flex-row gap-4 mb-6">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                            <input
                                type="text"
                                placeholder="Search inactive markets..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 bg-black/10 border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary backdrop-blur-sm"
                            />
                        </div>
                        <Button
                            onClick={refreshMarkets}
                            variant="outline"
                            disabled={isLoading}
                            className="backdrop-blur-sm bg-card/80"
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Loading...
                                </>
                            ) : (
                                "Refresh"
                            )}
                        </Button>
                    </div>

                    {/* Status Filter Buttons */}
                    <div className="flex flex-wrap gap-3 mb-6">
                        <Button
                            size="sm"
                            variant={statusFilter === "all" ? "default" : "outline"}
                            onClick={() => setStatusFilter("all")}
                            className={`backdrop-blur-sm ${statusFilter === "all"
                                ? "bg-primary text-black border-primary"
                                : "bg-card/80"
                                }`}
                        >
                            All Inactive ({stats.totalInactive})
                        </Button>
                        <Button
                            size="sm"
                            variant={statusFilter === "ended" ? "default" : "outline"}
                            onClick={() => setStatusFilter("ended")}
                            className={`backdrop-blur-sm ${statusFilter === "ended"
                                ? "bg-red-500 text-white border-red-500"
                                : "bg-card/80 border-red-500/50 text-red-400 hover:bg-red-500/10"
                                }`}
                        >
                            🔴 Ended ({stats.ended})
                        </Button>
                        <Button
                            size="sm"
                            variant={statusFilter === "resolved" ? "default" : "outline"}
                            onClick={() => setStatusFilter("resolved")}
                            className={`backdrop-blur-sm ${statusFilter === "resolved"
                                ? "bg-green-500 text-white border-green-500"
                                : "bg-card/80 border-green-500/50 text-green-400 hover:bg-green-500/10"
                                }`}
                        >
                            ✅ Resolved ({stats.resolved})
                        </Button>
                        <Button
                            size="sm"
                            variant={statusFilter === "disputed" ? "default" : "outline"}
                            onClick={() => setStatusFilter("disputed")}
                            className={`backdrop-blur-sm ${statusFilter === "disputed"
                                ? "bg-orange-500 text-white border-orange-500"
                                : "bg-card/80 border-orange-500/50 text-orange-400 hover:bg-orange-500/10"
                                }`}
                        >
                            ⚠️ Disputed ({stats.disputed})
                        </Button>
                    </div>

                    {/* Categories */}
                    <div className="flex flex-wrap gap-2 mb-10">
                        {CATEGORIES.map((cat) => (
                            <Button
                                key={cat}
                                size="sm"
                                variant={selectedCategory === cat ? "default" : "outline"}
                                onClick={() => setSelectedCategory(cat)}
                                className={`backdrop-blur-sm ${selectedCategory === cat
                                    ? "bg-primary text-black border-primary"
                                    : "bg-card/80"
                                    }`}
                            >
                                {cat}
                            </Button>
                        ))}
                    </div>

                    {/* Markets Grid */}
                    {isLoading && (
                        <div className="flex justify-center items-center py-20 backdrop-blur-sm bg-card/80 rounded-lg">
                            <LogoLoading size={64} />
                        </div>
                    )}

                    {error && !isLoading && (
                        <div className="bg-destructive/10 border border-destructive rounded-lg p-4 mb-6 backdrop-blur-sm">
                            <p className="text-destructive font-medium">Error loading markets</p>
                            <p className="text-destructive/80 text-sm mt-1">Something went wrong</p>
                            <Button onClick={refreshMarkets} variant="outline" size="sm" className="mt-2 bg-card/80">
                                Try Again
                            </Button>
                        </div>
                    )}

                    {!isLoading && !error && (
                        <>
                            {filteredMarkets.length > 0 ? (
                                <>
                                    <div className="mb-4 text-sm text-muted-foreground">
                                        Showing {filteredMarkets.length} of {stats.totalInactive} inactive markets
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {filteredMarkets.map((market) => {
                                            const marketKey = `${market.paymentToken}-${market.id}`;
                                            const isLoadingMarket = loadingMarketId === marketKey;

                                            return (
                                                <MarketCard
                                                    key={marketKey}
                                                    market={market}
                                                    disabled={!isConnected || !isCorrectNetwork || isLoadingMarket}
                                                    isLoading={isLoadingMarket}
                                                    onClick={() => handleMarketClick(market)}
                                                />
                                            );
                                        })}
                                    </div>
                                </>
                            ) : (
                                <div className="text-center py-16 bg-card/50 rounded-lg backdrop-blur-sm">
                                    <p className="text-muted-foreground text-lg mb-2">
                                        {stats.totalInactive === 0
                                            ? "No inactive markets yet."
                                            : "No markets match your filters."}
                                    </p>
                                    {stats.totalInactive > 0 && (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => {
                                                setSelectedCategory("All Markets")
                                                setSearchQuery("")
                                            }}
                                            className="mt-4 bg-card/80"
                                        >
                                            Clear All Filters
                                        </Button>
                                    )}
                                </div>
                            )}
                        </>
                    )}
                </div>

                <Footer />
            </div>
        </main>
    )
}
