"use client"

import { useState, useEffect, useCallback, useMemo, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import Header from "@/components/header"
import PriceChart from "@/components/price-chart"
import TradeModal from "@/components/trade-modal"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { ArrowLeft, Volume2, TrendingUp, Loader2, Calendar, User, Coins } from "lucide-react"
import { useAllMarkets } from "@/hooks/getAllMarkets"
import { usePredictionMarketBNB } from "@/hooks/use-predection-market"
import { usePredictionMarketPDX } from "@/hooks/use-prediction-market-pdx"
import Footer from "@/components/footer"
import LightRays from "@/components/LightRays"
import { useAccount, useChainId } from "wagmi"

const safeStringify = (obj: any): string => {
  return JSON.stringify(obj, (_, value) => {
    if (typeof value === 'bigint') {
      return value.toString()
    }
    return value
  })
}

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

export const parseMarketSlug = (slug: string): {
  type: 'BNB' | 'PDX' | null,
  numericId: number | null,
  compositeId: string | null
} => {
  if (!slug) return { type: null, numericId: null, compositeId: null }

  // Try to find "BNB-X" or "PDX-X" pattern in the slug
  // e.g., "will-bitcoin-reach-100k-PDX-0" → type: "PDX", id: 0
  const parts = slug.split('-')

  // Check from the end backwards for token-id pattern
  for (let i = parts.length - 2; i >= 0; i--) {
    const potentialType = parts[i]
    const potentialId = parts[i + 1]

    if ((potentialType === 'BNB' || potentialType === 'PDX') && /^\d+$/.test(potentialId)) {
      const numericId = parseInt(potentialId, 10)
      return {
        type: potentialType as 'BNB' | 'PDX',
        numericId,
        compositeId: `${potentialType}-${potentialId}`
      }
    }
  }

  // Fallback: try direct numeric ID (assume BNB for backward compatibility)
  if (/^\d+$/.test(slug)) {
    return {
      type: 'BNB',
      numericId: parseInt(slug, 10),
      compositeId: `BNB-${slug}`
    }
  }

  return { type: null, numericId: null, compositeId: null }
}

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
  const paymentToken = m?.paymentToken || "BNB"

  // ✅ FIXED: Extract numeric ID from composite ID (e.g., "BNB-0" -> 0)
  let numericId: number
  if (typeof id === 'string') {
    // Check if it's a composite ID like "BNB-0" or "PDX-1"
    const parts = id.split('-')
    const lastPart = parts[parts.length - 1]
    if (/^\d+$/.test(lastPart)) {
      numericId = parseInt(lastPart, 10)
    } else {
      // If it's just a numeric string like "0"
      numericId = parseInt(id, 10)
    }
  } else {
    numericId = id
  }

  // Fallback to m.numericId if extraction failed
  if (isNaN(numericId) && m?.numericId !== undefined) {
    numericId = m.numericId
  }

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
    paymentToken,
    numericId
  }
}




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
  const router = useRouter()
  const marketSlug = params?.slug as string

  const [market, setMarket] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [retryCount, setRetryCount] = useState(0)
  const [outcome, setOutcome] = useState<"YES" | "NO" | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [chartData, setChartData] = useState<any[]>([])
  const [isChartLoading, setIsChartLoading] = useState(true)
  const [isNavigatingBack, setIsNavigatingBack] = useState(false)

  const marketFoundRef = useRef(false)
  const searchAttemptedRef = useRef(false)

  const { address: account, isConnected } = useAccount()
  const chainId = useChainId()
  const isCorrectNetwork = chainId === 97

  const { markets: allMarkets, isLoading: marketsLoading, getAllMarkets, isContractReady } = useAllMarkets()

  const bnbHook = usePredictionMarketBNB()
  const pdxHook = usePredictionMarketPDX()

  const { getMarketPriceHistory: getBNBHistory } = bnbHook
  const { getMarketPriceHistory: getPDXHistory } = pdxHook

  const fetchChartData = useCallback(async (market: any) => {
    if (!market) return

    // Ensure we have a numeric ID
    const numericId = typeof market.id === 'string' && market.id.includes('-')
      ? parseInt(market.id.split('-').pop()!)
      : Number(market.id)

    if (isNaN(numericId)) {
      console.error("Invalid market ID for chart:", market.id)
      setIsChartLoading(false)
      return
    }

    setIsChartLoading(true)
    try {
      let history: any[] = []
      if (market.paymentToken === "BNB") {
        history = await getBNBHistory(numericId)
      } else {
        history = await getPDXHistory(numericId)
      }

      if (history.length === 0) {
        console.log("No history found, using fallback with current price:", market.yesPrice)
        const now = Date.now()
        // Use current price from market object, defaulting to 50 if invalid
        const currentPrice = (market.yesPrice && !isNaN(market.yesPrice)) ? market.yesPrice : 50

        history = [
          { timestamp: now - 86400000, price: 50 }, // Start at 50% 24h ago
          { timestamp: now, price: currentPrice }   // End at current price
        ]
      }

      const formattedData = history.map(p => ({
        timestamp: p.timestamp,
        date: new Date(p.timestamp).toLocaleDateString() + ' ' + new Date(p.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        yesPrice: p.price,
        noPrice: 100 - p.price
      }))

      setChartData(formattedData)
    } catch (error) {
      console.error("Error fetching chart data:", error)
    } finally {
      setIsChartLoading(false)
    }
  }, [getBNBHistory, getPDXHistory])

  const safeGetUserInvestment = useCallback(async (marketId: number, account: string) => {
    try {
      if (!account || marketId < 0) {
        return {
          totalInvested: "0",
          yesBalance: "0",
          noBalance: "0"
        }
      }

      const investment = await pdxHook.getUserInvestment(marketId, account)
      return investment || {
        totalInvested: "0",
        yesBalance: "0",
        noBalance: "0"
      }
    } catch (error) {
      console.warn("Could not fetch user investment:", error)
      return {
        totalInvested: "0",
        yesBalance: "0",
        noBalance: "0"
      }
    }
  }, [pdxHook])

  const loadMarketData = useCallback(async () => {
    if (marketFoundRef.current) {
      console.log("Market already found, skipping search")
      return
    }

    if (!marketSlug) {
      setIsLoading(false)
      setIsChartLoading(false)
      return
    }

    searchAttemptedRef.current = true
    setIsLoading(true)
    setIsChartLoading(true)

    try {
      let marketsToSearch = allMarkets

      if (allMarkets.length === 0 && !marketsLoading && isContractReady) {
        console.log("No markets in cache, fetching from blockchain...")
        try {
          marketsToSearch = await getAllMarkets()
        } catch (fetchError) {
          console.warn("Could not fetch markets, using empty array:", fetchError)
          marketsToSearch = []
        }
      }

      let foundMarket: any = null
      const parsed = parseMarketSlug(marketSlug)

      console.log(`Looking for market with slug: "${marketSlug}"`, parsed)

      // Try to find by composite ID first
      if (parsed.compositeId) {
        const market = marketsToSearch.find((m: any) => m.id === parsed.compositeId)

        if (market) {
          console.log(`Found market by composite ID: ${parsed.compositeId}`)
          foundMarket = convertToFrontendMarket(market, parsed.compositeId)
        }
      }

      // Fallback: try numeric ID (for backward compatibility)
      if (!foundMarket && parsed.numericId !== null && parsed.numericId >= 0) {
        const market = marketsToSearch.find((m: any) => {
          const marketId = typeof m.id === 'string' ? parseInt(m.id) : Number(m.id)
          return marketId === parsed.numericId
        })

        if (market) {
          console.log(`Found market by numeric ID: ${parsed.numericId}`)
          foundMarket = convertToFrontendMarket(market, parsed.numericId)
        }
      }

      if (!foundMarket) {
        for (let i = 0; i < marketsToSearch.length; i++) {
          const marketData = marketsToSearch[i]
          // ✅ FIXED: Use numericId if available, otherwise parse id
          const marketId = marketData.numericId ?? (typeof marketData.id === 'string' ? parseInt(marketData.id) : Number(marketData.id))
          const formatted = convertToFrontendMarket(marketData, marketId)

          if (formatted.slug === marketSlug || formatted.id === marketSlug) {
            console.log(`Found market by slug match: ${marketSlug}`)
            foundMarket = formatted
            break
          }
        }
      }

      if (foundMarket) {
        marketFoundRef.current = true

        // ✅ FIXED: Update the market object with the correct payment token from slug
        const paymentToken = parsed.type || foundMarket.paymentToken || "BNB"
        foundMarket.paymentToken = paymentToken  // 👈 ADD THIS LINE
        const marketId = parsed.numericId ?? foundMarket.numericId ?? (typeof foundMarket.id === 'string' ? parseInt(foundMarket.id) : Number(foundMarket.id))

        console.log(`Market ${marketId} uses payment token: ${paymentToken} (parsed from slug: ${parsed.type})`)

        try {
          if (paymentToken === "PDX" && pdxHook.isContractReady) {
            console.log("Fetching PDX market details...")
            const pdxMarket = await pdxHook.getPDXMarket(marketId)

            const userInvestment = await safeGetUserInvestment(marketId, account || "")

            foundMarket = {
              ...foundMarket,
              ...pdxMarket,
              id: marketId.toString(),
              paymentToken: "PDX",
              userInvestment
            }
            console.log("PDX market data loaded")
          } else if (paymentToken === "BNB" && bnbHook.isContractReady) {
            console.log("Fetching BNB market details...")
            const bnbMarket = await bnbHook.getMarket(marketId)

            foundMarket = {
              ...foundMarket,
              ...bnbMarket,
              id: marketId.toString(),
              paymentToken: "BNB"
            }
            console.log("BNB market data loaded")
          }
        } catch (hookError) {
          console.warn("Could not fetch additional market data:", hookError)
        }

        setMarket(foundMarket)

        setMarket(foundMarket)
        fetchChartData(foundMarket)
        setIsLoading(false)

        console.log(`Found market: "${foundMarket.title}" (${foundMarket.paymentToken})`)
        return;

      } else {
        console.warn(`Market not found with slug: ${marketSlug}, retrying... (attempt ${retryCount + 1})`)

        if (retryCount < 5) {
          setTimeout(() => {
            setRetryCount(prev => prev + 1)
          }, 2000)
        } else {
          console.error(`Giving up after ${retryCount} attempts for market: ${marketSlug}`)
          setIsLoading(false)
          setIsChartLoading(false)
        }
      }
    } catch (err: any) {
      console.error("Failed to load market:", err)
      if (retryCount < 5) {
        setTimeout(() => {
          setRetryCount(prev => prev + 1)
        }, 2000)
      } else {
        console.error(`Giving up after ${retryCount} attempts due to errors`)
        setIsLoading(false)
        setIsChartLoading(false)
      }
    }
  }, [marketSlug, allMarkets, marketsLoading, isContractReady, bnbHook.isContractReady, pdxHook.isContractReady, account, safeGetUserInvestment, retryCount, getAllMarkets])

  useEffect(() => {
    let cancelled = false

    const executeLoad = async () => {
      if (!cancelled && !marketFoundRef.current) {
        await loadMarketData()
      }
    }

    executeLoad()

    return () => {
      cancelled = true
    }
  }, [loadMarketData])

  useEffect(() => {
    if (retryCount > 0 && retryCount <= 5 && !marketFoundRef.current) {
      console.log(`Retry attempt ${retryCount} for market: ${marketSlug}`)
      loadMarketData()
    }
  }, [retryCount, marketSlug, loadMarketData])

  useEffect(() => {
    if (allMarkets.length > 0 && !market && isLoading && !marketFoundRef.current) {
      console.log("Markets data updated, retrying search...")
      loadMarketData()
    }
  }, [allMarkets.length, market, isLoading, loadMarketData])

  useEffect(() => {
    if (market) {
      fetchChartData(market)
    }
  }, [market?.yesPrice, market?.id, fetchChartData])

  useEffect(() => {
    marketFoundRef.current = false
    searchAttemptedRef.current = false
    setMarket(null)
    setIsLoading(true)
    setIsChartLoading(true)
    setRetryCount(0)
    setIsNavigatingBack(false)
  }, [marketSlug])

  const handleBackNavigation = () => {
    setIsNavigatingBack(true)
    router.push("/markets")
  }

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

  const memoizedMarketData = useMemo(() => {
    if (!market) return null

    const tokenSymbol = market.paymentToken === "PDX" ? "PDX" : "BNB"
    const formattedLiquidity = market.totalLiquidity ? `${parseFloat(market.totalLiquidity).toFixed(2)} ${tokenSymbol}` : 'N/A'

    return {
      tokenSymbol,
      formattedLiquidity,
      resolutionDate: new Date(market.resolutionDate)
    }
  }, [market])

  const isDataFullyLoaded = market && !isLoading && !isChartLoading

  if (!isDataFullyLoaded) {
    return (
      <main className="min-h-screen bg-black/80 relative overflow-hidden">
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
          <div className="max-w-6xl mx-auto px-4 py-8 mt-[10vh]">
            <div className="mb-6">
              <Button
                onClick={handleBackNavigation}
                variant="ghost"
                className="gap-2 backdrop-blur-sm bg-card/80"
                disabled={isNavigatingBack}
              >
                {isNavigatingBack ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Loading...
                  </>
                ) : (
                  <>
                    <ArrowLeft className="w-4 h-4" />
                    Back to Markets
                  </>
                )}
              </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-[5vh]">

              {/* Mobile Header Skeleton - Visible only on mobile, Order 1 */}
              <div className="lg:hidden order-1 space-y-4">
                <div className="flex gap-3">
                  <div className="w-20 h-6 bg-gray-700 rounded-full animate-pulse"></div>
                  <div className="w-24 h-6 bg-gray-700 rounded-full animate-pulse"></div>
                </div>
                <div className="w-full h-8 bg-gray-700 rounded-lg animate-pulse"></div>
                <div className="w-32 h-4 bg-gray-700 rounded-lg animate-pulse"></div>
              </div>

              {/* Trade Card Skeleton - Mobile Order 2, Desktop Right Col */}
              <div className="lg:col-span-1 lg:order-2 order-2">
                <Card className="p-6 space-y-6 backdrop-blur-sm bg-card/80 h-96">
                  <div className="flex flex-col items-center justify-center h-full gap-4">
                    <Loader2 className="w-12 h-12 animate-spin text-primary" />
                    <p className="text-muted-foreground text-center">
                      {market ? 'Loading trading data...' : 'Loading market...'}
                    </p>
                    {retryCount > 0 && (
                      <p className="text-sm text-yellow-400 text-center">
                        Attempt {retryCount} of 5...
                      </p>
                    )}
                  </div>
                </Card>
              </div>

              {/* Chart & Details Skeleton - Mobile Order 3, Desktop Left Col */}
              <div className="lg:col-span-2 lg:order-1 order-3 space-y-6">

                {/* Chart Skeleton - Mobile First (inside col), Desktop Second */}
                <div className="order-1 lg:order-2 w-full bg-card rounded-lg p-4 backdrop-blur-sm h-80">
                  <div className="h-full flex flex-col items-center justify-center gap-4">
                    <Loader2 className="w-12 h-12 animate-spin text-primary" />
                    <p className="text-muted-foreground">Loading market chart...</p>
                  </div>
                </div>

                {/* Details Skeleton - Mobile Second (inside col), Desktop First */}
                <div className="order-2 lg:order-1 space-y-6">
                  {/* Desktop Header Skeleton - Hidden on Mobile */}
                  <div className="hidden lg:flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-20 h-6 bg-gray-700 rounded-full animate-pulse"></div>
                      <div className="w-48 h-8 bg-gray-700 rounded-lg animate-pulse"></div>
                    </div>
                    <div className="w-24 h-6 bg-gray-700 rounded-lg animate-pulse"></div>
                  </div>

                  <div className="w-full h-20 bg-gray-700 rounded-lg animate-pulse"></div>

                  <div className="w-full h-16 bg-gray-700 rounded-lg animate-pulse"></div>
                </div>

                <div className="order-3 grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-20 bg-gray-700 rounded-lg animate-pulse"></div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    )
  }

  if (!market) {
    return (
      <main className="min-h-screen bg-black/80 relative overflow-hidden">
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
          <div className="max-w-6xl mx-auto px-4 py-8 mt-[10vh]">
            <Button
              onClick={handleBackNavigation}
              variant="ghost"
              className="mb-6 -ml-4 gap-2 text-muted-foreground hover:text-foreground backdrop-blur-sm bg-card/80"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Markets
            </Button>

            <div className="text-center py-12 backdrop-blur-sm bg-card/80 rounded-lg">
              <p className="text-muted-foreground text-lg"><strong>Market not found</strong></p>
              <p className="text-sm text-muted-foreground mt-2">
                The market you're looking for doesn't exist or is currently unavailable.
              </p>
            </div>
          </div>
        </div>
      </main>
    )
  }

  const { tokenSymbol, formattedLiquidity } = memoizedMarketData || {
    tokenSymbol: "BNB",
    formattedLiquidity: "N/A"
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
          mouseInfluence={0.1}
          noiseAmount={0.1}
          distortion={0.05}
        />
      </div>

      <div className="relative z-10 bg-black/80">
        <Header />

        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="mb-4 flex items-center justify-between gap-4 mt-[10vh]">
            <Button
              onClick={handleBackNavigation}
              variant="ghost"
              className="gap-2 backdrop-blur-sm bg-card/80 relative"
              disabled={isNavigatingBack}
            >
              {isNavigatingBack ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Loading...
                </>
              ) : (
                <>
                  <ArrowLeft className="w-4 h-4" />
                  Back to Markets
                </>
              )}
            </Button>

            <div className="hidden sm:flex items-center gap-4 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-muted/30 backdrop-blur-sm">
                <Volume2 className="w-4 h-4" /> {formatVolume(market.volume)}
              </span>
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-muted/30 backdrop-blur-sm">
                <TrendingUp className="w-4 h-4" /> {market.daysLeft}d left
              </span>
              {getPaymentTokenBadge(market.paymentToken)}
            </div>
          </div>

          {!isContractReady && (
            <div className="mb-6 p-3 bg-yellow-950/30 border border-yellow-600/50 rounded-lg backdrop-blur-sm text-yellow-400">
              <p className="text-sm">
                Not connected to blockchain. Some features may be limited.
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* Mobile Header - Visible only on mobile, Order 1 */}
            <div className="lg:hidden order-1 space-y-4">
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-3">
                  <div className="inline-block px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-semibold backdrop-blur-sm">
                    {market.category}
                  </div>
                  <div className={`inline-block px-3 py-1 rounded-full text-xs font-medium border ${statusBadge.color} backdrop-blur-sm`}>
                    {statusBadge.text}
                  </div>
                </div>
                <h1 className="text-2xl font-bold text-balance leading-tight">{market.title}</h1>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>Resolution: <span className="font-medium">{resolutionDate.toLocaleDateString()}</span></span>
                </div>
              </div>
            </div>

            {/* Trade Card Column - Mobile Order 2, Desktop Right Col */}
            <div className="lg:col-span-1 lg:order-2 order-2">
              <Card className="p-6 sticky top-6 space-y-6 backdrop-blur-sm bg-card/80">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-lg font-semibold">Current Odds</h2>
                    <div className="text-xs">
                      {getPaymentTokenBadge(market.paymentToken)}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    onClick={() => handleOpenModal("YES")}
                    disabled={!market.isActive}
                    className={`w-full p-4 rounded-lg border-2 transition-all text-left backdrop-blur-sm ${outcome === "YES"
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
                    className={`w-full p-4 rounded-lg border-2 transition-all text-left backdrop-blur-sm ${outcome === "NO"
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

                {market.userInvestment && (Number(market.userInvestment.yesBalance) > 0 || Number(market.userInvestment.noBalance) > 0) && (
                  <div className="mt-4 p-3 bg-blue-950/20 border border-blue-500/30 rounded-lg">
                    <p className="text-xs text-blue-200 font-semibold mb-2">Your Position</p>
                    <div className="flex justify-between text-sm">
                      <span>YES: {Number(market.userInvestment.yesBalance).toFixed(2)}</span>
                      <span>NO: {Number(market.userInvestment.noBalance).toFixed(2)}</span>
                    </div>
                  </div>
                )}
              </Card>
            </div>

            {/* Details & Chart Column - Mobile Order 3, Desktop Left Col */}
            <div className="lg:col-span-2 lg:order-1 order-3 flex flex-col gap-6">

              {/* Chart Section - Mobile First (inside col), Desktop Second */}
              <div className="order-1 lg:order-2 w-full bg-card rounded-lg p-4 backdrop-blur-sm">
                <PriceChart data={chartData} isLoading={isChartLoading} />
              </div>

              {/* Market Info - Mobile Second (inside col), Desktop First */}
              <div className="order-2 lg:order-1 space-y-6">
                {/* Desktop Header - Hidden on Mobile */}
                <div className="hidden lg:flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
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
              </div>

              {/* Stats Cards - Always Last */}
              <div className="order-3 grid grid-cols-1 sm:grid-cols-3 gap-4">
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
          </div>
        </div>

        <Footer />

        {showModal && outcome && (
          <>
            {console.log('🔍 DEBUG: Opening TradeModal with market:', {
              id: market.id,
              numericId: market.numericId,
              paymentToken: market.paymentToken,
              fullMarket: market
            })}
            <TradeModal
              market={market}
              paymentToken={market.paymentToken}
              outcome={outcome}
              onOutcomeChange={(o) => setOutcome(o)}
              onClose={handleCloseModal}
            />
          </>
        )}
      </div>
    </main>
  )
}