"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import Header from "@/components/header"
import PriceChart from "@/components/price-chart"
import TradeModal from "@/components/trade-modal"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { ArrowLeft, Volume2, TrendingUp, Loader2 } from "lucide-react"
import Link from "next/link"
import { usePredictionMarket, MarketStatus } from "@/hooks/use-predection-market"

// Helper function to extract category from question
const extractCategory = (question = ""): string => {
  const lowerQuestion = question.toLowerCase()

  if (lowerQuestion.includes("bitcoin") || lowerQuestion.includes("crypto") || lowerQuestion.includes("ethereum"))
    return "Crypto"
  if (lowerQuestion.includes("election") || lowerQuestion.includes("president") || lowerQuestion.includes("politics"))
    return "Politics"
  if (lowerQuestion.includes("stock") || lowerQuestion.includes("finance") || lowerQuestion.includes("market"))
    return "Finance"
  if (lowerQuestion.includes("sports") || lowerQuestion.includes("game") || lowerQuestion.includes("team"))
    return "Sports"
  if (lowerQuestion.includes("tech") || lowerQuestion.includes("ai") || lowerQuestion.includes("software"))
    return "Tech"
  if (lowerQuestion.includes("economy") || lowerQuestion.includes("gdp") || lowerQuestion.includes("inflation"))
    return "Economy"

  return "General"
}

// Convert on-chain market to frontend market format
const convertToFrontendMarket = (m: any, id: number) => {
  const question = m?.question ?? m?.title ?? `Market ${id}`
  const category = extractCategory(question)
  const endTime = Number(m?.endTime ?? m?.end_time ?? Math.floor(Date.now() / 1000))
  const resolutionDate = new Date(endTime * 1000)
  const now = new Date()
  const isActive = resolutionDate > now

  const totalBacking = parseFloat(m?.totalBacking ?? m?.volume ?? "0") || 0

  return {
    id: id.toString(),
    title: question.length > 80 ? question.substring(0, 80) + "..." : question,
    description: m?.description ?? question,
    category,
    yesOdds: Number(m?.yesPrice ?? m?.yesOdds ?? 50),
    noOdds: Number(m?.noPrice ?? m?.noOdds ?? 50),
    volume: totalBacking * 2000,
    resolutionDate: resolutionDate.toISOString(),
    slug: `market-${id}`,
    onChainData: m,
    status: m?.status ?? m?.state ?? null,
    isActive,
    daysLeft: Math.max(0, Math.ceil((resolutionDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
  }
}

export default function MarketPage() {
  const params = useParams()
  const marketSlug = params?.slug as string

  const [market, setMarket] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [outcome, setOutcome] = useState<"YES" | "NO" | null>(null)
  const [showModal, setShowModal] = useState(false)

  // chart state
  const [chartData, setChartData] = useState<any[]>([])
  const [isChartLoading, setIsChartLoading] = useState(true)

  const { getMarket, getAllMarkets, isContractReady, getMarketPriceHistory } = usePredictionMarket()

  // Extract market ID from slug
  const marketId = marketSlug ? parseInt(marketSlug.replace("market-", "")) : -1

  // Load market data
  useEffect(() => {
    let cancelled = false

    const loadMarketData = async () => {
      if (marketId === -1) {
        setIsLoading(false)
        return
      }

      // wait for contract readiness if available
      if (typeof isContractReady === "boolean" && !isContractReady) {
        // still try fallback to all markets if contract not ready
      }

      setIsLoading(true)
      setError(null)

      try {
        const onChainMarket = await getMarket(marketId)
        if (cancelled) return
        const formatted = convertToFrontendMarket(onChainMarket, marketId)
        setMarket(formatted)
      } catch (err: any) {
        console.error("Failed to load market:", err)
        setError(err?.message ?? "Failed to load market")

        // fallback to all markets
        try {
          const allMarkets = await getAllMarkets()
          if (cancelled) return
          const foundIndex = allMarkets.findIndex((m: any, idx: number) => `market-${idx}` === marketSlug)
          const found = foundIndex >= 0 ? allMarkets[foundIndex] : allMarkets.find((m: any) => (m?.id?.toString?.() === marketId.toString()))
          if (found) {
            const formatted = convertToFrontendMarket(found, marketId)
            setMarket(formatted)
            setError(null)
          }
        } catch (fallbackErr) {
          console.error("Fallback failed:", fallbackErr)
        }
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    loadMarketData()
    return () => {
      cancelled = true
    }
  }, [marketId, marketSlug, getMarket, getAllMarkets, isContractReady])

  // Populate chartData
  useEffect(() => {
    if (!market) return
    let cancelled = false
    const loadChart = async () => {
      setIsChartLoading(true)

      // try hook history
      if (typeof getMarketPriceHistory === "function") {
        try {
          const history = await getMarketPriceHistory(marketId)
          if (!cancelled && Array.isArray(history) && history.length) {
            const normalized = history.map((p: any) => ({
              time: p.time ?? p.timestamp ?? p.t ?? Date.now(),
              price: Number(p.price ?? p.yesPrice ?? p.value ?? market.yesOdds ?? 50)
            }))
            setChartData(normalized)
            setIsChartLoading(false)
            return
          }
        } catch (e) {
          console.warn("getMarketPriceHistory failed", e)
        }
      }

      const history = market.onChainData?.priceHistory || market.onChainData?.history
      if (Array.isArray(history) && history.length) {
        const normalized = history.map((p: any) => ({
          time: p.time ?? p.timestamp ?? Date.now(),
          price: Number(p.price ?? p.yesPrice ?? p.value ?? market.yesOdds ?? 50)
        }))
        setChartData(normalized)
        setIsChartLoading(false)
        return
      }

      // synthesize last 7 days
      const now = Date.now()
      const base = market.yesOdds ?? 50
      const synthesized = Array.from({ length: 7 }).map((_, i) => ({
        time: now - (6 - i) * 24 * 60 * 60 * 1000,
        price: Math.max(0, +(base + (Math.random() - 0.5) * 4).toFixed(2))
      }))
      setChartData(synthesized)
      setIsChartLoading(false)
    }

    loadChart()
    return () => {
      cancelled = true
    }
  }, [market, marketId, getMarketPriceHistory])

  // UI helpers
  const formatVolume = (vol: number) => {
    if (vol >= 1000000) return `$${(vol / 1000000).toFixed(1)}m`
    if (vol >= 1000) return `$${(vol / 1000).toFixed(1)}k`
    return `$${(vol || 0).toFixed(2)}`
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
    if (market?.isActive) return { text: "Active", color: "bg-green-100 text-green-800" }
    if (market?.status === MarketStatus.Resolved) return { text: "Resolved", color: "bg-blue-100 text-blue-800" }
    if (market?.status === MarketStatus.Closed) return { text: "Closed", color: "bg-gray-100 text-gray-800" }
    return { text: "Inactive", color: "bg-yellow-100 text-yellow-800" }
  }
  const statusBadge = getStatusBadge()

  // Loading / error / not found UI
  if (isLoading) {
    return (
      <main className="min-h-screen bg-background">
        <Header />
        <div className="max-w-6xl mx-auto px-4 py-12">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-muted-foreground">Loading market...</p>
          </div>
        </div>
      </main>
    )
  }

  if (error && !market) {
    return (
      <main className="min-h-screen bg-background">
        <Header />
        <div className="max-w-6xl mx-auto px-4 py-8">
          <Link href="/">
            <Button variant="ghost" className="mb-6 -ml-4 gap-2 text-muted-foreground hover:text-foreground">
              <ArrowLeft className="w-4 h-4" />
              Back to Markets
            </Button>
          </Link>

          <div className="bg-destructive/10 border border-destructive rounded-lg p-6 text-center">
            <p className="text-destructive font-medium">❌ Error loading market</p>
            <p className="text-destructive/80 text-sm mt-1">{error}</p>
            <Button onClick={() => window.location.reload()} variant="outline" className="mt-4">
              Try Again
            </Button>
          </div>
        </div>
      </main>
    )
  }

  if (!market) {
    return (
      <main className="min-h-screen bg-background">
        <Header />
        <div className="max-w-6xl mx-auto px-4 py-8">
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

  return (
    <main className="min-h-screen bg-background">
      <Header />

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Back */}
        <div className="mb-4 flex items-center justify-between gap-4">
          <Link href="/">
            <Button variant="ghost" className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              Back to Markets
            </Button>
          </Link>

          {/* small summary on wide screens */}
          <div className="hidden sm:flex items-center gap-4 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-muted/30">
              <Volume2 className="w-4 h-4" /> {formatVolume(market.volume)}
            </span>
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-muted/30">
              <TrendingUp className="w-4 h-4" /> {market.daysLeft}d left
            </span>
          </div>
        </div>

        {/* Connection status */}
        {!isContractReady && (
          <div className="mb-6 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-yellow-700 text-sm">
              ⚠️ Not connected to blockchain. Some features may be limited.
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main column */}
          <div className="lg:col-span-2 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="inline-block px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-semibold">
                  {market.category}
                </div>
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-balance">{market.title}</h1>
              </div>

              <div className="sm:text-right text-sm text-muted-foreground">
                <div className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${statusBadge.color}`}>
                  {statusBadge.text}
                </div>
                <div className="mt-1 sm:mt-2">
                  <div className="text-xs">Resolution: <span className="font-medium">{resolutionDate.toLocaleDateString()}</span></div>
                </div>
              </div>
            </div>

            <p className="text-sm sm:text-base text-muted-foreground">{market.description}</p>

            {/* Chart - responsive container */}
            <div className="w-full bg-card rounded-lg p-4">
              <PriceChart data={chartData} isLoading={isChartLoading} />
            </div>

            {/* Stats grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                <p className="text-2xl font-bold">{market.daysLeft}d</p>
              </Card>
            </div>

            <Card className="p-4 bg-muted">
              <p className="text-sm text-muted-foreground mb-1">Resolution Date</p>
              <p className="font-semibold">
                {resolutionDate.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
              </p>
            </Card>

            <details className="mt-6 text-sm">
              <summary className="cursor-pointer text-muted-foreground">On-Chain Data (Debug)</summary>
              <pre className="mt-2 p-3 bg-muted rounded-lg overflow-auto text-xs">
                {JSON.stringify(market.onChainData, (k, v) => (typeof v === "bigint" ? v.toString() : v), 2)}
              </pre>
            </details>
          </div>

          {/* Sidebar / trade panel */}
          <div className="lg:col-span-1">
            <Card className="p-6 sticky top-6 space-y-6">
              <h2 className="text-lg font-semibold">Current Odds</h2>

              {/* Responsive odds: two columns on small+, stacked on xs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  onClick={() => handleOpenModal("YES")}
                  disabled={!market.isActive}
                  className={`w-full p-4 rounded-lg border-2 transition-all text-left ${
                    outcome === "YES"
                      ? "border-green-500 bg-green-950/30"
                      : market.isActive
                      ? "border-green-900 bg-green-950/10 hover:bg-green-950/20"
                      : "border-gray-300 bg-gray-100 cursor-not-allowed opacity-60"
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
                  className={`w-full p-4 rounded-lg border-2 transition-all text-left ${
                    outcome === "NO"
                      ? "border-red-500 bg-red-950/30"
                      : market.isActive
                      ? "border-red-900 bg-red-950/10 hover:bg-red-950/20"
                      : "border-gray-300 bg-gray-100 cursor-not-allowed opacity-60"
                  }`}
                >
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">NO</div>
                    <div className="text-2xl sm:text-3xl font-bold text-red-500">{(market.noOdds ?? 0).toFixed(1)}%</div>
                    <div className="text-xs text-red-400 mt-1">${((market.noOdds ?? 0) / 100).toFixed(2)} / token</div>
                  </div>
                </button>
              </div>

              <Button className="w-full mt-2" onClick={() => setShowModal(true)} disabled={!outcome}>
                Trade Now
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

      {/* Trade Modal */}
      {showModal && market.isActive && (
        <TradeModal market={market} outcome={outcome} onOutcomeChange={setOutcome} onClose={handleCloseModal} />
      )}
    </main>
  )
}