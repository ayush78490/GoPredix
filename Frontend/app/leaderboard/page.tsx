// app/leaderboard/page.tsx
"use client"

import { useState, useEffect } from "react"
import Header from "@/components/header"
import Footer from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Trophy, Medal, ArrowLeft, Wallet, Loader2, TrendingUp, Users, BarChart3, ExternalLink } from "lucide-react"
import { useWeb3Context } from "@/lib/wallet-context"
import { usePredictionMarket } from "@/hooks/use-predection-market"
import { useAllMarkets } from "@/hooks/getAllMarkets"
import { useRouter } from "next/navigation"
import { ethers } from "ethers"
import LightRays from "@/components/LightRays"

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
  marketStatus: number // Raw status from contract
  endTime: number // Add endTime for active status calculation
}

export default function Leaderboard() {
  const router = useRouter()
  const { account, isCorrectNetwork, isInitialized, provider } = useWeb3Context()
  const { markets, isLoading: marketsLoading, refreshMarkets } = useAllMarkets()
  const { 
    getUserPositions, 
    getMarketInvestment, 
    getTotalInvestment,
    getMarket,
    contract 
  } = usePredictionMarket()

  const [userStats, setUserStats] = useState<UserStats[]>([])
  const [userPositions, setUserPositions] = useState<{ [key: string]: MarketPosition[] }>({})
  const [isLoading, setIsLoading] = useState(true)
  const [timeframe, setTimeframe] = useState<"all" | "weekly" | "monthly">("all")
  const [uniqueTraders, setUniqueTraders] = useState<string[]>([])

  // Helper function to get market status text - matching your home page logic
  const getMarketStatusText = (status: number, endTime: number): "Active" | "Resolved" | "Cancelled" => {
    const resolutionDate = new Date(endTime * 1000)
    const now = new Date()
    
    // Use the same logic as your home page: status === 0 AND resolutionDate > now
    if (status === 0 && resolutionDate > now) {
      return "Active"
    } else if (status === 1) {
      return "Resolved"
    } else if (status === 2) {
      return "Cancelled"
    } else {
      // If status is 0 but resolution date has passed, consider it Resolved
      return "Resolved"
    }
  }

  // Helper function to check if market is active - matching your home page logic
  const isMarketActive = (status: number, endTime: number): boolean => {
    const resolutionDate = new Date(endTime * 1000)
    const now = new Date()
    
    // Same logic as your home page: status === 0 AND resolutionDate > now
    return status === 0 && resolutionDate > now
  }

  // Calculate prices from pool data - same as your home page
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

    // Fetch traders from available events (BuyWithBNB and Swap)
    const fetchTradersFromEvents = async (): Promise<string[]> => {
    if (!contract) return []

    try {
        const traders = new Set<string>()

        // Get market creators
        for (let i = 0; i < markets.length; i++) {
        try {
            const market = await getMarket(i)
            traders.add(market.creator.toLowerCase())
        } catch (error) {
            console.warn(`⚠️ Error getting market ${i}:`, error)
        }
        }

        // Try to get traders from BuyWithBNB events (if any)
        try {
        const buyWithBNBFilter = contract.filters.BuyWithBNB()
        const buyEvents = await contract.queryFilter(buyWithBNBFilter, 0, 'latest')
        
        buyEvents.forEach(event => {
            // Handle both EventLog and Log types
            if ('args' in event && event.args) {
            // For EventLog with args
            const user = event.args[1] // user is the second parameter in BuyWithBNB event
            if (user && typeof user === 'string') {
                traders.add(user.toLowerCase())
            }
            }
        })

        } catch (error) {
        console.warn("⚠️ Could not fetch BuyWithBNB events:", error)
        }

        // Try to get traders from Swap events (if any)
        try {
        const swapFilter = contract.filters.Swap()
        const swapEvents = await contract.queryFilter(swapFilter, 0, 'latest')
        
        swapEvents.forEach(event => {
            if ('args' in event && event.args) {
            // For EventLog with args
            const user = event.args[1] // user is the second parameter in Swap event
            if (user && typeof user === 'string') {
                traders.add(user.toLowerCase())
            }
            }
        })

        } catch (error) {
        console.warn("⚠️ Could not fetch Swap events:", error)
        }

        // Add current user if they're connected but haven't traded yet
        if (account && !traders.has(account.toLowerCase())) {
        traders.add(account.toLowerCase())
        }

        const traderArray = Array.from(traders)

        return traderArray

    } catch (error) {
        console.error("❌ Error fetching traders from events:", error)
        return []
    }
    }

  // Enhanced function to get all traders by scanning user investments
  const fetchAllTradersFromInvestments = async (): Promise<string[]> => {
    if (!contract) return []

    try {
      const traders = new Set<string>()
      const marketCount = markets.length

      // Check each market for users with investments
      for (let marketId = 0; marketId < marketCount; marketId++) {
        try {
          // Get market creator
          const market = await getMarket(marketId)
          traders.add(market.creator.toLowerCase())

          // Note: In a production environment, you would:
          // 1. Use TheGraph for efficient event querying
          // 2. Or implement an off-chain indexer
          // 3. Or add a getTraders function to the contract

        } catch (error) {
          console.warn(`⚠️ Error processing market ${marketId} for traders:`, error)
        }
      }

      // Add simulated traders for demonstration (remove in production)
      const simulatedTraders = [
        "0x742d35Cc6634C0532925a3b8Dc9F5a4f2d2b2b2b",
        "0x8932d35Cc6634C0532925a3b8Dc9F5a4f2d2b2b2b",
        "0x4563d35Cc6634C0532925a3b8Dc9F5a4f2d2b2b2b",
        "0x7891d35Cc6634C0532925a3b8Dc9F5a4f2d2b2b2b",
        "0x1234d35Cc6634C0532925a3b8Dc9F5a4f2d2b2b2b"
      ]

      simulatedTraders.forEach(trader => traders.add(trader.toLowerCase()))
      
      const traderArray = Array.from(traders)
      
      return traderArray

    } catch (error) {
      console.error("❌ Error scanning for traders:", error)
      return []
    }
  }

  // Calculate user statistics from real contract data
  const calculateUserStats = async (address: string): Promise<UserStats> => {
    try {
      
      
      // Get user positions from contract
      const positions = await getUserPositions(address)
      
      // Get total investment from contract
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
        const yesValue = parseFloat(position.yesBalance) * (position.market.yesPrice || 50) / 100
        const noValue = parseFloat(position.noBalance) * (position.market.noPrice || 50) / 100
        const positionValue = yesValue + noValue
        const invested = parseFloat(position.bnbInvested)
        
        totalVolume += invested
        currentPortfolioValue += positionValue
        
        // Calculate PnL
        const positionPnl = positionValue - invested
        if (positionPnl > 0) {
          unrealizedPnl += positionPnl
        }

        // Count active positions using the same logic as home page
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
      console.error(`❌ Error calculating stats for ${address}:`, error)
      // Return default stats if there's an error
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
  }

  // Fetch market positions for a user
  const fetchUserMarketPositions = async (address: string): Promise<MarketPosition[]> => {
    try {
      const positions = await getUserPositions(address)
      
      return positions.map(position => {
        // Calculate prices using the same logic as home page
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
          endTime: position.market.endTime, // Store endTime for reference
          yesPrice: prices.yesPrice,
          noPrice: prices.noPrice
        }
      })

    } catch (error) {
      console.error(`❌ Error fetching positions for ${address}:`, error)
      return []
    }
  }

  // Main data fetching function
  const fetchLeaderboardData = async () => {
    if (!contract || !markets.length) {
      
      return
    }

    setIsLoading(true)
    try {
      
      
      // 1. Get all unique traders using multiple methods
      const tradersFromEvents = await fetchTradersFromEvents()
      const tradersFromInvestments = await fetchAllTradersFromInvestments()
      
      // Combine both methods and remove duplicates
      const allTraders = Array.from(new Set([
        ...tradersFromEvents,
        ...tradersFromInvestments
      ]))
      
      setUniqueTraders(allTraders)

      // 2. Calculate stats for each trader (limit to first 20 for performance)
      const tradersToProcess = allTraders.slice(0, 20)
      const statsPromises = tradersToProcess.map(trader => calculateUserStats(trader))
      const allStats = await Promise.all(statsPromises)

      // 3. Filter out traders with no activity and sort by total PnL
      const activeTraders = allStats.filter(stats => 
        stats.totalMarketsTraded > 0 || parseFloat(stats.totalInvestment) > 0
      )
      activeTraders.sort((a, b) => b.totalPnl - a.totalPnl)

      setUserStats(activeTraders)

      // 4. Fetch positions for top traders (limit to avoid too many requests)
      const topTraders = activeTraders.slice(0, 10)
      const positionsData: { [key: string]: MarketPosition[] } = {}

      for (const trader of topTraders) {
        try {
          const positions = await fetchUserMarketPositions(trader.address)
          positionsData[trader.address] = positions.slice(0, 3) // Limit to 3 positions per trader
        } catch (error) {
          console.warn(`⚠️ Error fetching positions for ${trader.address}:`, error)
          positionsData[trader.address] = []
        }
      }

      setUserPositions(positionsData)
      

    } catch (error) {
      console.error("❌ Error fetching leaderboard data:", error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (contract && markets.length > 0 && isCorrectNetwork) {
      fetchLeaderboardData()
    }
  }, [contract, markets.length, isCorrectNetwork])

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

  const refreshData = () => {
    refreshMarkets()
    fetchLeaderboardData()
  }

  // Count active markets using the same logic as home page
  const activeMarketsCount = markets.filter(market => 
    isMarketActive(market.status, market.endTime)
  ).length

  if (!isInitialized) {
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
          <div className="flex justify-center items-center py-12 backdrop-blur-sm bg-card/80 rounded-lg m-4">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <span className="ml-2 text-muted-foreground">Initializing...</span>
          </div>
        </div>
      </main>
    )
  }

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
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
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
                  Real-time rankings based on actual trading performance
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

          {/* Network Warning */}
          {account && !isCorrectNetwork && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg backdrop-blur-sm bg-card/80">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-red-800 font-semibold">Wrong Network</h3>
                  <p className="text-red-700 text-sm mt-1">
                    Please switch to BSC Testnet to view the leaderboard.
                  </p>
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
                <CardTitle className="text-sm font-medium ">Active Markets</CardTitle>
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
              <span className="ml-2 text-muted-foreground">Loading leaderboard data from GoPredix...</span>
            </div>
          )}

          {/* Leaderboard Table */}
          {!isLoading && userStats.length > 0 && (
            <Card className="backdrop-blur-sm bg-card/80 hover:shadow-blue-500/50">
              <CardHeader>
                <CardTitle>Top Traders</CardTitle>
                <CardDescription>
                  Ranked by total profit & loss across all markets. Data fetched directly from GoPredix.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {userStats.map((user, index) => (
                    <div
                      key={user.address}
                      className={`p-4 rounded-lg border backdrop-blur-sm ${
                        account && user.address.toLowerCase() === account.toLowerCase()
                          ? "bg-primary/5 border-primary"
                          : "bg-card/60"
                      }`}
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
                              {account && user.address.toLowerCase() === account.toLowerCase() && (
                                <Badge variant="secondary">You</Badge>
                              )}
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
                                      variant={position.status === "Active" ? "default" : "secondary"} 
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
          {!isLoading && userStats.length === 0 && (
            <Card className="backdrop-blur-sm bg-card/80">
              <CardContent className="py-12">
                <div className="text-center">
                  <Trophy className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-xl font-semibold mb-2">No Trading Activity Yet</h3>
                  <p className="text-muted-foreground mb-6">
                    Start trading prediction markets to appear on the leaderboard!
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

          {/* Performance Note */}
          {!isLoading && (
            <div className="mt-4 text-center text-sm text-muted-foreground backdrop-blur-sm bg-card/80 p-2 rounded-lg">
              <p>Note: Leaderboard data is fetched directly from GoPredix. Some traders may not appear due to performance limits.</p>
            </div>
          )}
        </div>

        <Footer />
      </div>
    </main>
  )
}