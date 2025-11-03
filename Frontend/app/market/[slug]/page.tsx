"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import Header from "@/components/header"
import TradeModal from "@/components/trade-modal"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { ArrowLeft, Volume2, TrendingUp, Loader2 } from "lucide-react"
import Link from "next/link"
import { usePredictionMarket, MarketStatus } from "@/hooks/use-predection-market" // or use-web3 depending on your setup

// Helper function to extract category from question (same as in home page)
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

// Convert on-chain market to frontend market format (same as in home page)
const convertToFrontendMarket = (market: any, id: number) => {
  const category = extractCategory(market.question)
  const resolutionDate = new Date(market.endTime * 1000)

  return {
    id: id.toString(),
    title: market.question.length > 60 ? market.question.substring(0, 60) + "..." : market.question,
    description: market.question,
    category,
    yesOdds: market.yesPrice || 50,
    noOdds: market.noPrice || 50,
    volume: parseFloat(market.totalBacking) * 2000, // Adjust multiplier as needed
    resolutionDate: resolutionDate.toISOString(),
    slug: `market-${id}`,
    onChainData: market,
    status: market.status,
    isActive: market.status === MarketStatus.Open && resolutionDate > new Date()
  }
}

export default function MarketPage() {
  const params = useParams()
  const marketSlug = params.slug as string
  
  const [market, setMarket] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [outcome, setOutcome] = useState<"YES" | "NO" | null>(null)
  const [showModal, setShowModal] = useState(false)

  const { getMarket, getAllMarkets, isContractReady } = usePredictionMarket()

  // Extract market ID from slug (market-0, market-1, etc.)
  const marketId = marketSlug ? parseInt(marketSlug.replace('market-', '')) : -1

  // Load market data from blockchain
  useEffect(() => {
    const loadMarketData = async () => {
      if (!isContractReady || marketId === -1) {
        setIsLoading(false)
        return
      }

      try {
        setIsLoading(true)
        setError(null)

        console.log(`Loading market ${marketId} from blockchain...`)
        
        // Option 1: Get specific market by ID
        const onChainMarket = await getMarket(marketId)
        const formattedMarket = convertToFrontendMarket(onChainMarket, marketId)
        setMarket(formattedMarket)
        
        console.log("Market loaded successfully:", formattedMarket)
        
      } catch (err: any) {
        console.error("Failed to load market:", err)
        setError(err.message || "Failed to load market from blockchain")
        
        // Fallback: Try to find market in all markets
        try {
          console.log("Trying fallback: loading all markets...")
          const allMarkets = await getAllMarkets()
          const foundMarket = allMarkets.find((m: any, index: number) => 
            `market-${index}` === marketSlug
          )
          if (foundMarket) {
            const formattedMarket = convertToFrontendMarket(foundMarket, marketId)
            setMarket(formattedMarket)
            setError(null)
          }
        } catch (fallbackError) {
          console.error("Fallback also failed:", fallbackError)
        }
      } finally {
        setIsLoading(false)
      }
    }

    loadMarketData()
  }, [marketId, marketSlug, isContractReady, getMarket, getAllMarkets])

  // Loading state
  if (isLoading) {
    return (
      <main className="min-h-screen bg-background">
        <Header />
        <div className="max-w-5xl mx-auto px-4 py-8">
          <div className="flex justify-center items-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <span className="ml-2 text-muted-foreground">Loading market from blockchain...</span>
          </div>
        </div>
      </main>
    )
  }

  // Error state
  if (error && !market) {
    return (
      <main className="min-h-screen bg-background">
        <Header />
        <div className="max-w-5xl mx-auto px-4 py-8">
          <Link href="/">
            <Button variant="ghost" className="mb-6 -ml-4 gap-2 text-muted-foreground hover:text-foreground">
              <ArrowLeft className="w-4 h-4" />
              Back to Markets
            </Button>
          </Link>
          
          <div className="bg-destructive/10 border border-destructive rounded-lg p-6 text-center">
            <p className="text-destructive font-medium">Error loading market</p>
            <p className="text-destructive/80 text-sm mt-1">{error}</p>
            <Button onClick={() => window.location.reload()} variant="outline" className="mt-4">
              Try Again
            </Button>
          </div>
        </div>
      </main>
    )
  }

  // Market not found state
  if (!market) {
    return (
      <main className="min-h-screen bg-background">
        <Header />
        <div className="max-w-5xl mx-auto px-4 py-8">
          <Link href="/">
            <Button variant="ghost" className="mb-6 -ml-4 gap-2 text-muted-foreground hover:text-foreground">
              <ArrowLeft className="w-4 h-4" />
              Back to Markets
            </Button>
          </Link>
          
          <div className="text-center py-12">
            <p className="text-muted-foreground text-lg">Market not found.</p>
            <p className="text-sm text-muted-foreground mt-2">
              Market ID: {marketId} | Slug: {marketSlug}
            </p>
            <Link href="/">
              <Button variant="outline" className="mt-4 bg-transparent">
                Back to All Markets
              </Button>
            </Link>
          </div>
        </div>
      </main>
    )
  }

  const resolutionDate = new Date(market.resolutionDate)
  const daysLeft = Math.max(0, Math.ceil((resolutionDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)))
  
  const formatVolume = (vol: number) => {
    if (vol >= 1000000) return `$${(vol / 1000000).toFixed(1)}m`
    if (vol >= 1000) return `$${(vol / 1000).toFixed(1)}k`
    return `$${vol}`
  }

  const handleOpenModal = (selectedOutcome: "YES" | "NO") => {
    setOutcome(selectedOutcome)
    setShowModal(true)
  }

  const handleCloseModal = () => {
    setShowModal(false)
    setOutcome(null)
  }

  return (
    <main className="min-h-screen bg-background">
      <Header />

      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Back Button */}
        <Link href="/">
          <Button variant="ghost" className="mb-6 -ml-4 gap-2 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-4 h-4" />
            Back to Markets
          </Button>
        </Link>

        {/* Connection Status */}
        {!isContractReady && (
          <div className="mb-6 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-yellow-700 text-sm">
              ⚠️ Not connected to blockchain. Some features may be limited.
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Category Badge */}
            <div className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-semibold">
              {market.category}
            </div>

            {/* Title */}
            <h1 className="text-4xl font-bold text-balance">{market.title}</h1>

            {/* Description */}
            <p className="text-lg text-muted-foreground">{market.description}</p>

            {/* Market Status */}
            <div className="inline-block px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              {market.isActive ? 'Active' : market.status === MarketStatus.Resolved ? 'Resolved' : 'Closed'}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-4">
              <Card className="p-4">
                <div className="text-sm text-muted-foreground mb-1 flex items-center gap-1">
                  <Volume2 className="w-4 h-4" />
                  Trading Volume
                </div>
                <p className="text-2xl font-bold">{formatVolume(market.volume)}</p>
              </Card>
              <Card className="p-4">
                <div className="text-sm text-muted-foreground mb-1 flex items-center gap-1">
                  <TrendingUp className="w-4 h-4" />
                  Days Remaining
                </div>
                <p className="text-2xl font-bold">{daysLeft}d</p>
              </Card>
            </div>

            {/* Resolution Date */}
            <Card className="p-4 bg-muted">
              <p className="text-sm text-muted-foreground mb-1">Resolution Date</p>
              <p className="font-semibold">
                {resolutionDate.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
              </p>
            </Card>

            {/* On-Chain Data (Debug Info) */}
            <details className="mt-6 text-sm">
              <summary className="cursor-pointer text-muted-foreground">On-Chain Data (Debug)</summary>
              <pre className="mt-2 p-3 bg-muted rounded-lg overflow-auto text-xs">
                {JSON.stringify(market.onChainData, null, 2)}
              </pre>
            </details>
          </div>

          {/* Sidebar - Odds Card */}
          <div className="lg:col-span-1">
            <Card className="p-6 sticky top-8 space-y-6">
              <h2 className="text-xl font-bold">Current Odds</h2>

              {/* YES/NO Odds */}
              <div className="space-y-3">
                {/* YES */}
                <button
                  onClick={() => handleOpenModal("YES")}
                  disabled={!market.isActive}
                  className={`w-full p-4 rounded-lg border-2 transition-all ${
                    outcome === "YES"
                      ? "border-green-500 bg-green-950/30"
                      : market.isActive
                      ? "border-green-900 bg-green-950/10 hover:bg-green-950/20"
                      : "border-gray-400 bg-gray-100 cursor-not-allowed"
                  }`}
                >
                  <div className="text-left">
                    <div className="text-sm text-muted-foreground mb-1">YES</div>
                    <div className="text-3xl font-bold text-green-500">{market.yesOdds}%</div>
                    <div className="text-xs text-green-400 mt-1">${(market.yesOdds / 100).toFixed(2)} per token</div>
                    {!market.isActive && (
                      <div className="text-xs text-red-400 mt-1">Market closed</div>
                    )}
                  </div>
                </button>

                {/* NO */}
                <button
                  onClick={() => handleOpenModal("NO")}
                  disabled={!market.isActive}
                  className={`w-full p-4 rounded-lg border-2 transition-all ${
                    outcome === "NO"
                      ? "border-red-500 bg-red-950/30"
                      : market.isActive
                      ? "border-red-900 bg-red-950/10 hover:bg-red-950/20"
                      : "border-gray-400 bg-gray-100 cursor-not-allowed"
                  }`}
                >
                  <div className="text-left">
                    <div className="text-sm text-muted-foreground mb-1">NO</div>
                    <div className="text-3xl font-bold text-red-500">{market.noOdds}%</div>
                    <div className="text-xs text-red-400 mt-1">${(market.noOdds / 100).toFixed(2)} per token</div>
                    {!market.isActive && (
                      <div className="text-xs text-red-400 mt-1">Market closed</div>
                    )}
                  </div>
                </button>
              </div>

              {/* Trade Info */}
              {outcome && market.isActive && (
                <div className="pt-4 border-t border-border">
                  <p className="text-xs text-muted-foreground text-center">
                    Click the button below to place your order
                  </p>
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>

      {/* Trade Modal */}
      {showModal && market.isActive && (
        <TradeModal 
          market={market} 
          outcome={outcome} 
          onOutcomeChange={setOutcome} 
          onClose={handleCloseModal} 
        />
      )}
    </main>
  )
}