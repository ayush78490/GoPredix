"use client"

import { useState, useMemo } from "react"
import Header from "@/components/header"
import MarketCard from "@/components/market-card"
import CreateMarketModal from "@/components/createMarketModal"
import { Button } from "@/components/ui/button"
import { Search, Loader2, Plus, Trophy, Info, Droplets, Coins } from "lucide-react"
import { useWeb3Context } from "@/lib/wallet-context"
import { useAllMarkets } from "@/hooks/getAllMarkets"
import Footer from "@/components/footer"
import LightRays from "@/components/LightRays"
import { useRouter } from "next/navigation"

const CATEGORIES = [
  "All Markets", "Politics", "Finance", "Crypto", "Sports", "Tech", "Economy", "General"
]

const PAYMENT_TOKEN_FILTERS = [
  { label: "All Tokens", value: null },
  { label: "🔶 BNB Only", value: "BNB" },
  { label: "💜 PDX Only", value: "PDX" }
]

const STATUS_FILTERS = [
  { label: "All Status", value: null },
  { label: "🟢 Active", value: "active" },
  { label: "🔴 Ended", value: "ended" },
  { label: "✅ Resolved", value: "resolved" }
]

// Helper: Extract category from question
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

// Helper: Calculate prices from pools
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

// Helper: Determine market status
const getMarketStatus = (market: any) => {
  const nowInSeconds = Math.floor(Date.now() / 1000)
  const endTimeInSeconds = Number(market.endTime)
  const contractStatus = Number(market.status)
  
  // Resolved
  if (contractStatus === 3) {
    return {
      isActive: false,
      isEnded: true,
      isResolved: true,
      statusLabel: "Resolved",
      statusColor: "green"
    }
  }
  
  // Disputed
  if (contractStatus === 4) {
    return {
      isActive: false,
      isEnded: true,
      isResolved: false,
      statusLabel: "Disputed",
      statusColor: "orange"
    }
  }
  
  // Resolution requested
  if (contractStatus === 2) {
    return {
      isActive: false,
      isEnded: true,
      isResolved: false,
      statusLabel: "Resolution Requested",
      statusColor: "yellow"
    }
  }
  
  // Time expired
  if (nowInSeconds >= endTimeInSeconds) {
    return {
      isActive: false,
      isEnded: true,
      isResolved: false,
      statusLabel: "Ended",
      statusColor: "red"
    }
  }
  
  // Active
  if (contractStatus === 0) {
    return {
      isActive: true,
      isEnded: false,
      isResolved: false,
      statusLabel: "Active",
      statusColor: "green"
    }
  }
  
  // Closed
  return {
    isActive: false,
    isEnded: true,
    isResolved: false,
    statusLabel: "Closed",
    statusColor: "red"
  }
}

// Helper: Convert raw market to frontend format
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
    paymentToken: market.paymentToken || "BNB", // Ensure payment token is set
    ...statusInfo
  }
}

export default function MarketsPage() {
  const [selectedCategory, setSelectedCategory] = useState("All Markets")
  const [searchQuery, setSearchQuery] = useState("")
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showHowItWorks, setShowHowItWorks] = useState(false)
  const [selectedPaymentToken, setSelectedPaymentToken] = useState<"BNB" | "PDX" | null>(null)
  const [selectedStatus, setSelectedStatus] = useState<"active" | "ended" | "resolved" | null>(null)
  const [loadingMarketId, setLoadingMarketId] = useState<string | null>(null)

  const router = useRouter()
  const { account, connectWallet, isCorrectNetwork } = useWeb3Context()
  const { 
    markets, 
    isLoading, 
    error, 
    refreshMarkets,
  } = useAllMarkets()

  // Format markets with proper payment token info
  const formattedMarkets = useMemo(() => {
    return markets.map(m => convertToFrontendMarket(m))
  }, [markets])

  // Filter markets
  const filteredMarkets = useMemo(() => {
    return formattedMarkets.filter((market) => {
      const cat = (market.category || "general").toLowerCase()
      const matchesCategory =
        selectedCategory.toLowerCase() === "all markets" || cat === selectedCategory.toLowerCase()
      const matchesSearch = market.question.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesPaymentToken = selectedPaymentToken === null || market.paymentToken === selectedPaymentToken
      
      let matchesStatus = true
      if (selectedStatus === "active") {
        matchesStatus = market.isActive === true
      } else if (selectedStatus === "ended") {
        matchesStatus = market.isEnded === true && market.isResolved === false
      } else if (selectedStatus === "resolved") {
        matchesStatus = market.isResolved === true
      }
      
      return matchesCategory && matchesSearch && matchesPaymentToken && matchesStatus
    })
  }, [formattedMarkets, selectedCategory, searchQuery, selectedPaymentToken, selectedStatus])

  // Calculate statistics
  const stats = useMemo(() => {
    const bnbCount = formattedMarkets.filter(m => m.paymentToken === "BNB").length
    const pdxCount = formattedMarkets.filter(m => m.paymentToken === "PDX").length
    const activeCount = formattedMarkets.filter(m => m.isActive === true).length
    const endedCount = formattedMarkets.filter(m => m.isEnded === true && m.isResolved === false).length
    const resolvedCount = formattedMarkets.filter(m => m.isResolved === true).length
    
    return {
      bnbMarketCount: bnbCount,
      pdxMarketCount: pdxCount,
      totalMarkets: formattedMarkets.length,
      activeMarkets: activeCount,
      endedMarkets: endedCount,
      resolvedMarkets: resolvedCount
    }
  }, [formattedMarkets])

  const handleFaucet = () => {
    router.push("/faucetPDX")
  }

  const handleHowItWorks = () => {
    router.push("/leaderboard")
  }

  const handleMarketClick = (market: any) => {
    if (!account || !isCorrectNetwork) return;
    
    // Set loading state for this specific market
    const marketKey = `${market.paymentToken}-${market.id}`;
    setLoadingMarketId(marketKey);
    
    // Navigate to market detail page
    router.push(`/markets/${marketKey}`);
  }


  return (
    <main className="min-h-screen bg-background relative overflow-hidden">
      {/* Light background animation */}
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

      {/* Content */}
      <div className="relative z-10 bg-black/80 min-h-screen">
        <Header />

        <div className="max-w-7xl mx-auto px-4 py-8 ">
          {/* Top section */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 mt-[10vh]">
            <div>
              <h1 className="text-4xl font-bold mb-2 text-white">All Markets</h1>
              <div className="text-sm text-muted-foreground space-x-4 flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-1">
                  <span className="font-semibold text-foreground">{stats.totalMarkets}</span> Total
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="font-semibold text-yellow-400">{stats.bnbMarketCount}</span> BNB
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="font-semibold text-purple-400">{stats.pdxMarketCount}</span> PDX
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="font-semibold text-green-400">{stats.activeMarkets}</span> Active
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="font-semibold text-red-400">{stats.endedMarkets}</span> Ended
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="font-semibold text-blue-400">{stats.resolvedMarkets}</span> Resolved
                </span>
              </div>
            </div>

            <div className="flex flex-wrap gap-3 mt-4 md:mt-0">
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

              <Button
                onClick={() => {
                  if (!account) {
                    connectWallet()
                  } else {
                    setShowCreateModal(true)
                  }
                }}
                className="bg-primary text-black hover:bg-primary/90 font-semibold"
                disabled={!account}
              >
                <Plus className="w-5 h-5 mr-2" /> Create Market
              </Button>
            </div>
          </div>

          {/* Network Warning */}
          {account && !isCorrectNetwork && (
            <div className="bg-yellow-500/10 border border-yellow-500/50 rounded-lg p-4 mb-6 backdrop-blur-sm">
              <div className="flex items-center">
                <Trophy className="w-5 h-5 text-yellow-500 mr-2" />
                <p className="text-yellow-500 font-medium">Wrong Network</p>
              </div>
              <p className="text-yellow-400/80 text-sm mt-1">
                Please switch to BSC Testnet to trade or create markets.
              </p>
            </div>
          )}

          {/* Search Bar */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search markets by question or category..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-black/10 border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary backdrop-blur-sm"
              />
            </div>
          </div>

          {/* Categories */}
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-10">
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((cat) => (
                <Button
                  key={cat}
                  size="sm"
                  variant={selectedCategory === cat ? "default" : "outline"}
                  onClick={() => setSelectedCategory(cat)}
                  className={`backdrop-blur-sm ${
                    selectedCategory === cat 
                      ? "bg-primary text-black border-primary" 
                      : "bg-card/80"
                  }`}
                >
                  {cat}
                </Button>
              ))}
            </div>
            
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={handleFaucet}
                size="sm"
                variant="outline"
                className="backdrop-blur-sm bg-card/80"
              >
                <Droplets className="w-4 h-4 mr-2" />
                Faucet PDX
              </Button>
              
              <Button
                onClick={handleHowItWorks}
                size="sm"
                variant="outline"
                className="backdrop-blur-sm bg-card/80"
              >
                <Info className="w-4 h-4 mr-2" />
                Leaderboard
              </Button>
            </div>
          </div>

          {/* Loading State */}
          {isLoading && (
            <div className="flex justify-center items-center py-12 backdrop-blur-sm bg-card/80 rounded-lg">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <span className="ml-3 text-muted-foreground">Loading markets from GoPredix...</span>
            </div>
          )}

          {/* Error State */}
          {error && !isLoading && (
            <div className="bg-destructive/10 border border-destructive rounded-lg p-4 mb-6 backdrop-blur-sm">
              <p className="text-destructive font-medium"> Error loading markets</p>
              <p className="text-destructive/80 text-sm mt-1">something went wrong</p>
              <Button onClick={refreshMarkets} variant="outline" size="sm" className="mt-2 bg-card/80">
                Try Again
              </Button>
            </div>
          )}

          {/* Market Grid */}
          {!isLoading && !error && (
            <>
              {filteredMarkets.length > 0 ? (
                <>
                  <div className="mb-4 text-sm text-muted-foreground">
                    Showing {filteredMarkets.length} of {stats.totalMarkets} markets
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredMarkets.map((market) => {
                      const marketKey = `${market.paymentToken}-${market.id}`;
                      const isLoadingMarket = loadingMarketId === marketKey;
                      
                      return (
                        <MarketCard
                          key={marketKey}
                          market={market}
                          disabled={!account || !isCorrectNetwork || isLoadingMarket}
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
                    {stats.totalMarkets === 0 
                      ? " No markets yet. Be the first to create one!" 
                      : " No markets match your filters."}
                  </p>
                  {stats.totalMarkets > 0 && (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        setSelectedCategory("All Markets")
                        setSearchQuery("")
                        setSelectedPaymentToken(null)
                        setSelectedStatus(null)
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

        {/* Create Market Modal */}
        {showCreateModal && (
          <CreateMarketModal
            onClose={() => setShowCreateModal(false)}
            onSuccess={() => {
              setShowCreateModal(false)
              refreshMarkets()
            }}
          />
        )}
      </div>
    </main>
  )
}