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

// Payment token filter options
const PAYMENT_TOKEN_FILTERS = [
  { label: "All Tokens", value: null },
  { label: "🔶 BNB Only", value: "BNB" },
  { label: "💜 PDX Only", value: "PDX" }
]

// --- Helper functions ---
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

const convertToFrontendMarket = (market: any) => {
  const prices = calculatePrices(market.yesPool, market.noPool)
  const now = new Date()
  const endTime = new Date(market.endTime * 1000)
  
  return {
    ...market,
    category: market.category || extractCategory(market.question),
    yesPrice: prices.yesPrice,
    noPrice: prices.noPrice,
    yesMultiplier: prices.yesPrice > 0 ? 100 / prices.yesPrice : 0,
    noMultiplier: prices.noPrice > 0 ? 100 / prices.noPrice : 0,
    isActive: market.status === 0 && endTime > now,
    paymentToken: market.paymentToken || "BNB"
  }
}

// --- Page Component ---
export default function MarketsPage() {
  const [selectedCategory, setSelectedCategory] = useState("All Markets")
  const [searchQuery, setSearchQuery] = useState("")
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showHowItWorks, setShowHowItWorks] = useState(false)
  const [selectedPaymentToken, setSelectedPaymentToken] = useState<"BNB" | "PDX" | null>(null)

  const router = useRouter()
  const { account, connectWallet, isCorrectNetwork } = useWeb3Context()
  const { 
    markets, 
    isLoading, 
    error, 
    refreshMarkets,
    getBNBMarkets,
    getPDXMarkets,
    getActiveMarkets,
  } = useAllMarkets()

  // ✅ FIXED: Use useMemo to prevent recalculation on every render
  const formattedMarkets = useMemo(() => {
    return markets.map(m => convertToFrontendMarket(m))
  }, [markets])

  // ✅ FIXED: Use useMemo for filtered markets too
  const filteredMarkets = useMemo(() => {
    return formattedMarkets.filter((market) => {
      const cat = (market.category || "general").toLowerCase()
      const matchesCategory =
        selectedCategory.toLowerCase() === "all markets" || cat === selectedCategory.toLowerCase()
      const matchesSearch = market.question.toLowerCase().includes(searchQuery.toLowerCase())
      
      // Filter by payment token
      const matchesPaymentToken = selectedPaymentToken === null || market.paymentToken === selectedPaymentToken
      
      return matchesCategory && matchesSearch && matchesPaymentToken
    })
  }, [formattedMarkets, selectedCategory, searchQuery, selectedPaymentToken])

  // ✅ FIXED: Use useMemo for statistics
  const stats = useMemo(() => {
  const bnbCount = markets.filter(m => m.paymentToken === "BNB").length
  const pdxCount = markets.filter(m => m.paymentToken === "PDX").length
  const activeCount = markets.filter(m => m.status === 0 && m.endTime > Math.floor(Date.now() / 1000)).length
  
  return {
    bnbMarketCount: bnbCount,
    pdxMarketCount: pdxCount,
    totalMarkets: markets.length,
    activeMarkets: activeCount
  }
}, [markets])  // ✅ Only depends on markets!


  const handleFaucet = () => {
    router.push("/faucetPDX")
  }

  const handleHowItWorks = () => {
    setShowHowItWorks(true)
    console.log("How it Works clicked")
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

        <div className="max-w-7xl mx-auto px-4 py-8">
          {/* Top section */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10">
            <div>
              <h1 className="text-4xl font-bold mb-2 text-white">All Markets</h1>
              {/* Market statistics */}
              <div className="text-sm text-muted-foreground space-x-4 flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-1">
                  <span className="font-semibold text-foreground">{stats.totalMarkets}</span> Total Markets
                </span>
                <span className="inline-flex items-center gap-1">
                  🔶 <span className="font-semibold text-yellow-400">{stats.bnbMarketCount}</span> BNB
                </span>
                <span className="inline-flex items-center gap-1">
                  💜 <span className="font-semibold text-purple-400">{stats.pdxMarketCount}</span> PDX
                </span>
                <span className="inline-flex items-center gap-1">
                  🟢 <span className="font-semibold text-green-400">{stats.activeMarkets}</span> Active
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

          {/* Network Warning for Connected Users */}
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

          {/* Payment Token Filter */}
          <div className="mb-6">
            <div className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
              <Coins className="w-4 h-4" />
              Filter by Payment Token
            </div>
            <div className="flex flex-wrap gap-2">
              {PAYMENT_TOKEN_FILTERS.map((filter) => (
                <Button
                  key={filter.label}
                  size="sm"
                  variant={selectedPaymentToken === filter.value ? "default" : "outline"}
                  onClick={() => setSelectedPaymentToken(filter.value as "BNB" | "PDX" | null)}
                  className={`backdrop-blur-sm ${
                    selectedPaymentToken === filter.value 
                      ? "bg-primary text-black border-primary" 
                      : "bg-card/80"
                  }`}
                >
                  {filter.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Categories with action buttons */}
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
                How it Works
              </Button>
            </div>
          </div>

          {/* Loading State */}
          {isLoading && (
            <div className="flex justify-center items-center py-12 backdrop-blur-sm bg-card/80 rounded-lg">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <span className="ml-3 text-muted-foreground">Loading markets from blockchain...</span>
            </div>
          )}

          {/* Error State */}
          {error && !isLoading && (
            <div className="bg-destructive/10 border border-destructive rounded-lg p-4 mb-6 backdrop-blur-sm">
              <p className="text-destructive font-medium">⚠️ Error loading markets</p>
              <p className="text-destructive/80 text-sm mt-1">{error}</p>
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
                    {filteredMarkets.map((market) => (
                      <MarketCard
                        key={`${market.paymentToken}-${market.id}`}
                        market={market}
                        disabled={!account || !isCorrectNetwork}
                      />
                    ))}
                  </div>
                </>
              ) : (
                <div className="text-center py-16 bg-card/50 rounded-lg backdrop-blur-sm">
                  <p className="text-muted-foreground text-lg mb-2">
                    {stats.totalMarkets === 0 
                      ? "🚀 No markets yet. Be the first to create one!" 
                      : "🔍 No markets match your filters."}
                  </p>
                  {stats.totalMarkets > 0 && (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        setSelectedCategory("All Markets")
                        setSearchQuery("")
                        setSelectedPaymentToken(null)
                      }}
                      className="mt-4 bg-card/80"
                    >
                      Clear Filters
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