"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import Header from "@/components/header"
import PriceChart from "@/components/price-chart"
import TradeModal from "@/components/trade-modal"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { ArrowLeft, Volume2, TrendingUp, Loader2, Calendar, User, Coins } from "lucide-react"
import Link from "next/link"
import { useAllMarkets } from "@/hooks/getAllMarkets"
import Footer from "@/components/footer"
import LightRays from "@/components/LightRays"

// Helper function to generate slug from question
export const generateSlug = (question: string, id: number | string): string => {
  const baseSlug = question
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .substring(0, 60)
    .replace(/-$/, '')
  
  return `${baseSlug}-${id}` || `market-${id}`
}

// Helper function to extract ID from slug
export const extractIdFromSlug = (slug: string): number | null => {
  if (!slug) return null
  
  if (/^\d+$/.test(slug)) {
    return parseInt(slug)
  }
  
  const idMatch = slug.match(/-(\d+)$/)
  if (idMatch) {
    return parseInt(idMatch[1])
  }
  
  return null
}

// Helper function to extract category from question
const extractCategory = (question = ""): string => {
  const lowerQuestion = question.toLowerCase()

  if (lowerQuestion.includes("bitcoin") || lowerQuestion.includes("crypto") || lowerQuestion.includes("ethereum") || lowerQuestion.includes("blockchain"))
    return "Crypto"
  if (lowerQuestion.includes("election") || lowerQuestion.includes("president") || lowerQuestion.includes("politics") || lowerQuestion.includes("government"))
    return "Politics"
  if (lowerQuestion.includes("stock") || lowerQuestion.includes("finance") || lowerQuestion.includes("market") || lowerQuestion.includes("investment"))
    return "Finance"
  if (lowerQuestion.includes("sports") || lowerQuestion.includes("game") || lowerQuestion.includes("team") || lowerQuestion.includes("tournament"))
    return "Sports"
  if (lowerQuestion.includes("tech") || lowerQuestion.includes("ai") || lowerQuestion.includes("software") || lowerQuestion.includes("technology"))
    return "Tech"
  if (lowerQuestion.includes("economy") || lowerQuestion.includes("gdp") || lowerQuestion.includes("inflation") || lowerQuestion.includes("economic"))
    return "Economy"
  if (lowerQuestion.includes("movie") || lowerQuestion.includes("entertainment") || lowerQuestion.includes("celebrity") || lowerQuestion.includes("film"))
    return "Entertainment"
  if (lowerQuestion.includes("science") || lowerQuestion.includes("health") || lowerQuestion.includes("research") || lowerQuestion.includes("medical"))
    return "Science"

  return "General"
}

// Convert on-chain market to frontend market format
const convertToFrontendMarket = (m: any, id: number | string) => {
  const question = m?.question ?? m?.title ?? `Market ${id}`
  const category = m?.category ? m.category.toUpperCase() : extractCategory(question)
  const endTime = Number(m?.endTime ?? m?.end_time ?? Math.floor(Date.now() / 1000))
  const resolutionDate = new Date(endTime * 1000)
  const now = new Date()
  const isActive = resolutionDate > now

  const totalBacking = parseFloat(m?.totalBacking ?? m?.volume ?? "0") || 0
  const yesPool = parseFloat(m?.yesPool ?? "0") || 0
  const noPool = parseFloat(m?.noPool ?? "0") || 0
  const totalPool = yesPool + noPool
  
  const yesOdds = totalPool > 0 ? (yesPool / totalPool) * 100 : 50
  const noOdds = totalPool > 0 ? (noPool / totalPool) * 100 : 50

  const slug = generateSlug(question, id)

  // Extract payment token
  const paymentToken = m?.paymentToken || "BNB"

  return {
    id: id.toString(),
    title: question,
    description: m?.description ?? question,
    category,
    yesOdds,
    noOdds,
    volume: totalBacking,
    resolutionDate: resolutionDate.toISOString(),
    slug,
    onChainData: m,
    status: m?.status ?? m?.state ?? null,
    isActive,
    daysLeft: Math.max(0, Math.ceil((resolutionDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))),
    creator: m?.creator || "Unknown",
    totalLiquidity: totalPool,
    paymentToken // BNB or PDX
  }
}

// Generate synthetic price history
const generatePriceHistory = (market: any, days: number = 7) => {
  const history = []
  const now = Date.now()
  const basePrice = market.yesOdds || 50
  const volatility = 5
  
  for (let i = days - 1; i >= 0; i--) {
    const time = now - (i * 24 * 60 * 60 * 1000)
    const randomChange = (Math.random() - 0.5) * volatility * 2
    const price = Math.max(10, Math.min(90, basePrice + randomChange))
    
    history.push({
      time,
      price: Number(price.toFixed(2))
    })
  }
  
  return history
}

// Get payment token badge
const getPaymentTokenBadge = (token: string) => {
  const tokenConfig: Record<string, any> = {
    "BNB": { 
      label: "BNB", 
      color: "bg-yellow-500/20 border-yellow-600/50 text-yellow-400",
      icon: "🔶"
    },
    "PDX": { 
      label: "PDX", 
      color: "bg-purple-500/20 border-purple-600/50 text-purple-400",
      icon: "💜"
    }
  }

  const config = tokenConfig[token] || tokenConfig["BNB"]
  return (
    <div className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold border ${config.color} backdrop-blur-sm`}>
      <span>{config.icon}</span>
      {config.label}
    </div>
  )
}

export default function MarketPage() {
  const params = useParams()
  const marketSlug = params?.slug as string

  const [market, setMarket] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [outcome, setOutcome] = useState<"YES" | "NO" | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [chartData, setChartData] = useState<any[]>([])
  const [isChartLoading, setIsChartLoading] = useState(true)

  const { markets: allMarkets, isLoading: marketsLoading, getAllMarkets, isContractReady } = useAllMarkets()

  // Extract market ID from slug and find the correct market
  useEffect(() => {
    let cancelled = false

    const loadMarketData = async () => {
      if (!marketSlug) {
        setIsLoading(false)
        return
      }

      setIsLoading(true)
      setError(null)

      try {
        let marketsToSearch = allMarkets
        
        // Fetch markets if not already loaded
        if (allMarkets.length === 0 && !marketsLoading) {
          console.log("📋 No markets in cache, fetching from blockchain...")
          marketsToSearch = await getAllMarkets()
        }

        if (cancelled) return

        let foundMarket: any = null
        let foundId: number = -1

        const extractedId = extractIdFromSlug(marketSlug)

        // Try direct ID match first
        if (extractedId !== null && extractedId >= 0) {
          const market = marketsToSearch.find((m: any) => m.id === extractedId.toString())
          if (market) {
            foundMarket = convertToFrontendMarket(market, extractedId)
            foundId = extractedId
          }
        }

        // If not found by ID, search by slug
        if (!foundMarket) {
          for (let i = 0; i < marketsToSearch.length; i++) {
            const marketData = marketsToSearch[i]
            const formatted = convertToFrontendMarket(marketData, i)
            if (formatted.slug === marketSlug) {
              foundMarket = formatted
              foundId = i
              break
            }
          }
        }

        if (foundMarket) {
          setMarket(foundMarket)
          setError(null)
          
          const priceHistory = generatePriceHistory(foundMarket)
          setChartData(priceHistory)
          setIsChartLoading(false)
          
          console.log(`✅ Found market: "${foundMarket.title}" (${foundMarket.paymentToken})`)
        } else {
          setError(`Market not found. Slug: ${marketSlug}`)
          console.warn(`❌ Market not found with slug: ${marketSlug}`)
        }
      } catch (err: any) {
        console.error("❌ Failed to load market:", err)
        setError(err?.message ?? "Failed to load market")
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    loadMarketData()
    return () => {
      cancelled = true
    }
  }, [marketSlug, allMarkets, marketsLoading, getAllMarkets])

  // Update chart when market changes
  useEffect(() => {
    if (market && !isChartLoading) {
      const newChartData = generatePriceHistory(market)
      setChartData(newChartData)
    }
  }, [market?.yesOdds])

  // UI helpers
  const formatVolume = (vol: number) => {
    if (vol >= 1000000) return `$${(vol / 1000000).toFixed(1)}m`
    if (vol >= 1000) return `$${(vol / 1000).toFixed(1)}k`
    return `$${(vol || 0).toFixed(2)}`
  }

  const formatAddress = (addr: string) => {
    if (!addr) return "Unknown"
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`
  }

  const handleOpenModal = (o: "YES" | "NO") => {
    setOutcome(o)
    setShowModal(true)
  }

  const handleCloseModal = () => {
    setShowModal(false)
    setOutcome(null)
  }

  const resolutionDate = market ? new Date(market.resolutionDate) : new Date()
  
  const getStatusBadge = () => {
    if (market?.isActive) return { text: "Active", color: "bg-green-500/20 border-green-600/50 text-green-400" }
    if (market?.status === 3) return { text: "Resolved", color: "bg-blue-500/20 border-blue-600/50 text-blue-400" }
    if (market?.status === 1) return { text: "Closed", color: "bg-gray-500/20 border-gray-600/50 text-gray-400" }
    return { text: "Inactive", color: "bg-yellow-500/20 border-yellow-600/50 text-yellow-400" }
  }

  const statusBadge = getStatusBadge()

  // Show loading if markets are still loading
  if (marketsLoading && !market) {
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
            mouseInfluence={0.1}
            noiseAmount={0.1}
            distortion={0.05}
          />
        </div>
        <div className="relative z-10">
          <Header />
          <div className="max-w-6xl mx-auto px-4 py-12">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-muted-foreground">Loading markets from blockchain...</p>
            </div>
          </div>
        </div>
      </main>
    )
  }

  // Loading / error / not found UI
  if (isLoading) {
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
            mouseInfluence={0.1}
            noiseAmount={0.1}
            distortion={0.05}
          />
        </div>
        <div className="relative z-10">
          <Header />
          <div className="max-w-6xl mx-auto px-4 py-12">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-muted-foreground">Loading market details...</p>
            </div>
          </div>
        </div>
      </main>
    )
  }

  if (error && !market) {
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
            mouseInfluence={0.1}
            noiseAmount={0.1}
            distortion={0.05}
          />
        </div>
        <div className="relative z-10">
          <Header />
          <div className="max-w-6xl mx-auto px-4 py-8">
            <Link href="/">
              <Button variant="ghost" className="mb-6 -ml-4 gap-2 text-muted-foreground hover:text-foreground backdrop-blur-sm bg-card/80">
                <ArrowLeft className="w-4 h-4" />
                Back to Markets
              </Button>
            </Link>

            <div className="bg-destructive/10 border border-destructive rounded-lg p-6 text-center backdrop-blur-sm bg-card/80">
              <p className="text-destructive font-medium">❌ Error loading market</p>
              <p className="text-destructive/80 text-sm mt-1">{error}</p>
              <Button onClick={() => window.location.reload()} variant="outline" className="mt-4 backdrop-blur-sm bg-card/80">
                Try Again
              </Button>
            </div>
          </div>
        </div>
      </main>
    )
  }

  if (!market) {
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
            mouseInfluence={0.1}
            noiseAmount={0.1}
            distortion={0.05}
          />
        </div>
        <div className="relative z-10">
          <Header />
          <div className="max-w-6xl mx-auto px-4 py-8">
            <Link href="/">
              <Button variant="ghost" className="mb-6 -ml-4 gap-2 text-muted-foreground hover:text-foreground backdrop-blur-sm bg-card/80">
                <ArrowLeft className="w-4 h-4" />
                Back to Markets
              </Button>
            </Link>

            <div className="text-center py-12 backdrop-blur-sm bg-card/80 rounded-lg">
              <p className="text-muted-foreground text-lg">Market not found.</p>
              <p className="text-sm text-muted-foreground mt-2">
                Slug: {marketSlug}
              </p>
              <Link href="/">
                <Button variant="outline" className="mt-4 bg-transparent backdrop-blur-sm bg-card/80">
                  Back to All Markets
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </main>
    )
  }

  // Get token symbol and format liquidity
  const tokenSymbol = market.paymentToken === "PDX" ? "PDX" : "BNB"
  const formattedLiquidity = market.totalLiquidity ? `${parseFloat(market.totalLiquidity).toFixed(2)} ${tokenSymbol}` : 'N/A'

  return (
    <main className="min-h-screen bg-background relative overflow-hidden">
      {/* Light Rays Background */}
      <div className="fixed inset-0 z-0">
        <LightRays
          raysOrigin="top-center"
          raysColor="#6366f1"
          raysSpeed={1.5}
          lightSpread={0.8}
          rayLength={1.2}
          followMouse={true}
          mouseInfluence={0.1}
          noiseAmount={0.1}
          distortion={0.05}
        />
      </div>

      {/* Content overlay */}
      <div className="relative z-10 bg-black/80">
        <Header />

        <div className="max-w-6xl mx-auto px-4 py-8">
          {/* Back */}
          <div className="mb-4 flex items-center justify-between gap-4">
            <Link href="/">
              <Button variant="ghost" className="gap-2 backdrop-blur-sm bg-card/80">
                <ArrowLeft className="w-4 h-4" />
                Back to Markets
              </Button>
            </Link>

            {/* Summary on wide screens */}
            <div className="hidden sm:flex items-center gap-4 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-muted/30 backdrop-blur-sm">
                <Volume2 className="w-4 h-4" /> {formatVolume(market.volume)}
              </span>
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-muted/30 backdrop-blur-sm">
                <TrendingUp className="w-4 h-4" /> {market.daysLeft}d left
              </span>
              {/* Payment token badge */}
              {getPaymentTokenBadge(market.paymentToken)}
            </div>
          </div>

          {/* Connection status */}
          {!isContractReady && (
            <div className="mb-6 p-3 bg-yellow-950/30 border border-yellow-600/50 rounded-lg backdrop-blur-sm text-yellow-400">
              <p className="text-sm">
                ⚠️ Not connected to blockchain. Some features may be limited.
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main column */}
            <div className="lg:col-span-2 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="inline-block px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-semibold backdrop-blur-sm">
                    {market.category}
                  </div>
                  <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-balance">{market.title}</h1>
                </div>

                <div className="sm:text-right text-sm text-muted-foreground">
                  <div className={`inline-block px-3 py-1 rounded-full text-xs font-medium border ${statusBadge.color} backdrop-blur-sm`}>
                    {statusBadge.text}
                  </div>
                  <div className="mt-1 sm:mt-2">
                    <div className="text-xs">Resolution: <span className="font-medium">{resolutionDate.toLocaleDateString()}</span></div>
                  </div>
                </div>
              </div>

              <p className="text-sm sm:text-base text-muted-foreground backdrop-blur-sm bg-card/80 p-4 rounded-lg">
                {market.description}
              </p>

              {/* Creator info */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 text-sm text-muted-foreground backdrop-blur-sm bg-card/80 p-4 rounded-lg">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 flex-shrink-0" />
                  <span>Created by: {formatAddress(market.creator)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 flex-shrink-0" />
                  <span>Ends: {resolutionDate.toLocaleDateString()}</span>
                </div>
              </div>

              {/* Chart */}
              <div className="w-full bg-card rounded-lg p-4 backdrop-blur-sm">
                <PriceChart data={chartData} isLoading={isChartLoading} />
              </div>

              {/* Stats grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card className="p-4 backdrop-blur-sm bg-card/80">
                  <div className="text-sm text-muted-foreground mb-1 flex items-center gap-1">
                    <Volume2 className="w-4 h-4" />
                    Trading Volume
                  </div>
                  <p className="text-2xl font-bold">{formatVolume(market.volume)}</p>
                </Card>

                <Card className="p-4 backdrop-blur-sm bg-card/80">
                  <div className="text-sm text-muted-foreground mb-1 flex items-center gap-1">
                    <TrendingUp className="w-4 h-4" />
                    Days Remaining
                  </div>
                  <p className="text-2xl font-bold">{market.daysLeft}d</p>
                </Card>

                <Card className="p-4 backdrop-blur-sm bg-card/80">
                  <div className="text-sm text-muted-foreground mb-1 flex items-center gap-1">
                    <Coins className="w-4 h-4" />
                    Total Liquidity
                  </div>
                  <p className="text-2xl font-bold">{formattedLiquidity}</p>
                </Card>
              </div>
            </div>

            {/* Sidebar / trade panel */}
            <div className="lg:col-span-1">
              <Card className="p-6 sticky top-6 space-y-6 backdrop-blur-sm bg-card/80">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-lg font-semibold">Current Odds</h2>
                    {/* Show token indicator */}
                    <div className="text-xs">
                      {getPaymentTokenBadge(market.paymentToken)}
                    </div>
                  </div>
                </div>

                {/* Responsive odds */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    onClick={() => handleOpenModal("YES")}
                    disabled={!market.isActive}
                    className={`w-full p-4 rounded-lg border-2 transition-all text-left backdrop-blur-sm ${
                      outcome === "YES"
                        ? "border-green-500 bg-green-950/30"
                        : market.isActive
                        ? "border-green-900 bg-green-950/10 hover:bg-green-950/20"
                        : "border-gray-600 bg-gray-900/20 cursor-not-allowed opacity-60"
                    }`}
                  >
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">YES</div>
                      <div className="text-2xl sm:text-3xl font-bold text-green-500">{(market.yesOdds ?? 0).toFixed(1)}%</div>
                      <div className="text-xs text-green-400 mt-1">${((market.yesOdds ?? 0) / 100).toFixed(2)} / token</div>
                    </div>
                  </button>

                  <button
                    onClick={() => handleOpenModal("NO")}
                    disabled={!market.isActive}
                    className={`w-full p-4 rounded-lg border-2 transition-all text-left backdrop-blur-sm ${
                      outcome === "NO"
                        ? "border-red-500 bg-red-950/30"
                        : market.isActive
                        ? "border-red-900 bg-red-950/10 hover:bg-red-950/20"
                        : "border-gray-600 bg-gray-900/20 cursor-not-allowed opacity-60"
                    }`}
                  >
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">NO</div>
                      <div className="text-2xl sm:text-3xl font-bold text-red-500">{(market.noOdds ?? 0).toFixed(1)}%</div>
                      <div className="text-xs text-red-400 mt-1">${((market.noOdds ?? 0) / 100).toFixed(2)} / token</div>
                    </div>
                  </button>
                </div>

                <Button 
                  className="w-full mt-2 backdrop-blur-sm bg-card/80"
                  onClick={() => outcome && setShowModal(true)} 
                  disabled={!outcome || !market.isActive}
                >
                  {market.isActive ? 'Trade Now' : 'Market Closed'}
                </Button>

                {outcome && market.isActive && (
                  <div className="pt-4 border-t border-border">
                    <p className="text-xs text-muted-foreground text-center">Click a side to begin your trade</p>
                  </div>
                )}
              </Card>
            </div>
          </div>
        </div>

        <Footer />

        {/* Trade Modal - Pass payment token */}
        {showModal && market.isActive && (
          <TradeModal 
            market={market} 
            paymentToken={market.paymentToken}
            outcome={outcome} 
            onOutcomeChange={setOutcome} 
            onClose={handleCloseModal} 
          />
        )}
      </div>
    </main>
  )
}