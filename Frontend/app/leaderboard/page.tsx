// app/leaderboard/page.tsx
"use client"

import { useState, useEffect, useCallback } from "react"
import Header from "@/components/header"
import Footer from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Trophy, Medal, ArrowLeft, Wallet, Loader2, TrendingUp, Users, BarChart3, ExternalLink } from "lucide-react"
import { useRouter } from "next/navigation"
import { ethers } from "ethers"
import LightRays from "@/components/LightRays"

// Import ABIs from JSON files - extract the ABI from artifacts
import PREDICTION_MARKET_ARTIFACT from "@/contracts/abi.json"
import HELPER_CONTRACT_ARTIFACT from "@/contracts/helperABI.json"


// Helper function to extract ABI
const extractABI = (artifact: any): ethers.InterfaceAbi => {
  return ('abi' in artifact ? artifact.abi : artifact) as ethers.InterfaceAbi
}

// Extract ABI from artifacts
const PREDICTION_MARKET_ABI = extractABI(PREDICTION_MARKET_ARTIFACT)
const HELPER_CONTRACT_ABI = extractABI(HELPER_CONTRACT_ARTIFACT)

// Contract addresses and RPC URL
const PREDICTION_MARKET_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS
const HELPER_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_HELPER_CONTRACT_ADDRESS
const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL || 'https://data-seed-prebsc-1-s1.binance.org:8545'

interface UserStats {
  address: string
  totalMarketsTraded: number
  totalVolume: number
  currentPortfolioValue: number
  realizedPnl: number
  unrealizedPnl: number
  totalPnl: number
  winningMarkets: number
  activePositions: number
  favoriteCategory: string
  totalInvestment: string
}

interface MarketPosition {
  marketId: number
  question: string
  category: string
  yesTokens: number
  noTokens: number
  currentValue: number
  investedAmount: number
  potentialPnl: number
  status: "Active" | "Resolved" | "Cancelled"
  yesPrice: number
  noPrice: number
  marketStatus: number
  endTime: number
}

interface Market {
  id: number
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
}

export default function Leaderboard() {
  const router = useRouter()
  const [userStats, setUserStats] = useState<UserStats[]>([])
  const [userPositions, setUserPositions] = useState<{ [key: string]: MarketPosition[] }>({})
  const [isLoading, setIsLoading] = useState(false)
  const [timeframe, setTimeframe] = useState<"all" | "weekly" | "monthly">("all")
  const [uniqueTraders, setUniqueTraders] = useState<string[]>([])
  const [markets, setMarkets] = useState<Market[]>([])
  const [error, setError] = useState<string | null>(null)

  // Create read-only contract instances
  const getReadOnlyContracts = useCallback(() => {
    if (!PREDICTION_MARKET_ADDRESS || !HELPER_CONTRACT_ADDRESS) {
      throw new Error('Contract addresses not configured in environment variables')
    }

    try {
      const provider = new ethers.JsonRpcProvider(RPC_URL)
      const marketContract = new ethers.Contract(PREDICTION_MARKET_ADDRESS, PREDICTION_MARKET_ABI, provider)
      const helperContract = new ethers.Contract(HELPER_CONTRACT_ADDRESS, HELPER_CONTRACT_ABI, provider)
      return { marketContract, helperContract, provider }
    } catch (error) {
      console.error('Error creating read-only contracts:', error)
      throw error
    }
  }, [])

  // Fetch all markets
  const fetchAllMarkets = useCallback(async (): Promise<Market[]> => {
    if (!PREDICTION_MARKET_ADDRESS) {
      console.error("Contract address not configured")
      return []
    }

    try {
      console.log("📋 Fetching all markets from contract...")
      const { marketContract } = getReadOnlyContracts()
      
      const nextId = await marketContract.nextMarketId()
      const marketCount = Number(nextId)
      console.log(`Found ${marketCount} markets on chain`)
      
      if (marketCount === 0) {
        console.log("No markets found on chain")
        return []
      }

      const marketPromises: Promise<Market | null>[] = []
      for (let i = 0; i < marketCount; i++) {
        marketPromises.push(getMarket(i))
      }

      const marketsData = await Promise.all(marketPromises)
      const validMarkets = marketsData.filter((market): market is Market => 
        market !== null && market.question !== undefined && market.question !== ''
      )
      
      console.log(`✅ Successfully loaded ${validMarkets.length} valid markets`)
      return validMarkets
      
    } catch (error) {
      console.error("❌ Error fetching all markets:", error)
      throw error
    }
  }, [getReadOnlyContracts])

  // Get individual market
  const getMarket = useCallback(async (marketId: number): Promise<Market | null> => {
    try {
      const { marketContract } = getReadOnlyContracts()
      const marketData = await marketContract.markets(marketId)
      
      let question = marketData[1] || `Market ${marketId}`
      if (typeof question === 'string' && question.startsWith('"') && question.endsWith('"')) {
        question = question.slice(1, -1)
      }

      const market: Market = {
        id: marketId,
        creator: marketData[0] || "0x0000000000000000000000000000000000000000",
        question: question,
        category: marketData[2] || "General",
        endTime: Number(marketData[3] || 0),
        status: Number(marketData[4] || 0),
        outcome: Number(marketData[5] || 0),
        yesToken: marketData[6] || "0x0000000000000000000000000000000000000000",
        noToken: marketData[7] || "0x0000000000000000000000000000000000000000",
        yesPool: ethers.formatEther(marketData[8] || 0),
        noPool: ethers.formatEther(marketData[9] || 0),
        lpTotalSupply: ethers.formatEther(marketData[10] || 0),
        totalBacking: ethers.formatEther(marketData[11] || 0),
        platformFees: ethers.formatEther(marketData[12] || 0),
        resolutionRequestedAt: Number(marketData[13] || 0),
        disputeDeadline: Number(marketData[17] || 0),
        resolutionReason: marketData[15] || '',
        resolutionConfidence: Number(marketData[16] || 0),
      }

      return market
    } catch (error) {
      console.error(`Error fetching market ${marketId}:`, error)
      return null
    }
  }, [getReadOnlyContracts])

  // Helper function to get market status text
  const getMarketStatusText = (status: number, endTime: number): "Active" | "Resolved" | "Cancelled" => {
    const resolutionDate = new Date(endTime * 1000)
    const now = new Date()
    
    if (status === 0 && resolutionDate > now) {
      return "Active"
    } else if (status === 1) {
      return "Resolved"
    } else if (status === 2) {
      return "Cancelled"
    } else {
      return "Resolved"
    }
  }

  // Helper function to check if market is active
  const isMarketActive = (status: number, endTime: number): boolean => {
    const resolutionDate = new Date(endTime * 1000)
    const now = new Date()
    return status === 0 && resolutionDate > now
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

  // Get all traders from markets
  const fetchAllTraders = useCallback(async (markets: Market[]): Promise<string[]> => {
    try {
      const traders = new Set<string>()
      
      // Get market creators
      markets.forEach(market => {
        if (market && market.creator && market.creator !== "0x0000000000000000000000000000000000000000") {
          traders.add(market.creator.toLowerCase())
        }
      })

      console.log(`👥 Found ${traders.size} traders from market creators`)
      return Array.from(traders)

    } catch (error) {
      console.error("❌ Error fetching traders:", error)
      return []
    }
  }, [])

  // Get user positions from helper contract
  const getUserPositions = useCallback(async (address: string): Promise<any[]> => {
    try {
      const { helperContract } = getReadOnlyContracts()
      const positions = await helperContract.getUserPositions(address)
      const formattedPositions = []

      for (const pos of positions) {
        try {
          const market = await getMarket(Number(pos.marketId))
          if (market) {
            formattedPositions.push({
              market,
              yesBalance: ethers.formatEther(pos.yesBalance),
              noBalance: ethers.formatEther(pos.noBalance),
              bnbInvested: ethers.formatEther(pos.bnbInvested)
            })
          }
        } catch (error) {
          console.warn(`Error processing position for market ${pos.marketId}:`, error)
        }
      }

      return formattedPositions
    } catch (error) {
      console.error(`Error fetching positions for ${address}:`, error)
      return []
    }
  }, [getReadOnlyContracts, getMarket])

  // Get total investment for a user
  const getTotalInvestment = useCallback(async (address: string): Promise<string> => {
    try {
      const { helperContract } = getReadOnlyContracts()
      const totalInvestment = await helperContract.getUserTotalInvestment(address)
      return ethers.formatEther(totalInvestment)
    } catch (error) {
      console.error(`Error fetching total investment for ${address}:`, error)
      return "0"
    }
  }, [getReadOnlyContracts])

  // Calculate user statistics
  const calculateUserStats = useCallback(async (address: string): Promise<UserStats> => {
    try {
      const positions = await getUserPositions(address)
      const totalInvestmentBNB = await getTotalInvestment(address)
      
      let totalVolume = 0
      let currentPortfolioValue = 0
      let realizedPnl = 0
      let unrealizedPnl = 0
      let winningMarkets = 0
      let activePositions = 0
      const categoryCount: { [key: string]: number } = {}

      // Calculate metrics from positions
      for (const position of positions) {
        const prices = calculatePrices(position.market.yesPool, position.market.noPool)
        const yesValue = parseFloat(position.yesBalance) * prices.yesPrice / 100
        const noValue = parseFloat(position.noBalance) * prices.noPrice / 100
        const positionValue = yesValue + noValue
        const invested = parseFloat(position.bnbInvested)
        
        totalVolume += invested
        currentPortfolioValue += positionValue
        
        // Calculate PnL
        const positionPnl = positionValue - invested
        if (positionPnl > 0) {
          unrealizedPnl += positionPnl
        }

        // Count active positions
        if (isMarketActive(position.market.status, position.market.endTime)) {
          activePositions++
        }

        // Track category
        const category = position.market.category || "General"
        categoryCount[category] = (categoryCount[category] || 0) + 1
      }

      // Determine favorite category
      const favoriteCategory = Object.entries(categoryCount)
        .sort(([,a], [,b]) => b - a)[0]?.[0] || "General"

      const totalPnl = realizedPnl + unrealizedPnl

      const stats: UserStats = {
        address,
        totalMarketsTraded: positions.length,
        totalVolume,
        currentPortfolioValue,
        realizedPnl,
        unrealizedPnl,
        totalPnl,
        winningMarkets,
        activePositions,
        favoriteCategory,
        totalInvestment: totalInvestmentBNB
      }

      return stats

    } catch (error) {
      console.error(`Error calculating stats for ${address}:`, error)
      return {
        address,
        totalMarketsTraded: 0,
        totalVolume: 0,
        currentPortfolioValue: 0,
        realizedPnl: 0,
        unrealizedPnl: 0,
        totalPnl: 0,
        winningMarkets: 0,
        activePositions: 0,
        favoriteCategory: "General",
        totalInvestment: "0"
      }
    }
  }, [getUserPositions, getTotalInvestment])

  // Fetch market positions for a user
  const fetchUserMarketPositions = useCallback(async (address: string): Promise<MarketPosition[]> => {
    try {
      const positions = await getUserPositions(address)
      
      return positions.map(position => {
        const prices = calculatePrices(position.market.yesPool, position.market.noPool)
        
        return {
          marketId: position.market.id,
          question: position.market.question,
          category: position.market.category || "General",
          yesTokens: parseFloat(position.yesBalance),
          noTokens: parseFloat(position.noBalance),
          currentValue: parseFloat(position.yesBalance) * prices.yesPrice / 100 + 
                       parseFloat(position.noBalance) * prices.noPrice / 100,
          investedAmount: parseFloat(position.bnbInvested),
          potentialPnl: (parseFloat(position.yesBalance) * prices.yesPrice / 100 + 
                        parseFloat(position.noBalance) * prices.noPrice / 100) - 
                       parseFloat(position.bnbInvested),
          status: getMarketStatusText(position.market.status, position.market.endTime),
          marketStatus: position.market.status,
          endTime: position.market.endTime,
          yesPrice: prices.yesPrice,
          noPrice: prices.noPrice
        }
      })

    } catch (error) {
      console.error(`Error fetching positions for ${address}:`, error)
      return []
    }
  }, [getUserPositions])

  // Main data fetching function
  const fetchLeaderboardData = useCallback(async () => {
    if (!PREDICTION_MARKET_ADDRESS || !HELPER_CONTRACT_ADDRESS) {
      setError("Contract addresses not configured. Please check environment variables.")
      return
    }

    setIsLoading(true)
    setError(null)
    
    try {
      console.log("🚀 Starting to fetch leaderboard data...")
      
      // 1. Fetch all markets
      const allMarkets = await fetchAllMarkets()
      setMarkets(allMarkets)

      if (allMarkets.length === 0) {
        setError("No markets found on the blockchain")
        setUserStats([])
        setIsLoading(false)
        return
      }

      // 2. Get all unique traders
      const allTraders = await fetchAllTraders(allMarkets)
      setUniqueTraders(allTraders)

      if (allTraders.length === 0) {
        setError("No traders found on the blockchain")
        setUserStats([])
        setIsLoading(false)
        return
      }

      // 3. Calculate stats for each trader (limit for performance)
      const tradersToProcess = allTraders.slice(0, 15)
      console.log(`📊 Processing ${tradersToProcess.length} traders...`)
      
      const statsPromises = tradersToProcess.map(trader => calculateUserStats(trader))
      const allStats = await Promise.all(statsPromises)

      // 4. Filter out traders with no activity and sort by total PnL
      const activeTraders = allStats.filter(stats => 
        stats.totalMarketsTraded > 0 || parseFloat(stats.totalInvestment) > 0
      )
      
      activeTraders.sort((a, b) => b.totalPnl - a.totalPnl)
      console.log(`✅ Active traders with positions: ${activeTraders.length}`)

      setUserStats(activeTraders)

      // 5. Fetch positions for top traders
      const topTraders = activeTraders.slice(0, 8)
      const positionsData: { [key: string]: MarketPosition[] } = {}

      for (const trader of topTraders) {
        try {
          const positions = await fetchUserMarketPositions(trader.address)
          positionsData[trader.address] = positions.slice(0, 2)
        } catch (error) {
          console.warn(`Error fetching positions for ${trader.address}:`, error)
          positionsData[trader.address] = []
        }
      }

      setUserPositions(positionsData)
      console.log("🎉 Leaderboard data loaded successfully")

    } catch (err: any) {
      console.error("❌ Error fetching leaderboard data:", err)
      setError(err.message || 'Failed to load leaderboard data from blockchain')
      setUserStats([])
    } finally {
      setIsLoading(false)
    }
  }, [PREDICTION_MARKET_ADDRESS, HELPER_CONTRACT_ADDRESS, fetchAllMarkets, fetchAllTraders, calculateUserStats, fetchUserMarketPositions])

  // Auto-load data on mount
  useEffect(() => {
    fetchLeaderboardData()
  }, [fetchLeaderboardData])

  const refreshData = useCallback(async () => {
    await fetchLeaderboardData()
  }, [fetchLeaderboardData])

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

  const getRankColor = (rank: number) => {
    switch (rank) {
      case 0: return "text-yellow-500"
      case 1: return "text-gray-400"
      case 2: return "text-orange-600"
      default: return "text-blue-500"
    }
  }

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 0: return <Trophy className="w-5 h-5" />
      case 1: return <Medal className="w-5 h-5" />
      case 2: return <Medal className="w-5 h-5" />
      default: return <span className="text-sm font-bold">{rank + 1}</span>
    }
  }

  // Count active markets
  const activeMarketsCount = markets.filter(market => 
    isMarketActive(market.status, market.endTime)
  ).length

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

        <div className="max-w-7xl mx-auto px-4 py-8">
          {/* Header */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 mt-[10vh]">
            <div className="flex items-center mb-4 md:mb-0">
              <Button
                variant="ghost"
                onClick={() => router.push("/")}
                className="mr-4 backdrop-blur-sm bg-card/80"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="text-3xl md:text-4xl font-bold mb-2">Trading Leaderboard</h1>
                <p className="text-muted-foreground backdrop-blur-sm bg-card/80 p-2 rounded-lg inline-block">
                  Live rankings from GoPredix - No wallet needed to view
                </p>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={refreshData}
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
                  "Refresh Data"
                )}
              </Button>
              <Button
                variant={timeframe === "all" ? "outline" : "default"}
                onClick={() => setTimeframe("all")}
                size="sm"
                className="backdrop-blur-sm bg-card/80"
              >
                All Time
              </Button>
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg backdrop-blur-sm bg-card/80">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-red-800 font-semibold">Error Loading Data</h3>
                  <p className="text-red-700 text-sm mt-1">{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* Stats Overview */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <Card className="backdrop-blur-sm bg-card/80 hover:border-white/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total Traders</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center">
                  <Users className="w-8 h-8 text-primary mr-2" />
                  <div className="text-2xl font-bold">{uniqueTraders.length}</div>
                </div>
              </CardContent>
            </Card>
            <Card className="backdrop-blur-sm bg-card/80 hover:border-white/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Active Markets</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center">
                  <BarChart3 className="w-8 h-8 text-primary mr-2" />
                  <div className="text-2xl font-bold">
                    {activeMarketsCount}
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="backdrop-blur-sm bg-card/80 hover:border-white/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total Volume</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center">
                  <TrendingUp className="w-8 h-8 text-primary mr-2" />
                  <div className="text-2xl font-bold">
                    ${userStats.reduce((sum, user) => sum + user.totalVolume, 0).toLocaleString()}
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="backdrop-blur-sm bg-card/80 hover:border-white/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total P&L</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center">
                  <Trophy className="w-8 h-8 text-primary mr-2" />
                  <div className={`text-2xl font-bold ${
                    userStats.reduce((sum, user) => sum + user.totalPnl, 0) >= 0 
                      ? "text-green-600" 
                      : "text-red-600"
                  }`}>
                    {userStats.reduce((sum, user) => sum + user.totalPnl, 0) >= 0 ? "+" : ""}
                    ${userStats.reduce((sum, user) => sum + user.totalPnl, 0).toLocaleString()}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Loading State */}
          {isLoading && (
            <div className="flex justify-center items-center py-12 backdrop-blur-sm bg-card/80 rounded-lg">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <span className="ml-2 text-muted-foreground">Loading leaderboard data from Gopredix...</span>
            </div>
          )}

          {/* Leaderboard Table */}
          {!isLoading && !error && userStats.length > 0 && (
            <Card className="backdrop-blur-sm bg-card/80 hover:shadow-blue-500/50">
              <CardHeader>
                <CardTitle>Top Traders</CardTitle>
                <CardDescription>
                  Ranked by total profit & loss across all markets. Live data from GoPredix contracts.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {userStats.map((user, index) => (
                    <div
                      key={user.address}
                      className="p-4 rounded-lg border backdrop-blur-sm bg-card/60"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className={`w-8 h-8 flex items-center justify-center ${getRankColor(index)}`}>
                            {getRankIcon(index)}
                          </div>
                          <div>
                            <div className="flex items-center space-x-2">
                              <span className="font-semibold">
                                {formatAddress(user.address)}
                              </span>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="backdrop-blur-sm bg-card/80"
                                onClick={() => window.open(`https://testnet.bscscan.com/address/${user.address}`, '_blank')}
                              >
                                <ExternalLink className="w-3 h-3" />
                              </Button>
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {user.totalMarketsTraded} markets • {user.activePositions} active
                            </div>
                          </div>
                        </div>

                        <div className="text-right">
                          <div className={`text-lg font-bold ${
                            user.totalPnl >= 0 ? "text-green-600" : "text-red-600"
                          }`}>
                            {user.totalPnl >= 0 ? "+" : ""}${user.totalPnl.toFixed(2)}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Invested: {parseFloat(user.totalInvestment).toFixed(4)} BNB
                          </div>
                        </div>
                      </div>

                      {/* User Stats Details */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Volume: </span>
                          <span className="font-medium">${user.totalVolume.toFixed(2)}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Portfolio: </span>
                          <span className="font-medium">${user.currentPortfolioValue.toFixed(2)}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Unrealized: </span>
                          <span className={`font-medium ${
                            user.unrealizedPnl >= 0 ? "text-green-600" : "text-red-600"
                          }`}>
                            {user.unrealizedPnl >= 0 ? "+" : ""}${user.unrealizedPnl.toFixed(2)}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Favorite: </span>
                          <Badge variant="outline" className="backdrop-blur-sm">{user.favoriteCategory}</Badge>
                        </div>
                      </div>

                      {/* Active Positions */}
                      {userPositions[user.address] && userPositions[user.address].length > 0 && (
                        <div className="mt-4">
                          <h4 className="text-sm font-medium mb-2">Recent Positions:</h4>
                          <div className="space-y-2">
                            {userPositions[user.address].map((position, posIndex) => (
                              <div key={posIndex} className="flex justify-between items-center text-sm p-2 bg-muted/10 rounded backdrop-blur-sm">
                                <div className="flex-1">
                                  <div className="font-medium truncate">{position.question}</div>
                                  <div className="text-xs text-muted-foreground">
                                    {position.category} • 
                                    <Badge 
                                      variant={position.status === "Active" ? "secondary" : "secondary"} 
                                      className="ml-1 mr-1 backdrop-blur-sm"
                                    >
                                      {position.status}
                                    </Badge>
                                    • YES: {position.yesPrice.toFixed(1)}% • NO: {position.noPrice.toFixed(1)}%
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className={`font-medium ${
                                    position.potentialPnl >= 0 ? "text-green-600" : "text-red-600"
                                  }`}>
                                    {position.potentialPnl >= 0 ? "+" : ""}${position.potentialPnl.toFixed(2)}
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    Value: ${position.currentValue.toFixed(2)}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Empty State */}
          {!isLoading && !error && userStats.length === 0 && (
            <Card className="backdrop-blur-sm bg-card/80">
              <CardContent className="py-12">
                <div className="text-center">
                  <Trophy className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-xl font-semibold mb-2">No Trading Activity Yet</h3>
                  <p className="text-muted-foreground mb-6">
                    Be the first to trade prediction markets and appear on the leaderboard!
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <Button onClick={() => router.push("/")} variant="outline" className="backdrop-blur-sm bg-card/80">
                      View Markets
                    </Button>
                    <Button onClick={() => router.push("/")} className="backdrop-blur-sm bg-card/80">
                      Start Trading
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Info Note */}
          {!isLoading && !error && (
            <div className="mt-4 text-center text-sm text-muted-foreground backdrop-blur-sm bg-card/80 p-2 rounded-lg">
              <p>Live data from GoPredix contracts</p>
            </div>
          )}
        </div>

        <Footer />
      </div>
    </main>
  )
}