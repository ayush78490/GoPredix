// components/MarketList.tsx
"use client"

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePredictionMarketBNB } from '@/hooks/use-predection-market'
import { usePredictionMarketPDX } from '@/hooks/use-prediction-market-pdx'

// Helper function to generate slug from question
export const generateSlug = (question: string, id: number | string): string => {
  const baseSlug = question
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single
    .substring(0, 60) // Limit length
    .replace(/-$/, '') // Remove trailing hyphen
  
  return `${baseSlug}-${id}` || `market-${id}`
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

interface FrontendMarket {
  id: string
  slug: string
  title: string
  description: string
  category: string
  yesOdds: number
  noOdds: number
  volume: number
  resolutionDate: string
  isActive: boolean
  daysLeft: number
  creator: string
  totalLiquidity: number
  paymentToken: "BNB" | "PDX"
  status: number
}

// Convert on-chain market to frontend market format
const convertToFrontendMarket = (m: any, id: number | string, paymentToken: "BNB" | "PDX"): FrontendMarket => {
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
    status: m?.status ?? m?.state ?? 0,
    isActive,
    daysLeft: Math.max(0, Math.ceil((resolutionDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))),
    creator: m?.creator || "Unknown",
    totalLiquidity: totalPool,
    paymentToken
  }
}

const formatVolume = (vol: number) => {
  if (vol >= 1000000) return `$${(vol / 1000000).toFixed(1)}m`
  if (vol >= 1000) return `$${(vol / 1000).toFixed(1)}k`
  return `$${(vol || 0).toFixed(2)}`
}

const getTokenBadgeStyle = (token: "BNB" | "PDX") => {
  if (token === "BNB") {
    return "bg-yellow-500/20 border border-yellow-600/50 text-yellow-400"
  }
  return "bg-purple-500/20 border border-purple-600/50 text-purple-400"
}

const getTokenIcon = (token: "BNB" | "PDX") => {
  return token === "BNB" ? "🔶" : "💜"
}

interface MarketListProps {
  tokenFilter?: "BNB" | "PDX" | "ALL"
}

export function MarketList({ tokenFilter = "ALL" }: MarketListProps) {
  const bnbHook = usePredictionMarketBNB()
  const pdxHook = usePredictionMarketPDX()
  
  const [allMarkets, setAllMarkets] = useState<FrontendMarket[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadMarkets = async () => {
      try {
        setIsLoading(true)
        setError(null)
        
        const markets: FrontendMarket[] = []
        let marketIndex = 0

        // Load BNB markets
        if (tokenFilter === "ALL" || tokenFilter === "BNB") {
          try {
            // This would require implementing a function in the hook to get all markets
            // For now, we'll fetch markets that were created (you'd need to track IDs)
            // Example: assume you store market IDs in localStorage or from indexer
            console.log("🔶 Loading BNB markets...")
            // const bnbMarkets = await loadBNBMarkets()
            // markets.push(...bnbMarkets)
          } catch (err) {
            console.warn("⚠️ Error loading BNB markets:", err)
          }
        }

        // Load PDX markets
        if (tokenFilter === "ALL" || tokenFilter === "PDX") {
          try {
            console.log("💜 Loading PDX markets...")
            // const pdxMarkets = await loadPDXMarkets()
            // markets.push(...pdxMarkets)
          } catch (err) {
            console.warn("⚠️ Error loading PDX markets:", err)
          }
        }

        setAllMarkets(markets)
        
        if (markets.length === 0) {
          setError("No markets found")
        }
      } catch (err) {
        console.error("❌ Error loading markets:", err)
        setError(err instanceof Error ? err.message : "Failed to load markets")
      } finally {
        setIsLoading(false)
      }
    }

    loadMarkets()
  }, [tokenFilter])

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="mt-2 text-muted-foreground">Loading markets...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600">Error: {error}</p>
      </div>
    )
  }

  if (allMarkets.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No markets found</p>
      </div>
    )
  }

  return (
    <div className="w-full">
      {/* Filter Info */}
      <div className="mb-6 p-4 bg-muted rounded-lg">
        <p className="text-sm text-muted-foreground">
          Showing {allMarkets.length} market{allMarkets.length !== 1 ? "s" : ""}
          {tokenFilter !== "ALL" && ` • ${tokenFilter} only`}
        </p>
      </div>

      {/* Markets Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {allMarkets.map((market) => (
          <Link 
            key={market.slug} 
            href={`/market/${market.slug}`}
            className="block group"
          >
            <div className="h-full p-6 border-2 border-border rounded-lg hover:shadow-lg hover:border-primary transition-all cursor-pointer bg-card hover:bg-accent">
              {/* Header - Category, Token, Status */}
              <div className="flex items-center justify-between mb-4 gap-2">
                <span className="inline-block px-3 py-1 text-xs font-semibold rounded-full bg-primary/10 text-primary">
                  {market.category}
                </span>
                
                {/* Token Badge */}
                <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full ${getTokenBadgeStyle(market.paymentToken)}`}>
                  <span>{getTokenIcon(market.paymentToken)}</span>
                  {market.paymentToken}
                </span>

                {/* Status Badge */}
                <span className={`inline-block px-2 py-1 text-xs font-semibold rounded-full ${
                  market.isActive 
                    ? 'bg-green-500/20 border border-green-600/50 text-green-400' 
                    : 'bg-gray-500/20 border border-gray-600/50 text-gray-400'
                }`}>
                  {market.isActive ? 'Open' : 'Closed'}
                </span>
              </div>
              
              {/* Title */}
              <h3 className="font-bold text-lg mb-4 line-clamp-2 group-hover:text-primary transition-colors">
                {market.title}
              </h3>
              
              {/* Odds Section */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className={`rounded-lg p-3 border ${
                  market.isActive
                    ? "bg-green-950/20 border-green-800/30"
                    : "bg-gray-100 border-gray-300"
                }`}>
                  <div className="text-xs text-muted-foreground mb-1">YES</div>
                  <div className={`text-lg font-bold ${
                    market.isActive ? "text-green-500" : "text-gray-500"
                  }`}>
                    {market.yesOdds.toFixed(1)}%
                  </div>
                  <div className={`text-xs mt-1 ${
                    market.isActive ? "text-green-400" : "text-gray-500"
                  }`}>
                    {market.yesOdds > 0 ? `${(100 / market.yesOdds).toFixed(2)}x` : "0x"} return
                  </div>
                </div>

                <div className={`rounded-lg p-3 border ${
                  market.isActive
                    ? "bg-red-950/20 border-red-800/30"
                    : "bg-gray-100 border-gray-300"
                }`}>
                  <div className="text-xs text-muted-foreground mb-1">NO</div>
                  <div className={`text-lg font-bold ${
                    market.isActive ? "text-red-500" : "text-gray-500"
                  }`}>
                    {market.noOdds.toFixed(1)}%
                  </div>
                  <div className={`text-xs mt-1 ${
                    market.isActive ? "text-red-400" : "text-gray-500"
                  }`}>
                    {market.noOdds > 0 ? `${(100 / market.noOdds).toFixed(2)}x` : "0x"} return
                  </div>
                </div>
              </div>

              {/* Market Info */}
              <div className="space-y-2 text-xs text-muted-foreground mb-4 pb-4 border-b border-border">
                <div className="flex justify-between">
                  <span>Volume: {formatVolume(market.volume)}</span>
                  <span>Liquidity: {formatVolume(market.totalLiquidity)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Ends: {new Date(market.resolutionDate).toLocaleDateString()}</span>
                  <span className="font-semibold text-foreground">{market.daysLeft}d left</span>
                </div>
              </div>

              {/* Creator */}
              <div className="text-xs text-muted-foreground truncate">
                By: {market.creator.slice(0, 6)}...{market.creator.slice(-4)}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}