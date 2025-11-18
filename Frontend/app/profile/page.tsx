"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { ethers } from "ethers"
import { useWeb3Context } from "@/lib/wallet-context"
import { usePredictionMarketBNB, MarketStatus, Outcome } from "@/hooks/use-predection-market"
import { useStopLossTakeProfit } from "@/hooks/useStoploss"
import { useAutoSellTokens, useSellEstimate } from "@/hooks/useSellToken"
import { OrderInfo } from "@/hooks/useStoploss"
import Header from "@/components/header"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Loader2, Coins, Copy, ExternalLink, Wallet, BarChart3, CheckCircle, AlertCircle, TrendingDown, TrendingUp, Shield, DollarSign } from "lucide-react"
import Link from "next/link"
import LightRays from "@/components/LightRays"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"

// Fallback contract addresses
const FALLBACK_BNB_CONTRACT = process.env.NEXT_PUBLIC_PREDICTION_MARKET_ADDRESS || "0xYourBNBContractAddress"

// ✅ Define enhanced position type for component state
interface EnhancedUserPosition {
  marketId: number
  yesBalance: string
  noBalance: string
  market: {
    id: number
    question: string
    category: string
    status: MarketStatus
    outcome?: Outcome
    endTime: number
    yesPool?: bigint
    noPool?: bigint
    yesPrice?: number
    noPrice?: number
    paymentToken: "BNB"
    [key: string]: any
  }
}

// Market status function
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

export default function ProfilePage() {
  
  const { account, connectWallet, provider } = useWeb3Context()
  
  // ✅ Get hooks for BNB only
  const bnbHook = usePredictionMarketBNB()
  const {
    getUserPositions: getBNBUserPositions,
    getMarketInvestment: getBNBMarketInvestment, 
    getCurrentMultipliers: getBNBCurrentMultipliers,
    getMarket: getMarketBNB
  } = bnbHook

  const bnbContractAddress = FALLBACK_BNB_CONTRACT

  // ✅ Initialize useStopLossTakeProfit with BNB payment token
  const bnbOrders = useStopLossTakeProfit("BNB", account || undefined)

  // Sell tokens hook
  const { sellTokens, isLoading: isSelling, isSuccess: sellSuccess, error: sellError, txHash: sellTxHash } = useAutoSellTokens()

  // ✅ State with proper typing
  const [positions, setPositions] = useState<EnhancedUserPosition[]>([])
  const [marketInvestments, setMarketInvestments] = useState<{ [key: string]: string }>({})
  const [marketOdds, setMarketOdds] = useState<{ [key: string]: { yesMultiplier: number, noMultiplier: number, yesPrice: number, noPrice: number } }>({})
  const [isLoading, setIsLoading] = useState(false)
  const [redeemingMarketId, setRedeemingMarketId] = useState<string | null>(null)

  // Order Dialog State
  const [orderDialogOpen, setOrderDialogOpen] = useState(false)
  const [selectedMarket, setSelectedMarket] = useState<EnhancedUserPosition | null>(null)
  const [orderType, setOrderType] = useState<'stopLoss' | 'takeProfit'>('stopLoss')
  const [tokenType, setTokenType] = useState<'yes' | 'no'>('yes')
  const [tokenAmount, setTokenAmount] = useState('')
  const [triggerPrice, setTriggerPrice] = useState('')

  // Sell Dialog State
  const [sellDialogOpen, setSellDialogOpen] = useState(false)
  const [selectedSellMarket, setSelectedSellMarket] = useState<EnhancedUserPosition | null>(null)
  const [sellTokenType, setSellTokenType] = useState<'yes' | 'no'>('yes')
  const [sellTokenAmount, setSellTokenAmount] = useState('')
  const [minOut, setMinOut] = useState('')
  const [estimateAmount, setEstimateAmount] = useState('')
  const [paymentToken] = useState<"BNB">("BNB")

  // ✅ Helper function to fetch and enrich position with market data
  const fetchAndEnrichPosition = useCallback(
    async (position: any): Promise<EnhancedUserPosition> => {
      try {
        let marketData
        
        try {
          marketData = await getMarketBNB(position.marketId)
        } catch (e) {
          console.error(`Failed to fetch BNB market ${position.marketId}:`, e)
          marketData = null
        }

        return {
          ...position,
          market: marketData ? {
            ...marketData,
            id: position.marketId,
            paymentToken: "BNB"
          } : {
            id: position.marketId,
            paymentToken: "BNB",
            question: "Market data unavailable",
            category: "",
            status: MarketStatus.Open,
            endTime: 0
          }
        }
      } catch (error) {
        console.error(`Failed to enrich position ${position.marketId}:`, error)
        return {
          ...position,
          market: {
            id: position.marketId,
            paymentToken: "BNB",
            question: "Error loading market",
            category: "",
            status: MarketStatus.Open,
            endTime: 0
          }
        }
      }
    },
    [getMarketBNB]
  )

  // Get sell estimate with BNB payment token
  const { estimate: sellEstimate, isLoading: isEstimating, fetchEstimate } = useSellEstimate(
    "BNB",
    selectedSellMarket?.marketId || 0,
    estimateAmount,
    sellTokenType === 'yes'
  )

  // ✅ Load positions from BNB only
  useEffect(() => {
    const loadData = async () => {
      if (!account) return

      setIsLoading(true)

      try {
        // Get user positions from BNB only
        const bnbPositions = await getBNBUserPositions(account).catch(e => {
          console.error("Failed to load BNB positions:", e)
          return []
        })

        // Combine all positions (only BNB now)
        const allPositions = [
          ...bnbPositions.map((pos: any) => ({ ...pos, paymentToken: "BNB" as const }))
        ]

        // Enrich each position with full market data
        const enrichedPositions = await Promise.all(
          allPositions.map(pos => fetchAndEnrichPosition(pos))
        )

        setPositions(enrichedPositions)

        // Fetch investments for each position
        const investmentsPromises = enrichedPositions.map(async (pos) => {
          try {
            const investment = await getBNBMarketInvestment(account, pos.marketId)
            return { marketId: pos.marketId, investment }
          } catch {
            return { marketId: pos.marketId, investment: "0" }
          }
        })

        // Fetch odds for each position
        const oddsPromises = enrichedPositions.map(async (pos) => {
          try {
            const odds = await getBNBCurrentMultipliers(pos.marketId)
            return { marketId: pos.marketId, odds }
          } catch {
            return {
              marketId: pos.marketId,
              odds: { yesMultiplier: 10000, noMultiplier: 10000, yesPrice: 5000, noPrice: 5000 }
            }
          }
        })

        const investments = await Promise.all(investmentsPromises)
        const oddsData = await Promise.all(oddsPromises)

        let investmentMap: { [key: string]: string } = {}
        investments.forEach(({ marketId, investment }) => {
          investmentMap[marketId] = investment
        })
        setMarketInvestments(investmentMap)

        let oddsMap: { [key: string]: any } = {}
        oddsData.forEach(({ marketId, odds }) => {
          oddsMap[marketId] = odds
        })
        setMarketOdds(oddsMap)

      } catch (error) {
        console.error("Failed to load portfolio data:", error)
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [
    account, 
    getBNBUserPositions, 
    fetchAndEnrichPosition, 
    getBNBMarketInvestment, 
    getBNBCurrentMultipliers
  ])

  // Fetch estimate when amount changes
  useEffect(() => {
    if (estimateAmount && parseFloat(estimateAmount) > 0) {
      fetchEstimate()
    }
  }, [estimateAmount, fetchEstimate])

  // Update minOut with 2% slippage when estimate is available
  useEffect(() => {
    if (sellEstimate) {
      const slippage = 0.98
      let minOutValue = "0"
      
      if (sellEstimate.bnbOut) {
        minOutValue = (parseFloat(sellEstimate.bnbOut) * slippage).toFixed(6)
      } else if (sellEstimate.tokenOut) {
        minOutValue = (parseFloat(sellEstimate.tokenOut) * slippage).toFixed(6)
      }
      
      setMinOut(minOutValue)
    }
  }, [sellEstimate])

  // Updated market status function using the new getMarketStatus
  const getMarketStatusInfo = useCallback((market: any) => {
    const status = getMarketStatus(market)
    
    const statusConfig: Record<string, { label: string; color: string; description: string }> = {
      "Active": { 
        label: "Active", 
        color: "bg-green-500 text-white",
        description: "Open for trading"
      },
      "Closed": { 
        label: "Closed", 
        color: "bg-yellow-500 text-white",
        description: "Trading closed, pending resolution"
      },
      "Resolution Requested": { 
        label: "Resolving", 
        color: "bg-blue-500 text-white",
        description: "AI resolution in progress"
      },
      "Resolved": { 
        label: "Resolved", 
        color: "bg-purple-500 text-white",
        description: "Market has been resolved"
      },
      "Disputed": { 
        label: "Disputed", 
        color: "bg-red-500 text-white",
        description: "Resolution under dispute"
      },
      "Ended": {
        label: "Ended",
        color: "bg-red-500 text-white",
        description: "Trading period has ended"
      }
    }
    
    return statusConfig[status.statusLabel] || { 
      label: status.statusLabel, 
      color: "bg-gray-500 text-white",
      description: `Market is ${status.statusLabel.toLowerCase()}`
    }
  }, [])

  // ✅ FIX: Get active orders for a specific market with proper typing
  const getActiveOrdersForMarket = useCallback((marketId: number): OrderInfo[] => {
    try {
      if (!bnbOrders.activeOrders || bnbOrders.activeOrders.length === 0) {
        return []
      }
      
      return bnbOrders.activeOrders.filter(
        order => parseInt(order.marketId) === marketId
      )
    } catch (error) {
      console.error("Error getting active orders for market:", error)
      return []
    }
  }, [bnbOrders.activeOrders])

  // ✅ Updated redeem function for BNB only
  const handleRedeem = useCallback(
    async (marketId: number) => {
      if (!account) return
      
      setRedeemingMarketId(marketId.toString())
      try {
        // Note: You'll need to implement BNB redemption logic here
        // await bnbHook.redeemWinnings?.(marketId)
        console.log("Redeeming BNB market:", marketId)
        
        // Refresh positions
        const bnbPositions = await getBNBUserPositions(account).catch(() => [])
        const allPositions = [
          ...bnbPositions.map((pos: any) => ({ ...pos, paymentToken: "BNB" as const }))
        ]

        const enrichedPositions = await Promise.all(
          allPositions.map(pos => fetchAndEnrichPosition(pos))
        )
        setPositions(enrichedPositions)
        
        // Update investment
        const updatedInvestment = await getBNBMarketInvestment(account, marketId)
        
        setMarketInvestments(prev => ({
          ...prev,
          [marketId]: updatedInvestment
        }))
      } catch (error) {
        console.error("Failed to redeem winnings:", error)
      } finally {
        setRedeemingMarketId(null)
      }
    },
    [account, fetchAndEnrichPosition, getBNBUserPositions, getBNBMarketInvestment]
  )

  const handleOpenOrderDialog = useCallback((market: EnhancedUserPosition, type: 'stopLoss' | 'takeProfit') => {
    setSelectedMarket(market)
    setOrderType(type)
    setOrderDialogOpen(true)
    setTokenAmount('')
    setTriggerPrice('')
  }, [])

  // ✅ FIX: Create order with BNB hook only
  const handleCreateOrder = useCallback(async () => {
    if (!selectedMarket || !tokenAmount || !triggerPrice) return

    try {
      // ✅ FIX: Keep marketId as number (don't convert to string)
      const params = {
        marketId: selectedMarket.marketId,  // ✅ Already a number
        isYes: tokenType === 'yes',
        tokenAmount: tokenAmount,
        triggerPrice: parseFloat(triggerPrice)
      }

      const result = orderType === 'stopLoss'
        ? await bnbOrders.createStopLossOrder(params)
        : await bnbOrders.createTakeProfitOrder(params)

      if (result?.success || result) {
        setOrderDialogOpen(false)
        if (bnbOrders.refreshOrders) {
          await bnbOrders.refreshOrders()
        }
      }
    } catch (error) {
      console.error("Failed to create order:", error)
    }
  }, [selectedMarket, tokenAmount, triggerPrice, orderType, tokenType, bnbOrders])

  const handleOpenSellDialog = useCallback((market: EnhancedUserPosition, type: 'yes' | 'no') => {
    setSelectedSellMarket(market)
    setSellTokenType(type)
    setSellDialogOpen(true)
    setSellTokenAmount('')
    setMinOut('')
    setEstimateAmount('')
  }, [])

  // ✅ Handle sell tokens with BNB only
  const handleSellTokens = useCallback(async () => {
    if (!selectedSellMarket || !sellTokenAmount || !minOut) return

    try {
      await sellTokens({
        marketId: selectedSellMarket.marketId,
        tokenAmount: sellTokenAmount,
        minTokenOut: minOut,
        isYes: sellTokenType === 'yes',
        paymentToken: "BNB"
      })

      // Refresh positions after successful sale
      if (account) {
        const bnbPositions = await getBNBUserPositions(account).catch(() => [])
        const allPositions = [
          ...bnbPositions.map((pos: any) => ({ ...pos, paymentToken: "BNB" as const }))
        ]

        const enrichedPositions = await Promise.all(
          allPositions.map(pos => fetchAndEnrichPosition(pos))
        )
        setPositions(enrichedPositions)
      }

      setSellDialogOpen(false)
    } catch (error) {
      console.error("Failed to sell tokens:", error)
    }
  }, [selectedSellMarket, sellTokenAmount, minOut, sellTokenType, sellTokens, account, getBNBUserPositions, fetchAndEnrichPosition])

  const handleSellAmountChange = useCallback((value: string) => {
    setSellTokenAmount(value)
    setEstimateAmount(value)
  }, [])

  const totalInvestment = Object.values(marketInvestments).reduce((acc, val) => acc + parseFloat(val || "0"), 0)
  const totalMarkets = positions.length
  const activeMarkets = positions.filter(pos => getMarketStatus(pos.market).isActive).length
  const resolvedMarkets = positions.filter(pos => getMarketStatus(pos.market).isResolved).length
  const inactiveMarkets = positions.filter(pos => !getMarketStatus(pos.market).isActive).length

  const copyToClipboard = useCallback((text: string) => { 
    navigator.clipboard.writeText(text) 
  }, [])

  const getBlockExplorerUrl = useCallback((address: string) => `https://testnet.bscscan.com/address/${address}`, [])

  const getPredictedOutcome = useCallback((yesPrice: number, noPrice: number): { outcomeText: string; confidence: number } => {
    if (yesPrice > noPrice) {
      return { outcomeText: "YES more likely", confidence: yesPrice / 100 }
    } else if (noPrice > yesPrice) {
      return { outcomeText: "NO more likely", confidence: noPrice / 100 }
    }
    return { outcomeText: "Even odds", confidence: 50 }
  }, [])

  const hasWinningTokens = useCallback((position: EnhancedUserPosition): boolean => {
    const market = position.market
    const marketStatus = getMarketStatus(market)
    
    if (!marketStatus.isResolved) {
      return false
    }
    
    const yesBalance = parseFloat(position.yesBalance || "0")
    const noBalance = parseFloat(position.noBalance || "0")
    
    if (market.outcome === Outcome.Yes && yesBalance > 0.0001) {
      return true
    }
    
    if (market.outcome === Outcome.No && noBalance > 0.0001) {
      return true
    }
    
    return false
  }, [])

  const calculatePotentialWinnings = useCallback((position: EnhancedUserPosition): string => {
    const market = position.market
    const marketStatus = getMarketStatus(market)
    
    if (!marketStatus.isResolved) {
      return "0"
    }
    
    const yesBalance = parseFloat(position.yesBalance || "0")
    const noBalance = parseFloat(position.noBalance || "0")
    
    if (market.outcome === Outcome.Yes && yesBalance > 0) {
      return yesBalance.toFixed(4)
    } else if (market.outcome === Outcome.No && noBalance > 0) {
      return noBalance.toFixed(4)
    }
    
    return "0"
  }, [])

  const totalWinnings = positions.reduce((total, position) => {
    if (hasWinningTokens(position)) {
      const winnings = parseFloat(calculatePotentialWinnings(position) || "0")
      return total + winnings
    }
    return total
  }, 0)

  if (!account) {
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

        <div className="relative z-10 bg-black/80 min-h-screen">
          <Header />
          <div className="max-w-4xl mx-auto px-4 py-12 text-center">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-muted flex items-center justify-center backdrop-blur-sm bg-card/80">
              <Wallet className="w-10 h-10 text-muted-foreground" />
            </div>
            <h1 className="text-3xl font-bold mb-4">Your Portfolio</h1>
            <p className="text-muted-foreground mb-6">Connect your wallet to view your trading positions and portfolio</p>
            <Button onClick={connectWallet} variant="outline" size="lg" className="backdrop-blur-sm bg-card/80">Connect Wallet</Button>
          </div>
        </div>
      </main>
    )
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

      <div className="relative z-10 bg-black/80 min-h-screen">
        <Header />
        <div className="max-w-6xl mx-auto px-4 py-8 ">
          <div className="mb-8 mt-[10vh]">
            <h1 className="text-3xl font-bold mb-2">Your Portfolio</h1>
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
              <div>
                <p className="text-muted-foreground mb-2 backdrop-blur-sm bg-card/80 p-2 rounded-lg inline-block">
                  Connected: {account.slice(0, 6)}...{account.slice(-4)}
                </p>
                <div className="flex flex-wrap gap-2">
                  {bnbContractAddress && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground backdrop-blur-sm bg-card/80 p-2 rounded-lg">
                      <span>BNB Contract: {bnbContractAddress.slice(0, 8)}...{bnbContractAddress.slice(-6)}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 hover:bg-muted"
                        onClick={() => copyToClipboard(bnbContractAddress)}
                      >
                        <Copy className="w-3 h-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 hover:bg-muted"
                        onClick={() => window.open(getBlockExplorerUrl(bnbContractAddress), '_blank')}
                      >
                        <ExternalLink className="w-3 h-3" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
              <Card className="p-4 bg-primary/5 border-primary/20 backdrop-blur-sm bg-card/80">
                <div className="flex items-center gap-2">
                  <Coins className="w-5 h-5 text-primary" />
                  <div>
                    <p className="text-sm text-muted-foreground">Total Investment</p>
                    <p className="text-xl font-bold">
                      {isLoading ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        `${totalInvestment.toFixed(4)} BNB`
                      )}
                    </p>
                  </div>
                </div>
              </Card>
            </div>
          </div>

          {positions.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <Card className="p-4 text-center overflow-hidden hover:shadow-lg hover:shadow-blue-500/50 hover:scale-[103%] transition-all cursor-pointer h-full border-2 hover:border-white/50">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Coins className="w-5 h-5 text-green-500" />
                  <span className="text-2xl font-bold">{totalInvestment.toFixed(4)}</span>
                </div>
                <p className="text-sm text-muted-foreground">Total Investment</p>
              </Card>
              <Card className="p-4 text-center overflow-hidden hover:shadow-lg hover:shadow-blue-500/50 hover:scale-[103%] transition-all cursor-pointer h-full border-2 hover:border-white/50">
                <div className="text-2xl font-bold mb-2">{totalMarkets}</div>
                <p className="text-sm text-muted-foreground">Markets Traded</p>
              </Card>
              <Card className="p-4 text-center overflow-hidden hover:shadow-lg hover:shadow-blue-500/50 hover:scale-[103%] transition-all cursor-pointer h-full border-2 hover:border-white/50">
                <div className="text-2xl font-bold mb-2">{activeMarkets}</div>
                <p className="text-sm text-muted-foreground">Active Positions</p>
              </Card>
              <Card className="p-4 text-center overflow-hidden hover:shadow-lg hover:shadow-blue-500/50 hover:scale-[103%] transition-all cursor-pointer h-full border-2 hover:border-white/50">
                <div className="text-2xl font-bold mb-2">{resolvedMarkets}</div>
                <p className="text-sm text-muted-foreground">Resolved</p>
              </Card>
            </div>
          )}

          {totalWinnings > 0 && (
            <Card className="mb-6 p-4 bg-gradient-to-r from-green-500 to-emerald-600 border-green-400 backdrop-blur-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-6 h-6 text-white" />
                  <div>
                    <p className="text-white font-semibold">Total Winnings Available</p>
                    <p className="text-white text-lg font-bold">{totalWinnings.toFixed(4)} BNB</p>
                  </div>
                </div>
                <div className="text-white text-sm">
                  Ready to claim from {positions.filter(pos => hasWinningTokens(pos)).length} market(s)
                </div>
              </div>
            </Card>
          )}

          {!isLoading && positions.length === 0 && (
            <Card className="p-12 text-center backdrop-blur-sm bg-card/80 bg-black/10">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
                <BarChart3 className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-semibold mb-2">No positions yet</h3>
              <p className="text-muted-foreground mb-6">You haven't traded in any prediction markets yet. Start trading to build your portfolio!</p>
              <div className="flex gap-4 justify-center">
                <Link href="/">
                  <Button className="backdrop-blur-sm bg-card/80">Browse Markets</Button>
                </Link>
                <Link href="/markets">
                  <Button variant="outline" className="backdrop-blur-sm bg-card/80">View All Markets</Button>
                </Link>
              </div>
            </Card>
          )}

          {!isLoading && positions.length > 0 && (
            <div className="grid gap-6">
              {positions.map((position, index) => {
                const investmentStr = marketInvestments[position.marketId] || "0"
                const investment = parseFloat(investmentStr)
                const odds = marketOdds[position.marketId] || { yesPrice: 5000, noPrice: 5000 }
                const predicted = getPredictedOutcome(odds.yesPrice, odds.noPrice)
                const market = position.market
                const marketStatus = getMarketStatus(market)
                const hasWinnings = hasWinningTokens(position)
                const potentialWinnings = calculatePotentialWinnings(position)
                const statusInfo = getMarketStatusInfo(market)
                
                // ✅ FIXED: Get active orders with proper typing
                const marketOrders: OrderInfo[] = getActiveOrdersForMarket(market.id)
                
                const marketPaymentToken = "BNB"

                const yesBalance = parseFloat(position.yesBalance || "0")
                const noBalance = parseFloat(position.noBalance || "0")
                const hasSellableTokens = (yesBalance > 0 || noBalance > 0) && marketStatus.isActive

                return (
                  <Card key={index} className={`p-6 hover:shadow-lg transition-shadow backdrop-blur-sm bg-card/80 ${
                    !marketStatus.isActive ? 'opacity-70 border-gray-400' : 'border-2'
                  }`}>
                    {!marketStatus.isActive && (
                      <div className="mb-4 p-3 bg-gray-100 border border-gray-300 rounded-lg flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-gray-600" />
                        <span className="text-sm text-gray-700">This market is no longer active for trading</span>
                      </div>
                    )}

                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <Link href={`/market/${market.id}`}>
                            <h3 className={`text-lg font-semibold hover:text-primary transition-colors cursor-pointer line-clamp-2 ${
                              !marketStatus.isActive ? 'text-gray-600' : ''
                            }`}>
                              {market.question}
                              {!marketStatus.isActive && (
                                <span className="ml-2 text-xs text-gray-500">(Inactive)</span>
                              )}
                            </h3>
                          </Link>
                          <div className="flex items-center gap-2">
                            <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${statusInfo.color} backdrop-blur-sm`}>
                              {statusInfo.label}
                            </span>
                            <span className="inline-block px-2 py-1 rounded-full text-xs font-medium bg-yellow-500 text-white backdrop-blur-sm">
                              BNB
                            </span>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                          <span>Market ID: {market.id}</span>
                          <span>Category: {market.category || "General"}</span>
                          <span>Token: BNB</span>
                          {marketStatus.isResolved && (
                            <span className="font-medium">
                              Outcome: {(() => {
                                switch (market.outcome as Outcome) {
                                  case Outcome.Yes: return "YES Won"
                                  case Outcome.No: return "NO Won"
                                  default: return "Pending"
                                }
                              })()}
                            </span>
                          )}
                          {!marketStatus.isActive && (
                            <span className="text-gray-500">• Inactive</span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">{statusInfo.description}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-4">
                      <div className={`rounded-lg p-3 border backdrop-blur-sm ${
                        marketStatus.isActive ? 'bg-primary/10 border-primary/20' : 'bg-primary/10 border-primary/20'
                      }`}>
                        <p className="text-xs text-muted-foreground mb-1">BNB Invested</p>
                        <p className={`text-lg font-bold flex items-center gap-1 ${
                          marketStatus.isActive ? 'text-primary' : 'text-gray-600'
                        }`}>
                          <Coins className="w-4 h-4" />{investment.toFixed(4)}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">Total in this market</p>
                      </div>
                      <div className={`rounded-lg p-3 border backdrop-blur-sm ${
                        marketStatus.isActive ? 'bg-primary/10 border-primary/20' : 'bg-primary/10 border-primary/20'
                      }`}>
                        <p className="text-xs text-muted-foreground mb-1">YES Tokens</p>
                        <p className={`text-lg font-bold flex items-center gap-1 ${
                          marketStatus.isActive ? 'text-green-600' : 'text-gray-600'
                        }`}>
                          {yesBalance.toFixed(4)}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          ≈ {(yesBalance * (odds.yesPrice || 50) / 100).toFixed(4)} BNB
                        </p>
                      </div>
                      <div className={`rounded-lg p-3 border backdrop-blur-sm ${
                        marketStatus.isActive ? 'bg-primary/10 border-primary/20' : 'bg-primary/10 border-primary/20'
                      }`}>
                        <p className="text-xs text-muted-foreground mb-1">NO Tokens</p>
                        <p className={`text-lg font-bold flex items-center gap-1 ${
                          marketStatus.isActive ? 'text-red-600' : 'text-gray-600'
                        }`}>
                          {noBalance.toFixed(4)}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          ≈ {(noBalance * (odds.noPrice || 50) / 100).toFixed(4)} BNB
                        </p>
                      </div>
                      <div className={`rounded-lg p-3 border backdrop-blur-sm ${
                        marketStatus.isActive ? 'bg-primary/10 border-primary/20' : 'bg-primary/10 border-primary/20'
                      }`}>
                        <p className="text-xs text-muted-foreground mb-1">Predicted Outcome</p>
                        <p className={`text-lg font-bold ${
                          marketStatus.isActive ? 'text-blue-600' : 'text-gray-600'
                        }`}>
                          {predicted.outcomeText}
                        </p>
                        <p className="text-xs text-muted-foreground">{predicted.confidence.toFixed(2)}% confidence</p>
                      </div>
                      <div className={`rounded-lg p-3 border backdrop-blur-sm ${
                        marketStatus.isActive ? 'bg-primary/10 border-primary/20' : 'bg-primary/10 border-primary/20'
                      }`}>
                        <p className="text-xs text-muted-foreground mb-1">Current Odds</p>
                        <div className="space-y-1">
                          <div className="flex justify-between text-sm">
                            <span className={marketStatus.isActive ? "text-green-600" : "text-gray-600"}>YES:</span>
                            <span className="font-medium">{(odds.yesPrice / 100).toFixed(1)}%</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className={marketStatus.isActive ? "text-red-600" : "text-gray-600"}>NO:</span>
                            <span className="font-medium">{(odds.noPrice / 100).toFixed(1)}%</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* ✅ FIXED: Active Orders Section with proper typing */}
                    {marketOrders && marketOrders.length > 0 && (
                      <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <Shield className="w-4 h-4 text-blue-600" />
                          <span className="text-sm font-medium text-blue-800">
                            {marketOrders.length} Active Order{marketOrders.length > 1 ? 's' : ''}
                          </span>
                        </div>
                        <div className="space-y-1">
                          {/* ✅ FIXED: Add explicit type annotation to order */}
                          {marketOrders.map((order: OrderInfo) => (
                            <div key={order.orderId} className="text-xs text-blue-700 flex items-center justify-between">
                              <span>
                                {order.orderType === 'StopLoss' ? '🛡️ Stop Loss' : '🎯 Take Profit'} - 
                                {order.isYes ? ' YES' : ' NO'} @ {(Number(order.stopLossPrice || order.takeProfitPrice) / 100).toFixed(1)}%
                              </span>
                              <span className="text-blue-600">{parseFloat(order.tokenAmount).toFixed(4)} tokens</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {marketStatus.isResolved && hasWinnings && (
                      <div className="mb-4 p-4 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <CheckCircle className="w-5 h-5 text-green-600" />
                            <div>
                              <p className="text-sm font-medium text-green-800">Winnings Available</p>
                              <p className="text-lg font-bold text-green-600">
                                {potentialWinnings} BNB
                              </p>
                              <p className="text-xs text-green-600">
                                {market.outcome === Outcome.Yes ? 'YES' : 'NO'} tokens can be redeemed for BNB
                              </p>
                            </div>
                          </div>
                          <Button 
                            size="sm" 
                            className="bg-green-600 hover:bg-green-700 backdrop-blur-sm flex items-center gap-2"
                            onClick={() => handleRedeem(market.id)}
                            disabled={redeemingMarketId === market.id.toString()}
                          >
                            {redeemingMarketId === market.id.toString() ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <CheckCircle className="w-4 h-4" />
                            )}
                            Claim {potentialWinnings} BNB
                          </Button>
                        </div>
                      </div>
                    )}

                    {marketStatus.isResolved && !hasWinnings && (
                      <div className="mb-4 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                          <p className="text-sm text-gray-600">
                            Market resolved - {market.outcome === Outcome.Yes ? 'YES' : 'NO'} won. 
                            {yesBalance > 0 || noBalance > 0 
                              ? " You don't have winning tokens for this outcome." 
                              : " You didn't participate in this market."}
                          </p>
                        </div>
                      </div>
                    )}

                    <div className="flex gap-3 flex-wrap">
                      <Link href={`/market/${market.id}`}>
                        <Button variant="outline" size="sm" className="backdrop-blur-sm bg-card/80">View Market</Button>
                      </Link>
                      
                      {marketStatus.isActive && (
                        <>
                          <Link href={`/market/${market.id}?tab=trade`}>
                            <Button variant="outline" size="sm" className="backdrop-blur-sm bg-card/80">Trade More</Button>
                          </Link>
                          
                          {yesBalance > 0 && (
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="backdrop-blur-sm bg-card/80 text-blue-600 hover:text-blue-700 border-blue-300 hover:border-blue-400"
                              onClick={() => handleOpenSellDialog(position, 'yes')}
                            >
                              <DollarSign className="w-4 h-4 mr-1" />
                              Sell YES
                            </Button>
                          )}
                          
                          {noBalance > 0 && (
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="backdrop-blur-sm bg-card/80 text-blue-600 hover:text-blue-700 border-blue-300 hover:border-blue-400"
                              onClick={() => handleOpenSellDialog(position, 'no')}
                            >
                              <DollarSign className="w-4 h-4 mr-1" />
                              Sell NO
                            </Button>
                          )}
                          
                          {hasSellableTokens && (
                            <>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="backdrop-blur-sm bg-card/80 text-orange-600 hover:text-orange-700 border-orange-300 hover:border-orange-400"
                                onClick={() => handleOpenOrderDialog(position, 'stopLoss')}
                              >
                                <TrendingDown className="w-4 h-4 mr-1" />
                                Stop Loss
                              </Button>
                              
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="backdrop-blur-sm bg-card/80 text-green-600 hover:text-green-700 border-green-300 hover:border-green-400"
                                onClick={() => handleOpenOrderDialog(position, 'takeProfit')}
                              >
                                <TrendingUp className="w-4 h-4 mr-1" />
                                Take Profit
                              </Button>
                            </>
                          )}
                        </>
                      )}
                    </div>
                  </Card>
                )
              })}
            </div>
          )}

          {isLoading && (
            <div className="flex justify-center py-12 backdrop-blur-sm bg-card/80 rounded-lg p-4">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <span className="ml-2 text-muted-foreground">Loading your portfolio...</span>
            </div>
          )}
        </div>
      </div>

      {/* Order Creation Dialog */}
      <Dialog open={orderDialogOpen} onOpenChange={setOrderDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {orderType === 'stopLoss' ? 'Create Stop Loss Order' : 'Create Take Profit Order'}
            </DialogTitle>
            <DialogDescription>
              {orderType === 'stopLoss' 
                ? 'Automatically sell your tokens if the price drops below a certain level to limit losses.'
                : 'Automatically sell your tokens when the price reaches your target to lock in profits.'
              }
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {selectedMarket && (
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm font-medium mb-1">Market</p>
                <p className="text-xs text-muted-foreground line-clamp-2">{selectedMarket.market.question}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Token: BNB
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label>Token Type</Label>
              <RadioGroup value={tokenType} onValueChange={(value: 'yes' | 'no') => setTokenType(value)}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="yes" id="yes" />
                  <Label htmlFor="yes" className="cursor-pointer">
                    YES Tokens ({positions.find(p => p.marketId === selectedMarket?.marketId)?.yesBalance || '0'} available)
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="no" id="no" />
                  <Label htmlFor="no" className="cursor-pointer">
                    NO Tokens ({positions.find(p => p.marketId === selectedMarket?.marketId)?.noBalance || '0'} available)
                  </Label>
                </div>
              </RadioGroup>
            </div>

            <div className="space-y-2">
              <Label htmlFor="tokenAmount">Token Amount</Label>
              <Input
                id="tokenAmount"
                type="number"
                step="0.0001"
                placeholder="0.0000"
                value={tokenAmount}
                onChange={(e) => setTokenAmount(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Enter the amount of tokens to include in this order
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="triggerPrice">
                {orderType === 'stopLoss' ? 'Stop Loss Price (basis points)' : 'Take Profit Price (basis points)'}
              </Label>
              <Input
                id="triggerPrice"
                type="number"
                placeholder={orderType === 'stopLoss' ? 'e.g., 4500 (45%)' : 'e.g., 15000 (150%)'}
                value={triggerPrice}
                onChange={(e) => setTriggerPrice(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                {orderType === 'stopLoss' 
                  ? 'Order executes when price drops to or below this level (10000 = 100%)'
                  : 'Order executes when price rises to or above this level (10000 = 100%)'
                }
              </p>
              <div className="text-xs text-muted-foreground space-y-1 mt-2">
                <p>Examples:</p>
                <p>• 4500 = 45% (stop loss at 45% of pool value)</p>
                <p>• 15000 = 150% (take profit at 1.5x)</p>
                <p>• 20000 = 200% (take profit at 2x)</p>
              </div>
            </div>

            {selectedMarket && marketOdds[selectedMarket.marketId] && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-xs font-medium text-blue-800 mb-2">Current Market Prices</p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-muted-foreground">YES: </span>
                    <span className="font-medium">{marketOdds[selectedMarket.marketId].yesPrice / 100}%</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">NO: </span>
                    <span className="font-medium">{marketOdds[selectedMarket.marketId].noPrice / 100}%</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setOrderDialogOpen(false)}
              disabled={bnbOrders.loading}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleCreateOrder}
              disabled={bnbOrders.loading || !tokenAmount || !triggerPrice}
            >
              {bnbOrders.loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  {orderType === 'stopLoss' ? (
                    <TrendingDown className="w-4 h-4 mr-2" />
                  ) : (
                    <TrendingUp className="w-4 h-4 mr-2" />
                  )}
                  Create Order
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Sell Tokens Dialog */}
      <Dialog open={sellDialogOpen} onOpenChange={setSellDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              Sell {sellTokenType === 'yes' ? 'YES' : 'NO'} Tokens
            </DialogTitle>
            <DialogDescription>
              Sell your {sellTokenType === 'yes' ? 'YES' : 'NO'} tokens back to the market for BNB.
            </DialogDescription>
          </DialogHeader>

          {sellError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600" />
              <span className="text-sm text-red-700">{sellError.message}</span>
            </div>
          )}

          {sellSuccess && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <span className="text-sm text-green-700">Tokens sold successfully!</span>
            </div>
          )}

          <div className="space-y-4 py-4">
            {selectedSellMarket && (
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm font-medium mb-1">Market</p>
                <p className="text-xs text-muted-foreground line-clamp-2">{selectedSellMarket.market.question}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Token: BNB
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="sellTokenAmount">Token Amount to Sell</Label>
              <Input
                id="sellTokenAmount"
                type="number"
                step="0.0001"
                placeholder="0.0000"
                value={sellTokenAmount}
                onChange={(e) => handleSellAmountChange(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Available: {sellTokenType === 'yes' 
                  ? positions.find(p => p.marketId === selectedSellMarket?.marketId)?.yesBalance || '0'
                  : positions.find(p => p.marketId === selectedSellMarket?.marketId)?.noBalance || '0'
                } {sellTokenType === 'yes' ? 'YES' : 'NO'} tokens
              </p>
            </div>

            {isEstimating && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                Calculating estimate...
              </div>
            )}

            {sellEstimate && !isEstimating && (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg space-y-2">
                <p className="text-sm font-medium text-blue-800">Estimated Output</p>
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">BNB to receive:</span>
                    <span className="font-bold text-blue-700">
                      {parseFloat(sellEstimate.bnbOut || "0").toFixed(6)} BNB
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Fee:</span>
                    <span className="text-muted-foreground">
                      {parseFloat(sellEstimate.fee || "0").toFixed(6)} BNB
                    </span>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="minOut">Minimum BNB Out (Slippage Protection)</Label>
              <Input
                id="minOut"
                type="number"
                step="0.000001"
                placeholder="0.000000"
                value={minOut}
                onChange={(e) => setMinOut(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Transaction will revert if you receive less than this amount. Default is 2% slippage.
              </p>
            </div>

            {selectedSellMarket && marketOdds[selectedSellMarket.marketId] && (
              <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                <p className="text-xs font-medium text-gray-800 mb-2">Current Market Prices</p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-muted-foreground">YES: </span>
                    <span className="font-medium">{marketOdds[selectedSellMarket.marketId].yesPrice / 100}%</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">NO: </span>
                    <span className="font-medium">{marketOdds[selectedSellMarket.marketId].noPrice / 100}%</span>
                  </div>
                </div>
              </div>
            )}

            {sellTxHash && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-xs font-medium text-green-800 mb-1">Transaction Hash</p>
                <div className="flex items-center gap-2">
                  <p className="text-xs text-green-700 font-mono truncate">{sellTxHash}</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={() => window.open(`https://testnet.bscscan.com/tx/${sellTxHash}`, '_blank')}
                  >
                    <ExternalLink className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setSellDialogOpen(false)}
              disabled={isSelling}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSellTokens}
              disabled={isSelling || !sellTokenAmount || !minOut || parseFloat(sellTokenAmount) <= 0}
            >
              {isSelling ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Selling...
                </>
              ) : (
                <>
                  <DollarSign className="w-4 h-4 mr-2" />
                  Sell for BNB
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  )
}