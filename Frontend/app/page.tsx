"use client"

import { useState, useEffect } from "react"
import Header from "@/components/header"
import MarketCard from "@/components/market-card"
import CreateMarketModal from "../components/createMarketModal"
import { Button } from "@/components/ui/button"
import { Search, Loader2, Plus, Wallet, Trophy } from "lucide-react"
import { useWeb3Context } from "@/lib/wallet-context"
import { usePredictionMarket } from "@/hooks/use-predection-market"
import { useAllMarkets } from "@/hooks/getAllMarkets" 
import Footer from "@/components/footer"
import { useRouter } from "next/navigation"
import LightRays from "@/components/LightRays"


const CATEGORIES = [
  "All Markets",
  "Politics",
  "Finance",
  "Crypto",
  "Sports",
  "Tech",
  "Economy",
  "General"
]

// Helper function to extract category from question
const extractCategory = (question: string): string => {
  const lowerQuestion = question.toLowerCase()

  if (lowerQuestion.includes('bitcoin') || lowerQuestion.includes('crypto') || lowerQuestion.includes('ethereum'))
    return "Crypto"
  if (lowerQuestion.includes('election') || lowerQuestion.includes('president') || lowerQuestion.includes('politics'))
    return "Politics"
  if (lowerQuestion.includes('stock') || lowerQuestion.includes('finance') || lowerQuestion.includes('market'))
    return "Finance"
  if (lowerQuestion.includes('sports') || lowerQuestion.includes('game') || lowerQuestion.includes('team'))
    return "Sports"
  if (lowerQuestion.includes('tech') || lowerQuestion.includes('ai') || lowerQuestion.includes('software'))
    return "Tech"
  if (lowerQuestion.includes('economy') || lowerQuestion.includes('gdp') || lowerQuestion.includes('inflation'))
    return "Economy"

  return "General"
}

// Calculate prices from pool data
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

// Convert market data to frontend format
const convertToFrontendMarket = (market: any) => {
  const category = market.category || extractCategory(market.question)
  const resolutionDate = new Date(market.endTime * 1000)
  const now = new Date()

  // Calculate prices from pool data
  const prices = calculatePrices(market.yesPool, market.noPool)

  // Return the exact Market interface expected by MarketCard
  return {
    id: market.id,
    creator: market.creator,
    question: market.question,
    category: market.category || "General",
    endTime: market.endTime,
    status: market.status,
    outcome: market.outcome,
    yesToken: market.yesToken,
    noToken: market.noToken,
    yesPool: market.yesPool,
    noPool: market.noPool,
    lpTotalSupply: market.lpTotalSupply,
    totalBacking: market.totalBacking,
    platformFees: market.platformFees,
    resolutionRequestedAt: market.resolutionRequestedAt,
    disputeDeadline: market.disputeDeadline,
    resolutionReason: market.resolutionReason,
    resolutionConfidence: market.resolutionConfidence,
    yesPrice: prices.yesPrice,
    noPrice: prices.noPrice,
    yesMultiplier: prices.yesPrice > 0 ? 100 / prices.yesPrice : 0,
    noMultiplier: prices.noPrice > 0 ? 100 / prices.noPrice : 0,
    // Add the missing properties for filtering
    isActive: market.status === 0 && resolutionDate > now
  }
}

export default function Home() {
  const [selectedCategory, setSelectedCategory] = useState("All Markets")
  const [searchQuery, setSearchQuery] = useState("")
  const [showCreateModal, setShowCreateModal] = useState(false)
  const router = useRouter()

  const { account, connectWallet, isCorrectNetwork, isConnecting, error: web3Error, isInitialized } = useWeb3Context()
  const { createMarket } = usePredictionMarket()
  const { markets, isLoading, error, refreshMarkets } = useAllMarkets()

  // Convert markets to frontend format
  const formattedMarkets = markets.map(market => convertToFrontendMarket(market))

  // Normalize category strings to lowercase for comparison
  const normalizedSelectedCategory = selectedCategory.toLowerCase()

  // Filter markets based on category and search (case-insensitive)
  const filteredMarkets = formattedMarkets.filter((market) => {
    const marketCategory = (market.category || "general").toLowerCase()

    const matchesCategory =
      normalizedSelectedCategory === "all markets" ||
      marketCategory === normalizedSelectedCategory

    const matchesSearch = market.question.toLowerCase().includes(searchQuery.toLowerCase())

    return matchesCategory && matchesSearch
  })

  // Handle market creation success
  const handleMarketCreated = (marketId: number) => {
    setShowCreateModal(false)
    // Refresh markets to show the new one
    refreshMarkets()
  }

  // Handle leaderboard navigation
  const handleLeaderboardClick = () => {
    router.push('/leaderboard')
  }

  // Debug logging
  useEffect(() => {
  }, [isInitialized, account, isCorrectNetwork, markets.length, isLoading, error])

  return (
    <main className="min-h-screen bg-background relative overflow-hidden">
      {/* Light Rays Background */}
      <div className="fixed inset-0 z-0">
        <LightRays
          raysOrigin="top-center"
          raysColor="#6366f1" // Using your primary color
          raysSpeed={1.5}
          lightSpread={0.8}
          rayLength={1.2}
          followMouse={true}
          mouseInfluence={0.1}
          noiseAmount={0.1}
          distortion={0.05}
        />
      </div>

      {/* Content overlay for better readability */}
      <div className="relative z-10 bg-black/80 min-h-screen">
        <Header />

        <div className="max-w-7xl mx-auto px-4 py-8">
          {/* Hero Section */}
          {account && (
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12">
              <div>
                <h1 className="text-4xl md:text-5xl font-bold mb-3 text-balance">Predict Market Outcomes</h1>
                <p className="text-lg text-muted-foreground max-w-2xl">
                  Trade your predictions on major events. Buy YES or NO tokens based on your beliefs about the future.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 mt-4 md:mt-0">
                <Button
                  onClick={handleLeaderboardClick}
                  size="lg"
                  variant="outline"
                  className="border-primary text-primary hover:bg-primary hover:text-black backdrop-blur-sm bg-card/80"
                >
                  <Trophy className="w-5 h-5 mr-2" />
                  Leaderboard
                </Button>
                <Button
                  onClick={() => setShowCreateModal(true)}
                  size="lg"
                  className="bg-black text-white hover:bg-black/90"
                  disabled={!account}
                >
                  <Plus className="w-5 h-5 mr-2" />
                  Create Market
                </Button>
              </div>
            </div>
          )}


          {/* Network Warning */}
          {account && !isCorrectNetwork && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg backdrop-blur-sm bg-card/80">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-red-800 font-semibold">Wrong Network</h3>
                  <p className="text-red-700 text-sm mt-1">
                    Please switch to the correct network to use this application.
                  </p>
                </div>
                <Button
                  onClick={() => window.ethereum?.request({
                    method: 'wallet_switchEthereumChain',
                    params: [{ chainId: '0x61' }],
                  })}
                  className="bg-red-600 text-white hover:bg-red-700"
                >
                  Switch Network
                </Button>
              </div>
            </div>
          )}

          {/* Search and Filter */}
          {account && isCorrectNetwork && (
            <div className="mb-8 space-y-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white" />
                  <input
                    type="text"
                    placeholder="Search markets..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-black/10 border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary backdrop-blur-sm"
                  />
                </div>

                <Button
                  onClick={refreshMarkets}
                  disabled={isLoading}
                  variant="outline"
                  className="whitespace-nowrap backdrop-blur-sm bg-card/80"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    "Refresh Markets"
                  )}
                </Button>
              </div>

              {/* Categories */}
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map((category) => (
                  <Button
                    key={category}
                    variant={selectedCategory === category ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedCategory(category)}
                    className={`backdrop-blur-sm bg-card/80 ${
                      selectedCategory === category ? "bg-primary text-black" : ""
                    }`}
                  >
                    {category}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Rest of your existing component code remains the same */}
          {/* ... (keep all the other states and UI elements exactly as they were) ... */}

          {/* Initializing State */}
          {!isInitialized && (
            <div className="flex justify-center items-center py-12 backdrop-blur-sm bg-card/80 rounded-lg">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <span className="ml-2 text-muted-foreground">Initializing...</span>
            </div>
          )}

          {/* Wallet Not Connected State */}
          {!account && isInitialized && (
            <div className="flex flex-col items-center justify-center min-h-[60vh] ">
              {/* GOPREDIX header */}
              <h1 className="text-4xl md:text-5xl font-bold mb-10 tracking-widest text-white ">GOPREDIX</h1>
              {/* Centered design from reference image */}
              <div className="max-w-2xl w-full text-center flex flex-col items-center">
                <p className="text-base md:text-lg text-white mb-10" style={{ fontFamily: 'monospace' }}>
                  Predict the outcome of future events and earn rewards for your accuracy.
                  Create your own markets on any topic you can imagine.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 w-full justify-center">
                  <button
                    className="px-8 py-3 rounded-full bg-[#ECFEFF]/50 text-white font-medium text-lg shadow hover:bg-[#ECFEFF] hover:text-black transition"
                  >
                    Explore Markets
                  </button>
                  <button
                    className="px-8 py-3 rounded-full border border-[#ECFEFF]  font-medium text-lg text-white bg-transparent hover:bg-[#ECFEFF] hover:text-black transition"
                    onClick={() => {
                      if (!account) {
                        connectWallet();
                      } else {
                        setShowCreateModal(true);
                      }
                    }}
                  >
                    Create Market
                  </button>

                </div>
              </div>
            </div>
          )}






          {/* Empty State - No markets created yet */}
          {account && isCorrectNetwork && !isLoading && !error && formattedMarkets.length === 0 && (
            <div className="text-center py-16 border-2 border-dashed border-border rounded-lg backdrop-blur-sm bg-card/80">
              <div className="max-w-md mx-auto">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
                  <Plus className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="text-xl font-semibold mb-2">No markets yet</h3>
                <p className="text-muted-foreground mb-6">
                  Be the first to create a prediction market and start trading!
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Button
                    onClick={handleLeaderboardClick}
                    variant="outline"
                    className="border-primary text-primary hover:bg-primary hover:text-white backdrop-blur-sm bg-card/80"
                  >
                    <Trophy className="w-5 h-5 mr-2" />
                    View Leaderboard
                  </Button>
                  <Button
                    onClick={() => setShowCreateModal(true)}
                    size="lg"
                    className="bg-black text-white hover:bg-black/90"
                  >
                    <Plus className="w-5 h-5 mr-2" />
                    Create First Market
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Loading State */}
          {account && isCorrectNetwork && isLoading && (
            <div className="flex justify-center items-center py-12 backdrop-blur-sm bg-card/80 rounded-lg">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <span className="ml-2 text-muted-foreground">Loading markets from blockchain...</span>
            </div>
          )}

          {/* Error State */}
          {/* {account && isCorrectNetwork && error && !isLoading && (
            <div className="bg-destructive/10 border border-destructive rounded-lg p-4 mb-6 backdrop-blur-sm bg-card/80">
              <p className="text-destructive font-medium">Error loading markets</p>
              <p className="text-destructive/80 text-sm mt-1">{error}</p>
              <Button onClick={refreshMarkets} variant="outline" size="sm" className="mt-2 backdrop-blur-sm bg-card/80">
                Try Again
              </Button>
            </div>
          )} */}

          {/* Markets Grid */}
          {account && isCorrectNetwork && !isLoading && !error && formattedMarkets.length > 0 && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredMarkets.map((market) => (
                  <MarketCard key={market.id} market={market} />
                ))}
              </div>

              {filteredMarkets.length === 0 && (
                <div className="text-center py-12 backdrop-blur-sm bg-card/80 rounded-lg">
                  <p className="text-muted-foreground text-lg">No markets found matching your search.</p>
                </div>
              )}
            </>
          )}

          {/* Stats */}
          {account && isCorrectNetwork && !isLoading && !error && formattedMarkets.length > 0 && (
            <div className="mt-8 pt-6 border-t border-border">
              <div className="flex flex-wrap gap-6 text-sm text-muted-foreground">
                <div>
                  <span className="font-medium">{formattedMarkets.length}</span> total markets
                </div>
                <div>
                  <span className="font-medium">
                    {formattedMarkets.filter(m => m.isActive).length}
                  </span> active markets
                </div>
                <div>
                  <span className="font-medium">
                    {formattedMarkets.filter(m => m.status === 3).length}
                  </span> resolved
                </div>
              </div>
            </div>
          )}
        </div>

        <Footer/>

        {/* Create Market Modal */}
        {showCreateModal && (
          <CreateMarketModal
            onClose={() => setShowCreateModal(false)}
            onSuccess={handleMarketCreated}
          />
        )}
      </div>
    </main>
  )
}