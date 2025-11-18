"use client"

import { Card } from "@/components/ui/card"
import { TrendingUp, Volume2, Clock, User, AlertCircle, Coins, Loader2 } from "lucide-react"
import Link from "next/link"
import { MarketStatus, Outcome } from "@/hooks/use-predection-market"  // FIXED: Removed PaymentToken
import { useState } from "react"
import CustomAlertDialog from "@/components/customAlert"

interface FrontendMarket {
  id: string
  slug?: string
  creator: string
  question: string
  category: string
  endTime: number
  status: number
  outcome: number
  yesToken: string
  noToken: string
  yesPool: string
  noPool: string
  lpTotalSupply: string
  totalBacking: string
  platformFees: string
  resolutionRequestedAt: number
  disputeDeadline: number
  resolutionReason: string
  resolutionConfidence: number
  yesPrice: number
  noPrice: number
  yesMultiplier: number
  noMultiplier: number
  isActive: boolean
  title?: string
  description?: string
  yesOdds?: number
  noOdds?: number
  volume?: number
  liquidity?: number
  paymentToken?: string  // FIXED: Changed from PaymentToken to string
}

interface MarketCardProps {
  market: FrontendMarket
  disabled?: boolean
  isLoading?: boolean
  onClick?: () => void
}

export default function MarketCard({ market, disabled = false, isLoading = false, onClick }: MarketCardProps) {
  const [showAlert, setShowAlert] = useState(false)
  
  const marketTitle = market.title || market.question || `Market ${market.id}`
  const marketDescription = market.description || market.question || "Prediction market"
  const marketCategory = market.category || "General"
  const marketCreator = market.creator || "0x0000000000000000000000000000000000000000"
  const marketEndTime = market.endTime || Math.floor(Date.now() / 1000)
  
  // ✅ USE IT HERE - Determine token symbol based on paymentToken
  const tokenSymbol = market.paymentToken === "PDX" ? "PDX" : "BNB"

  const yesOdds = market.yesOdds !== undefined ? market.yesOdds : market.yesPrice || 50
  const noOdds = market.noOdds !== undefined ? market.noOdds : market.noPrice || 50

  const isMarketActive =
    market.isActive !== undefined ? market.isActive : market.status === MarketStatus.Open

  const formatVolume = (vol: number) => {
    if (vol >= 1000000) return `$${(vol / 1000000).toFixed(1)}m`
    if (vol >= 1000) return `$${(vol / 1000).toFixed(1)}k`
    return `$${vol.toFixed(2)}`
  }

  const formatDate = (timestamp: number) => new Date(timestamp * 1000).toLocaleDateString()

  const getDaysLeft = (endTime: number) => {
    const now = Math.floor(Date.now() / 1000)
    const timeLeft = endTime - now
    if (timeLeft <= 0) return "Ended"
    const days = Math.ceil(timeLeft / (60 * 60 * 24))
    return `${days}d left`
  }

  const formatAddress = (address: string) => {
    if (!address || address.length < 10) return "Unknown"
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

  const getStatusBadge = (status: number, isActive: boolean) => {
    if (!isActive)
      return (
        <span className="inline-block px-2 py-1 rounded-full text-white text-xs font-semibold bg-gray-500">
          Inactive
        </span>
      )

    const statusConfig: Record<number, { label: string; color: string }> = {
      0: { label: "Open", color: "bg-green-500" },
      1: { label: "Closed", color: "bg-yellow-500" },
      2: { label: "Resolving", color: "bg-blue-500" },
      3: { label: "Resolved", color: "bg-purple-500" },
      4: { label: "Disputed", color: "bg-red-500" },
    }

    const config = statusConfig[status] || { label: "Unknown", color: "bg-gray-500" }
    return (
      <span
        className={`inline-block px-2 py-1 rounded-full text-white text-xs font-semibold ${config.color}`}
      >
        {config.label}
      </span>
    )
  }

  // ✅ USE IT HERE - Get payment token badge with token symbol
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
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold border ${config.color}`}>
        <span>{config.icon}</span>
        {config.label}
      </span>
    )
  }

  const getOutcomeText = (outcome: number) => {
    switch (outcome) {
      case 1:
        return "YES Won"
      case 2:
        return "NO Won"
      default:
        return "Pending"
    }
  }

  const getOutcomeColor = (outcome: number) => {
    switch (outcome) {
      case 1:
        return "text-green-500"
      case 2:
        return "text-red-500"
      default:
        return "text-gray-500"
    }
  }

  const yesMultiplier = yesOdds > 0 ? (100 / yesOdds).toFixed(2) : "0.00"
  const noMultiplier = noOdds > 0 ? (100 / noOdds).toFixed(2) : "0.00"

  const yesPool = parseFloat(market.yesPool || "0")
  const noPool = parseFloat(market.noPool || "0")
  const totalBacking = parseFloat(market.totalBacking || "0")
  const volume = market.volume || 0
  const isDataValid = Boolean(market.question || market.title)

  const handleClick = (e: React.MouseEvent) => {
    if (disabled || isLoading) {
      e.preventDefault()
      if (disabled) {
        setShowAlert(true)
      }
      return
    }
    
    if (onClick) {
      e.preventDefault()
      onClick()
    }
    // If no onClick handler is provided, the Link will handle navigation normally
  }

  return (
    <div className="relative">
      <Link
        href={disabled || isLoading ? "#" : `/markets/${market.slug || market.id}`}
        onClick={handleClick}
        className="block"
      >
        <Card
          className={`overflow-hidden hover:shadow-lg hover:shadow-blue-500/50 hover:scale-[103%] transition-all cursor-pointer h-full border-2 hover:border-white/50 ${
            !isMarketActive ? "" : ""
          } ${disabled || isLoading ? "opacity-50 cursor-not-allowed" : ""}`}
        >
          {/* Loading Overlay */}
          {isLoading && (
            <div className="absolute inset-0 bg-background/80 flex items-center justify-center rounded-lg z-10">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <span className="ml-2 text-sm">Loading...</span>
            </div>
          )}

          <div className="p-4 relative">
            {/* Header - Category, Token, and Status */}
            <div className="flex items-center justify-between mb-3 gap-2">
              <div className="inline-block px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold">
                {marketCategory}
              </div>
              
              {/* ✅ USE IT HERE - Payment Token Badge */}
              {getPaymentTokenBadge(tokenSymbol)}
              
              {getStatusBadge(market.status, isMarketActive)}
            </div>

            {!isMarketActive && (
              <div className="mb-2 p-2 bg-gray-100 border border-gray-300 rounded-lg flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-gray-600" />
                <span className="text-xs text-gray-700">Market is inactive</span>
              </div>
            )}

            {!isDataValid && (
              <div className="mb-2 p-2 bg-yellow-50 border border-yellow-200 rounded-lg flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-yellow-600" />
                <span className="text-xs text-yellow-700">Loading market data...</span>
              </div>
            )}

            <h3 className="font-bold text-base mb-2 line-clamp-2 text-card-foreground leading-tight">
              {marketTitle}
              {!isMarketActive && (
                <span className="ml-2 text-xs text-gray-500">(Inactive)</span>
              )}
            </h3>

            {marketDescription && marketDescription !== marketTitle && (
              <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                {marketDescription}
              </p>
            )}

            {market.status === 3 && (
              <div className="mb-3 p-2 bg-muted rounded-lg">
                <div
                  className={`text-sm font-semibold ${getOutcomeColor(
                    market.outcome || 0
                  )}`}
                >
                  {getOutcomeText(market.outcome || 0)}
                </div>
                {market.resolutionReason && (
                  <div className="text-xs text-muted-foreground mt-1 line-clamp-1">
                    {market.resolutionReason}
                  </div>
                )}
                {market.resolutionConfidence > 0 && (
                  <div className="text-xs text-muted-foreground">
                    Confidence: {market.resolutionConfidence}%
                  </div>
                )}
              </div>
            )}

            {/* Odds Section */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              {/* YES */}
              <div
                className={`rounded-lg p-3 border ${
                  isMarketActive
                    ? "bg-green-950/20 border-green-800/30"
                    : "bg-gray-100 border-gray-300"
                }`}
              >
                <div className="text-xs text-muted-foreground mb-1">YES</div>
                <div
                  className={`text-xl font-bold ${
                    isMarketActive ? "text-green-500" : "text-gray-500"
                  }`}
                >
                  {yesOdds.toFixed(1)}%
                </div>
                <div
                  className={`text-xs mt-1 ${
                    isMarketActive ? "text-green-400" : "text-gray-500"
                  }`}
                >
                  {yesMultiplier}x return
                </div>
                {/* ✅ USE IT HERE - Show token symbol in pool */}
                <div className="text-xs text-muted-foreground mt-1">
                  Pool: {yesPool.toFixed(2)} {tokenSymbol}
                </div>
              </div>

              {/* NO */}
              <div
                className={`rounded-lg p-3 border ${
                  isMarketActive
                    ? "bg-red-950/20 border-red-800/30"
                    : "bg-gray-100 border-gray-300"
                }`}
              >
                <div className="text-xs text-muted-foreground mb-1">NO</div>
                <div
                  className={`text-xl font-bold ${
                    isMarketActive ? "text-red-500" : "text-gray-500"
                  }`}
                >
                  {noOdds.toFixed(1)}%
                </div>
                <div
                  className={`text-xs mt-1 ${
                    isMarketActive ? "text-red-400" : "text-gray-500"
                  }`}
                >
                  {noMultiplier}x return
                </div>
                {/* ✅ USE IT HERE - Show token symbol in pool */}
                <div className="text-xs text-muted-foreground mt-1">
                  Pool: {noPool.toFixed(2)} {tokenSymbol}
                </div>
              </div>
            </div>

            {/* Market Info */}
            <div className="space-y-2 text-xs text-muted-foreground pb-3 border-b border-border">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  <span>Ends: {formatDate(marketEndTime)}</span>
                </div>
                <div className="flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" />
                  <span>{getDaysLeft(marketEndTime)}</span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1">
                  <Volume2 className="w-3 h-3" />
                  <span>Volume: {formatVolume(volume)}</span>
                </div>
                <div className="flex items-center gap-1">
                  <User className="w-3 h-3" />
                  <span className="truncate max-w-[80px]">
                    {formatAddress(marketCreator)}
                  </span>
                </div>
              </div>
            </div>

            {/* Liquidity Info */}
            <div className="mt-2 text-xs text-muted-foreground">
              <div className="flex items-center justify-between">
                <span>Total Liquidity:</span>
                {/* ✅ USE IT HERE - Show token symbol in total liquidity */}
                <span className="font-semibold">{totalBacking.toFixed(2)} {tokenSymbol}</span>
              </div>
            </div>

            {/* Resolution Info */}
            {market.status === 2 && isMarketActive && (
              <div className="mt-3 p-2 bg-blue-950/20 rounded-lg border border-blue-800/30">
                <div className="text-xs text-blue-400 font-semibold">
                  ⏳ AI Resolution Pending
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  Requested{" "}
                  {market.resolutionRequestedAt
                    ? formatDate(market.resolutionRequestedAt)
                    : "Recently"}
                </div>
              </div>
            )}

            {market.status === 4 && isMarketActive && (
              <div className="mt-3 p-2 bg-red-950/20 rounded-lg border border-red-800/30">
                <div className="text-xs text-red-400 font-semibold">⚠️ Under Dispute</div>
                <div className="text-xs text-muted-foreground mt-1">
                  Resolution challenged
                </div>
              </div>
            )}

            <div className="mt-3 text-center">
              <p className="text-xs text-muted-foreground">
                {isLoading 
                  ? "Loading market..." 
                  : !isMarketActive
                  ? "Market inactive"
                  : market.status === 0
                  ? "Click to trade"
                  : market.status === 3
                  ? "Click to view results"
                  : "Click to view details"}
              </p>
            </div>
          </div>
        </Card>
      </Link>

      {/* Custom Alert Dialog */}
      <CustomAlertDialog
        open={showAlert}
        onClose={() => setShowAlert(false)}
        title="Connect Wallet Required"
        description="Please connect your wallet to trade on this market."
      />
    </div>
  )
}