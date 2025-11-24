"use client"

import { useState, useEffect, useCallback } from "react"
import Header from "@/components/header"
import Footer from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Trophy, Medal, ArrowLeft, Wallet, Loader2, TrendingUp, Users, BarChart3, ExternalLink, AlertTriangle } from "lucide-react"
import { useRouter } from "next/navigation"
import { ethers } from "ethers"
import LightRays from "@/components/LightRays"
import { useAccount, useChainId } from "wagmi"

// Import ABIs
import BNB_MARKET_ARTIFACT from "@/contracts/abi.json"
import BNB_HELPER_ARTIFACT from "@/contracts/helperABI.json"
import PDX_MARKET_ARTIFACT from "@/contracts/pdxabi.json"
import PDX_HELPER_ARTIFACT from "@/contracts/pdxhelperabi.json"

// Helper function to extract ABI
const extractABI = (artifact: any): ethers.InterfaceAbi => {
  return ('abi' in artifact ? artifact.abi : artifact) as ethers.InterfaceAbi
}

// Extract ABIs
const BNB_MARKET_ABI = extractABI(BNB_MARKET_ARTIFACT)
const BNB_HELPER_ABI = extractABI(BNB_HELPER_ARTIFACT)
const PDX_MARKET_ABI = extractABI(PDX_MARKET_ARTIFACT)
const PDX_HELPER_ABI = extractABI(PDX_HELPER_ARTIFACT)

// Contract addresses
const BNB_MARKET_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS
const BNB_HELPER_ADDRESS = process.env.NEXT_PUBLIC_HELPER_CONTRACT_ADDRESS
const PDX_MARKET_ADDRESS = process.env.NEXT_PUBLIC_PDX_PREDICTION_MARKET_ADDRESS || "0x275fa689f785fa232861a076aD4cc1955F88171A"
const PDX_HELPER_ADDRESS = process.env.NEXT_PUBLIC_PDX_HELPER_ADDRESS || "0x02D4E1573ec5ade27eC852fBBf873d7073219E21"
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
  bnbInvestment: string
  pdxInvestment: string
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
  paymentToken: "BNB" | "PDX"
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
  paymentToken: "BNB" | "PDX"
}

export default function ProfilePage() {
  const router = useRouter()
  const { address: account, isConnected } = useAccount()
  const chainId = useChainId()
  
  const [userStats, setUserStats] = useState<UserStats | null>(null)
  const [userPositions, setUserPositions] = useState<MarketPosition[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [showSellModal, setShowSellModal] = useState(false)
  const [showStopLossModal, setShowStopLossModal] = useState(false)
  const [showTakeProfitModal, setShowTakeProfitModal] = useState(false)
  const [selectedPosition, setSelectedPosition] = useState<MarketPosition | null>(null)
  const [sellTokenType, setSellTokenType] = useState<"YES" | "NO">("YES")
  const [sellAmount, setSellAmount] = useState("")
  const [minReceive, setMinReceive] = useState("")
  const [stopLossPrice, setStopLossPrice] = useState("")
  const [takeProfitPrice, setTakeProfitPrice] = useState("")

  const isCorrectNetwork = chainId === 97
  const canFetchData = isConnected && isCorrectNetwork && account

  // ============================================
  // ✅ CREATE CONTRACTS
  // ============================================
  
  const getReadOnlyContracts = useCallback(() => {
    if (!BNB_MARKET_ADDRESS || !BNB_HELPER_ADDRESS || !PDX_MARKET_ADDRESS || !PDX_HELPER_ADDRESS) {
      throw new Error('Contract addresses not configured in environment variables')
    }

    try {
      const provider = new ethers.JsonRpcProvider(RPC_URL)
      
      // BNB Contracts
      const bnbMarketContract = new ethers.Contract(BNB_MARKET_ADDRESS, BNB_MARKET_ABI, provider)
      const bnbHelperContract = new ethers.Contract(BNB_HELPER_ADDRESS, BNB_HELPER_ABI, provider)
      
      // PDX Contracts
      const pdxMarketContract = new ethers.Contract(PDX_MARKET_ADDRESS, PDX_MARKET_ABI, provider)
      const pdxHelperContract = new ethers.Contract(PDX_HELPER_ADDRESS, PDX_HELPER_ABI, provider)
      
      return { 
        bnbMarketContract, 
        bnbHelperContract,
        pdxMarketContract,
        pdxHelperContract,
        provider 
      }
    } catch (error) {
      console.error('Error creating read-only contracts:', error)
      throw error
    }
  }, [])

  // Get individual BNB market
  const getBNBMarket = useCallback(async (marketId: number): Promise<Market | null> => {
    try {
      const { bnbMarketContract } = getReadOnlyContracts()
      const marketData = await bnbMarketContract.markets(marketId)
      
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
        paymentToken: "BNB"
      }

      return market
    } catch (error) {
      console.error(`Error fetching BNB market ${marketId}:`, error)
      return null
    }
  }, [getReadOnlyContracts])

  // Get individual PDX market
  const getPDXMarket = useCallback(async (marketId: number): Promise<Market | null> => {
    try {
      const { pdxMarketContract } = getReadOnlyContracts()
      const marketData = await pdxMarketContract.markets(marketId)
      
      if (!marketData || !marketData[0] || marketData[0] === "0x0000000000000000000000000000000000000000") {
        console.warn(`PDX Market ${marketId} is empty or not found`)
        return null
      }

      let question = marketData[1] || `PDX Market ${marketId}`
      if (typeof question === 'string' && question.startsWith('"') && question.endsWith('"')) {
        question = question.slice(1, -1)
      }

      const market: Market = {
        id: marketId,
        creator: marketData[0],
        question: question,
        category: marketData[2] || "General",
        endTime: Number(marketData[3] || 0),
        status: Number(marketData[4] || 0),
        outcome: Number(marketData[5] || 255),
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
        paymentToken: "PDX"
      }

      return market
      
    } catch (error) {
      console.error(`❌ Error fetching PDX market ${marketId}:`, error)
      return null
    }
  }, [getReadOnlyContracts])

  // Helper functions
  const getMarketStatusText = (status: number, endTime: number): "Active" | "Resolved" | "Cancelled" => {
    const resolutionDate = new Date(endTime * 1000)
    const now = new Date()
    
    if (status === 0 && resolutionDate > now) return "Active"
    else if (status === 1 || status === 2) return "Resolved"
    else return "Resolved"
  }

  const isMarketActive = (status: number, endTime: number): boolean => {
    const resolutionDate = new Date(endTime * 1000)
    const now = new Date()
    return status === 0 && resolutionDate > now
  }

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

  // Get user BNB positions
  const getUserBNBPositions = useCallback(async (address: string): Promise<any[]> => {
    try {
      const { bnbHelperContract } = getReadOnlyContracts()
      const positions = await bnbHelperContract.getUserPositions(address)
      const formattedPositions = []

      for (const pos of positions) {
        try {
          const market = await getBNBMarket(Number(pos.marketId))
          if (market) {
            formattedPositions.push({
              market,
              yesBalance: ethers.formatEther(pos.yesBalance),
              noBalance: ethers.formatEther(pos.noBalance),
              bnbInvested: ethers.formatEther(pos.bnbInvested),
              paymentToken: "BNB"
            })
          }
        } catch (error) {
          console.warn(`Error processing BNB position for market ${pos.marketId}:`, error)
        }
      }

      return formattedPositions
    } catch (error) {
      console.error(`Error fetching BNB positions for ${address}:`, error)
      return []
    }
  }, [getReadOnlyContracts, getBNBMarket])

  // Get user PDX positions
  const getUserPDXPositions = useCallback(async (address: string): Promise<any[]> => {
    try {
      const { pdxHelperContract } = getReadOnlyContracts()
      const positions = await pdxHelperContract.getUserPositions(address)
      const formattedPositions = []

      for (const pos of positions) {
        try {
          const market = await getPDXMarket(Number(pos.marketId))
          if (market) {
            formattedPositions.push({
              market,
              yesBalance: ethers.formatEther(pos.yesBalance),
              noBalance: ethers.formatEther(pos.noBalance),
              pdxInvested: ethers.formatEther(pos.totalInvested),
              paymentToken: "PDX"
            })
          }
        } catch (error) {
          console.warn(`Error processing PDX position for market ${pos.marketId}:`, error)
        }
      }

      return formattedPositions
    } catch (error) {
      console.error(`Error fetching PDX positions for ${address}:`, error)
      return []
    }
  }, [getReadOnlyContracts, getPDXMarket])

  // Get total investment
  const getTotalInvestment = useCallback(async (address: string): Promise<{bnb: string, pdx: string}> => {
    try {
      const { bnbHelperContract, pdxHelperContract } = getReadOnlyContracts()
      
      const bnbInvestment = await bnbHelperContract.getUserTotalInvestment(address)
      const pdxInvestment = await pdxHelperContract.getUserTotalInvestment(address)
      
      return {
        bnb: ethers.formatEther(bnbInvestment),
        pdx: ethers.formatEther(pdxInvestment)
      }
    } catch (error) {
      console.error(`Error fetching total investment for ${address}:`, error)
      return { bnb: "0", pdx: "0" }
    }
  }, [getReadOnlyContracts])

  // Calculate user stats
  const calculateUserStats = useCallback(async (address: string): Promise<UserStats> => {
    try {
      const bnbPositions = await getUserBNBPositions(address)
      const pdxPositions = await getUserPDXPositions(address)
      const allPositions = [...bnbPositions, ...pdxPositions]
      
      const investments = await getTotalInvestment(address)
      
      let totalVolume = 0
      let currentPortfolioValue = 0
      let unrealizedPnl = 0
      let activePositions = 0
      const categoryCount: { [key: string]: number } = {}

      for (const position of allPositions) {
        const prices = calculatePrices(position.market.yesPool, position.market.noPool)
        const yesValue = parseFloat(position.yesBalance) * prices.yesPrice / 100
        const noValue = parseFloat(position.noBalance) * prices.noPrice / 100
        const positionValue = yesValue + noValue
        
        const invested = parseFloat(position.bnbInvested || position.pdxInvested || "0")
        
        totalVolume += invested
        currentPortfolioValue += positionValue
        
        const positionPnl = positionValue - invested
        if (positionPnl > 0) {
          unrealizedPnl += positionPnl
        }

        if (isMarketActive(position.market.status, position.market.endTime)) {
          activePositions++
        }

        const category = position.market.category || "General"
        categoryCount[category] = (categoryCount[category] || 0) + 1
      }

      const favoriteCategory = Object.entries(categoryCount)
        .sort(([,a], [,b]) => b - a)[0]?.[0] || "General"

      const totalPnl = unrealizedPnl

      const stats: UserStats = {
        address,
        totalMarketsTraded: allPositions.length,
        totalVolume,
        currentPortfolioValue,
        realizedPnl: 0,
        unrealizedPnl,
        totalPnl,
        winningMarkets: 0,
        activePositions,
        favoriteCategory,
        totalInvestment: (parseFloat(investments.bnb) + parseFloat(investments.pdx)).toFixed(4),
        bnbInvestment: investments.bnb,
        pdxInvestment: investments.pdx
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
        totalInvestment: "0",
        bnbInvestment: "0",
        pdxInvestment: "0"
      }
    }
  }, [getUserBNBPositions, getUserPDXPositions, getTotalInvestment])

  const fetchUserMarketPositions = useCallback(async (address: string): Promise<MarketPosition[]> => {
    try {
      const bnbPositions = await getUserBNBPositions(address)
      const pdxPositions = await getUserPDXPositions(address)
      const allPositions = [...bnbPositions, ...pdxPositions]
      
      return allPositions.map(position => {
        const prices = calculatePrices(position.market.yesPool, position.market.noPool)
        
        return {
          marketId: position.market.id,
          question: position.market.question,
          category: position.market.category || "General",
          yesTokens: parseFloat(position.yesBalance),
          noTokens: parseFloat(position.noBalance),
          currentValue: parseFloat(position.yesBalance) * prices.yesPrice / 100 + 
                       parseFloat(position.noBalance) * prices.noPrice / 100,
          investedAmount: parseFloat(position.bnbInvested || position.pdxInvested || "0"),
          potentialPnl: (parseFloat(position.yesBalance) * prices.yesPrice / 100 + 
                        parseFloat(position.noBalance) * prices.noPrice / 100) - 
                       parseFloat(position.bnbInvested || position.pdxInvested || "0"),
          status: getMarketStatusText(position.market.status, position.market.endTime),
          marketStatus: position.market.status,
          endTime: position.market.endTime,
          yesPrice: prices.yesPrice,
          noPrice: prices.noPrice,
          paymentToken: position.paymentToken
        }
      })

    } catch (error) {
      console.error(`Error fetching positions for ${address}:`, error)
      return []
    }
  }, [getUserBNBPositions, getUserPDXPositions])

  // Main data fetching
  const fetchUserData = useCallback(async () => {
    if (!canFetchData || !account) {
      return
    }

    setIsLoading(true)
    setError(null)
    
    try {
      console.log(`🚀 Fetching data for wallet: ${account}`)
      
      const stats = await calculateUserStats(account)
      setUserStats(stats)

      const positions = await fetchUserMarketPositions(account)
      setUserPositions(positions)

      console.log("🎉 User data loaded successfully")

    } catch (err: any) {
      console.error("❌ Error fetching user data:", err)
      setError(err.message || 'Failed to load user data from blockchain')
      setUserStats(null)
      setUserPositions([])
    } finally {
      setIsLoading(false)
    }
  }, [canFetchData, account, calculateUserStats, fetchUserMarketPositions])

  useEffect(() => {
    if (canFetchData) {
      fetchUserData()
    } else {
      setUserStats(null)
      setUserPositions([])
      setError(null)
    }
  }, [canFetchData, fetchUserData])

  const refreshData = useCallback(async () => {
    await fetchUserData()
  }, [fetchUserData])

  // ==================== SELL TOKEN HANDLERS ====================
  
  const handleSellTokens = (position: MarketPosition, tokenType: "YES" | "NO") => {
    setSelectedPosition(position)
    setSellTokenType(tokenType)
    const maxAmount = tokenType === "YES" ? position.yesTokens : position.noTokens
    setSellAmount(maxAmount.toString())
    setMinReceive("")
    setShowSellModal(true)
  }

  const executeSellTokens = async () => {
    if (!selectedPosition || !sellAmount || !minReceive) {
      setError("Please fill in all fields")
      return
    }

    setActionLoading(`sell-${selectedPosition.marketId}-${sellTokenType}`)
    setError(null)

    try {
      // You'll need to import your BNB/PDX hooks here
      // For now, showing the structure
      console.log(`Selling ${sellAmount} ${sellTokenType} tokens from market ${selectedPosition.marketId}`)
      console.log(`Minimum to receive: ${minReceive} ${selectedPosition.paymentToken}`)
      
      // TODO: Call actual contract function based on paymentToken
      // if (selectedPosition.paymentToken === "BNB") {
      //   if (sellTokenType === "YES") {
      //     await bnbHook.sellYesForBNB(selectedPosition.marketId, sellAmount, minReceive)
      //   } else {
      //     await bnbHook.sellNoForBNB(selectedPosition.marketId, sellAmount, minReceive)
      //   }
      // } else {
      //   if (sellTokenType === "YES") {
      //     await pdxHook.sellYesForPDX(selectedPosition.marketId, sellAmount, minReceive)
      //   } else {
      //     await pdxHook.sellNoForPDX(selectedPosition.marketId, sellAmount, minReceive)
      //   }
      // }

      setShowSellModal(false)
      await refreshData()
      
    } catch (err: any) {
      console.error("Error selling tokens:", err)
      setError(err.message || "Failed to sell tokens")
    } finally {
      setActionLoading(null)
    }
  }

  // ==================== STOP LOSS HANDLERS ====================
  
  const handleSetStopLoss = (position: MarketPosition) => {
    setSelectedPosition(position)
    setStopLossPrice("")
    setShowStopLossModal(true)
  }

  const executeSetStopLoss = async () => {
    if (!selectedPosition || !stopLossPrice) {
      setError("Please enter a stop loss price")
      return
    }

    setActionLoading(`stoploss-${selectedPosition.marketId}`)
    setError(null)

    try {
      console.log(`Setting stop loss for market ${selectedPosition.marketId} at price ${stopLossPrice}`)
      
      // TODO: Call actual contract function
      // Determine which token has more value
      // const isYes = selectedPosition.yesTokens > selectedPosition.noTokens
      // const tokenAmount = isYes ? selectedPosition.yesTokens : selectedPosition.noTokens
      // 
      // if (selectedPosition.paymentToken === "BNB") {
      //   await bnbHook.createStopLossOrder(
      //     selectedPosition.marketId,
      //     isYes,
      //     tokenAmount.toString(),
      //     parseFloat(stopLossPrice)
      //   )
      // } else {
      //   await pdxHook.createStopLossOrder(
      //     selectedPosition.marketId,
      //     isYes,
      //     tokenAmount.toString(),
      //     parseFloat(stopLossPrice)
      //   )
      // }

      setShowStopLossModal(false)
      await refreshData()
      
    } catch (err: any) {
      console.error("Error setting stop loss:", err)
      setError(err.message || "Failed to set stop loss")
    } finally {
      setActionLoading(null)
    }
  }

  // ==================== TAKE PROFIT HANDLERS ====================
  
  const handleSetTakeProfit = (position: MarketPosition) => {
    setSelectedPosition(position)
    setTakeProfitPrice("")
    setShowTakeProfitModal(true)
  }

  const executeSetTakeProfit = async () => {
    if (!selectedPosition || !takeProfitPrice) {
      setError("Please enter a take profit price")
      return
    }

    setActionLoading(`takeprofit-${selectedPosition.marketId}`)
    setError(null)

    try {
      console.log(`Setting take profit for market ${selectedPosition.marketId} at price ${takeProfitPrice}`)
      
      // TODO: Call actual contract function
      // Determine which token has more value
      // const isYes = selectedPosition.yesTokens > selectedPosition.noTokens
      // const tokenAmount = isYes ? selectedPosition.yesTokens : selectedPosition.noTokens
      // 
      // if (selectedPosition.paymentToken === "BNB") {
      //   await bnbHook.createTakeProfitOrder(
      //     selectedPosition.marketId,
      //     isYes,
      //     tokenAmount.toString(),
      //     parseFloat(takeProfitPrice)
      //   )
      // } else {
      //   await pdxHook.createTakeProfitOrder(
      //     selectedPosition.marketId,
      //     isYes,
      //     tokenAmount.toString(),
      //     parseFloat(takeProfitPrice)
      //   )
      // }

      setShowTakeProfitModal(false)
      await refreshData()
      
    } catch (err: any) {
      console.error("Error setting take profit:", err)
      setError(err.message || "Failed to set take profit")
    } finally {
      setActionLoading(null)
    }
  }

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`
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

        <div className="max-w-7xl mx-auto px-4 py-8">
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
                <h1 className="text-3xl md:text-4xl font-bold mb-2">My Profile</h1>
                <p className="text-muted-foreground backdrop-blur-sm bg-card/80 p-2 rounded-lg inline-block">
                  Your trading stats and positions across BNB & PDX markets
                </p>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={refreshData}
                disabled={isLoading || !canFetchData}
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
            </div>
          </div>

          {/* Wallet Connection Status */}
          {!isConnected && (
            <div className="mb-6 p-4 bg-yellow-50 dark:bg-yellow-950 border border-yellow-300 dark:border-yellow-700 rounded-lg backdrop-blur-sm bg-card/80">
              <div className="flex items-center gap-3">
                <Wallet className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                <div>
                  <h3 className="text-yellow-800 dark:text-yellow-300 font-semibold">Wallet Not Connected</h3>
                  <p className="text-yellow-700 dark:text-yellow-400 text-sm mt-1">
                    Please connect your wallet to view your profile and trading statistics
                  </p>
                </div>
              </div>
            </div>
          )}

          {isConnected && !isCorrectNetwork && (
            <div className="mb-6 p-4 bg-orange-50 dark:bg-orange-950 border border-orange-300 dark:border-orange-700 rounded-lg backdrop-blur-sm bg-card/80">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                <div>
                  <h3 className="text-orange-800 dark:text-orange-300 font-semibold">Wrong Network</h3>
                  <p className="text-orange-700 dark:text-orange-400 text-sm mt-1">
                    Please switch to BSC Testnet (Chain ID: 97) to view your profile data
                  </p>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-700 rounded-lg backdrop-blur-sm bg-card/80">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-red-800 dark:text-red-300 font-semibold">Error Loading Data</h3>
                  <p className="text-red-700 dark:text-red-400 text-sm mt-1">{error}</p>
                </div>
              </div>
            </div>
          )}

          {canFetchData && account && (
            <>
              {/* User Address Card */}
              <Card className="mb-6 backdrop-blur-sm bg-card/80">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Wallet className="h-8 w-8 text-primary" />
                      <div>
                        <p className="text-sm text-muted-foreground">Connected Wallet</p>
                        <p className="text-lg font-mono font-semibold">{formatAddress(account)}</p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => window.open(`https://testnet.bscscan.com/address/${account}`, '_blank')}
                    >
                      <ExternalLink className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Stats Grid */}
              {isLoading ? (
                <div className="flex justify-center items-center py-12 backdrop-blur-sm bg-card/80 rounded-lg">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  <span className="ml-2 text-muted-foreground">
                    Loading your profile data...
                  </span>
                </div>
              ) : userStats ? (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                    <Card className="backdrop-blur-sm bg-card/80 hover:border-white/50">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Markets Traded</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center">
                          <BarChart3 className="w-8 h-8 text-primary mr-2" />
                          <div className="text-2xl font-bold">{userStats.totalMarketsTraded}</div>
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {userStats.activePositions} active positions
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="backdrop-blur-sm bg-card/80 hover:border-white/50">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Total Investment</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center">
                          <TrendingUp className="w-8 h-8 text-primary mr-2" />
                          <div className="text-2xl font-bold">{userStats.totalInvestment}</div>
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          🔶 {parseFloat(userStats.bnbInvestment).toFixed(4)} BNB • 
                          💎 {parseFloat(userStats.pdxInvestment).toFixed(4)} PDX
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="backdrop-blur-sm bg-card/80 hover:border-white/50">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Portfolio Value</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center">
                          <Trophy className="w-8 h-8 text-primary mr-2" />
                          <div className="text-2xl font-bold">
                            ${userStats.currentPortfolioValue.toFixed(2)}
                          </div>
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          Current value
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="backdrop-blur-sm bg-card/80 hover:border-white/50">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Total P&L</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center">
                          <Medal className="w-8 h-8 text-primary mr-2" />
                          <div className={`text-2xl font-bold ${
                            userStats.totalPnl >= 0 ? "text-green-600" : "text-red-600"
                          }`}>
                            {userStats.totalPnl >= 0 ? "+" : ""}${userStats.totalPnl.toFixed(2)}
                          </div>
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          Unrealized P&L
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Additional Stats */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                    <Card className="backdrop-blur-sm bg-card/80">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Total Volume</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-xl font-bold">
                          ${userStats.totalVolume.toFixed(2)}
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="backdrop-blur-sm bg-card/80">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Favorite Category</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <Badge variant="outline" className="text-base">
                          {userStats.favoriteCategory}
                        </Badge>
                      </CardContent>
                    </Card>

                    <Card className="backdrop-blur-sm bg-card/80">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Unrealized P&L</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className={`text-xl font-bold ${
                          userStats.unrealizedPnl >= 0 ? "text-green-600" : "text-red-600"
                        }`}>
                          {userStats.unrealizedPnl >= 0 ? "+" : ""}${userStats.unrealizedPnl.toFixed(2)}
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Positions List */}
                  {userPositions.length > 0 ? (
                    <Card className="backdrop-blur-sm bg-card/80 hover:shadow-blue-500/50">
                      <CardHeader>
                        <CardTitle>Your Positions</CardTitle>
                        <CardDescription>
                          All your active and resolved positions across BNB & PDX markets
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          {userPositions.map((position, index) => (
                            <div
                              key={`${position.marketId}-${position.paymentToken}-${index}`}
                              className="p-4 rounded-lg border backdrop-blur-sm bg-card/60"
                            >
                              <div className="flex flex-col md:flex-row justify-between gap-4">
                                <div className="flex-1">
                                  <div className="flex items-start gap-2 mb-2">
                                    <div className="flex-1">
                                      <h3 className="font-semibold text-base mb-2">{position.question}</h3>
                                      <div className="flex flex-wrap items-center gap-2 text-sm">
                                        <Badge variant="secondary" className="backdrop-blur-sm">
                                          {position.category}
                                        </Badge>
                                        <Badge 
                                          variant="secondary" 
                                          className="backdrop-blur-sm"
                                        >
                                          {position.paymentToken === "BNB" ? "🔶 BNB" : "💎 PDX"}
                                        </Badge>
                                        <Badge 
                                          variant={position.status === "Active" ? "default" : "secondary"}
                                          className="backdrop-blur-sm"
                                        >
                                          {position.status}
                                        </Badge>
                                      </div>
                                    </div>
                                  </div>

                                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm mt-3">
                                    <div>
                                      <span className="text-muted-foreground">YES Tokens:</span>
                                      <div className="font-medium">{position.yesTokens.toFixed(4)}</div>
                                    </div>
                                    <div>
                                      <span className="text-muted-foreground">NO Tokens:</span>
                                      <div className="font-medium">{position.noTokens.toFixed(4)}</div>
                                    </div>
                                    <div>
                                      <span className="text-muted-foreground">YES Price:</span>
                                      <div className="font-medium text-green-600">
                                        {position.yesPrice.toFixed(1)}%
                                      </div>
                                    </div>
                                    <div>
                                      <span className="text-muted-foreground">NO Price:</span>
                                      <div className="font-medium text-red-600">
                                        {position.noPrice.toFixed(1)}%
                                      </div>
                                    </div>
                                  </div>
                                </div>

                                <div className="text-right md:min-w-[180px]">
                                  <div className="mb-2">
                                    <span className="text-sm text-muted-foreground">Invested</span>
                                    <div className="text-lg font-bold">
                                      ${position.investedAmount.toFixed(2)}
                                    </div>
                                  </div>
                                  <div className="mb-2">
                                    <span className="text-sm text-muted-foreground">Current Value</span>
                                    <div className="text-lg font-bold">
                                      ${position.currentValue.toFixed(2)}
                                    </div>
                                  </div>
                                  <div>
                                    <span className="text-sm text-muted-foreground">P&L</span>
                                    <div className={`text-xl font-bold ${
                                      position.potentialPnl >= 0 ? "text-green-600" : "text-red-600"
                                    }`}>
                                      {position.potentialPnl >= 0 ? "+" : ""}${position.potentialPnl.toFixed(2)}
                                    </div>
                                  </div>
                                </div>
                              </div>

                              <div className="mt-3 pt-3 border-t border-muted flex flex-wrap gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => router.push(`/markets?id=${position.marketId}`)}
                                  className="backdrop-blur-sm"
                                >
                                  View Market
                                </Button>
                                
                                {position.yesTokens > 0 && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleSellTokens(position, "YES")}
                                    className="backdrop-blur-sm text-green-600 border-green-600 hover:bg-green-600/10"
                                  >
                                    Sell YES ({position.yesTokens.toFixed(4)})
                                  </Button>
                                )}
                                
                                {position.noTokens > 0 && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleSellTokens(position, "NO")}
                                    className="backdrop-blur-sm text-red-600 border-red-600 hover:bg-red-600/10"
                                  >
                                    Sell NO ({position.noTokens.toFixed(4)})
                                  </Button>
                                )}
                                
                                {position.status === "Active" && (
                                  <>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleSetStopLoss(position)}
                                      className="backdrop-blur-sm"
                                    >
                                      Set Stop Loss
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleSetTakeProfit(position)}
                                      className="backdrop-blur-sm"
                                    >
                                      Set Take Profit
                                    </Button>
                                  </>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  ) : (
                    <Card className="backdrop-blur-sm bg-card/80">
                      <CardContent className="py-12">
                        <div className="text-center">
                          <Trophy className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                          <h3 className="text-xl font-semibold mb-2">No Positions Yet</h3>
                          <p className="text-muted-foreground mb-6">
                            Start trading prediction markets to see your positions here!
                          </p>
                          <div className="flex flex-col sm:flex-row gap-3 justify-center">
                            <Button onClick={() => router.push("/markets")} variant="outline" className="backdrop-blur-sm bg-card/80">
                              View Markets
                            </Button>
                            <Button onClick={() => router.push("/markets")} className="backdrop-blur-sm bg-card/80">
                              Start Trading
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </>
              ) : null}
            </>
          )}

          {!canFetchData && !isLoading && (
            <Card className="backdrop-blur-sm bg-card/80">
              <CardContent className="py-12">
                <div className="text-center">
                  <Wallet className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-xl font-semibold mb-2">Connect Your Wallet</h3>
                  <p className="text-muted-foreground mb-6">
                    {!isConnected 
                      ? "Connect your wallet to view your trading profile and statistics"
                      : "Switch to BSC Testnet to view your profile data"
                    }
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {canFetchData && !isLoading && !error && (
            <div className="mt-4 text-center text-sm text-muted-foreground backdrop-blur-sm bg-card/80 p-2 rounded-lg">
              <p>Live data from GoPredix contracts on BSC Testnet</p>
            </div>
          )}
        </div>

        {/* Sell Tokens Modal */}
        {showSellModal && selectedPosition && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/90 backdrop-blur-sm" onClick={() => setShowSellModal(false)} />
            <Card className="relative w-full max-w-md backdrop-blur-sm bg-card/95">
              <CardHeader>
                <CardTitle>Sell {sellTokenType} Tokens</CardTitle>
                <CardDescription>
                  {selectedPosition.question}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Amount to Sell (Max: {sellTokenType === "YES" ? selectedPosition.yesTokens.toFixed(4) : selectedPosition.noTokens.toFixed(4)})
                  </label>
                  <input
                    type="number"
                    value={sellAmount}
                    onChange={(e) => setSellAmount(e.target.value)}
                    className="w-full px-3 py-2 border rounded-md bg-background"
                    placeholder="0.0"
                    max={sellTokenType === "YES" ? selectedPosition.yesTokens : selectedPosition.noTokens}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Minimum {selectedPosition.paymentToken} to Receive
                  </label>
                  <input
                    type="number"
                    value={minReceive}
                    onChange={(e) => setMinReceive(e.target.value)}
                    className="w-full px-3 py-2 border rounded-md bg-background"
                    placeholder="0.0"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Set slippage tolerance to protect against price changes
                  </p>
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={executeSellTokens}
                    disabled={!sellAmount || !minReceive || !!actionLoading}
                    className="flex-1"
                  >
                    {actionLoading === `sell-${selectedPosition.marketId}-${sellTokenType}` ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Selling...
                      </>
                    ) : (
                      `Sell ${sellTokenType} Tokens`
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setShowSellModal(false)}
                    disabled={!!actionLoading}
                  >
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Stop Loss Modal */}
        {showStopLossModal && selectedPosition && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/90 backdrop-blur-sm" onClick={() => setShowStopLossModal(false)} />
            <Card className="relative w-full max-w-md backdrop-blur-sm bg-card/95">
              <CardHeader>
                <CardTitle>Set Stop Loss</CardTitle>
                <CardDescription>
                  {selectedPosition.question}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Stop Loss Price (%)
                  </label>
                  <input
                    type="number"
                    value={stopLossPrice}
                    onChange={(e) => setStopLossPrice(e.target.value)}
                    className="w-full px-3 py-2 border rounded-md bg-background"
                    placeholder="e.g., 45"
                    min="0"
                    max="100"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Automatically sell when price drops to this level
                  </p>
                  <div className="mt-2 text-sm">
                    <span className="text-muted-foreground">Current YES Price: </span>
                    <span className="font-medium text-green-600">{selectedPosition.yesPrice.toFixed(1)}%</span>
                    <span className="mx-2">•</span>
                    <span className="text-muted-foreground">Current NO Price: </span>
                    <span className="font-medium text-red-600">{selectedPosition.noPrice.toFixed(1)}%</span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={executeSetStopLoss}
                    disabled={!stopLossPrice || !!actionLoading}
                    className="flex-1"
                  >
                    {actionLoading === `stoploss-${selectedPosition.marketId}` ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Setting...
                      </>
                    ) : (
                      "Set Stop Loss"
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setShowStopLossModal(false)}
                    disabled={!!actionLoading}
                  >
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Take Profit Modal */}
        {showTakeProfitModal && selectedPosition && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/90 backdrop-blur-sm" onClick={() => setShowTakeProfitModal(false)} />
            <Card className="relative w-full max-w-md backdrop-blur-sm bg-card/95">
              <CardHeader>
                <CardTitle>Set Take Profit</CardTitle>
                <CardDescription>
                  {selectedPosition.question}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Take Profit Price (%)
                  </label>
                  <input
                    type="number"
                    value={takeProfitPrice}
                    onChange={(e) => setTakeProfitPrice(e.target.value)}
                    className="w-full px-3 py-2 border rounded-md bg-background"
                    placeholder="e.g., 80"
                    min="0"
                    max="100"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Automatically sell when price rises to this level
                  </p>
                  <div className="mt-2 text-sm">
                    <span className="text-muted-foreground">Current YES Price: </span>
                    <span className="font-medium text-green-600">{selectedPosition.yesPrice.toFixed(1)}%</span>
                    <span className="mx-2">•</span>
                    <span className="text-muted-foreground">Current NO Price: </span>
                    <span className="font-medium text-red-600">{selectedPosition.noPrice.toFixed(1)}%</span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={executeSetTakeProfit}
                    disabled={!takeProfitPrice || !!actionLoading}
                    className="flex-1"
                  >
                    {actionLoading === `takeprofit-${selectedPosition.marketId}` ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Setting...
                      </>
                    ) : (
                      "Set Take Profit"
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setShowTakeProfitModal(false)}
                    disabled={!!actionLoading}
                  >
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <Footer />
      </div>
    </main>
  )
}