"use client"

export const dynamic = 'force-dynamic'

import { useState, useEffect, useCallback } from "react"
import Header from "@/components/header"
import Footer from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Trophy, Medal, ArrowLeft, Wallet, Loader2, TrendingUp, Users, BarChart3, ExternalLink, AlertTriangle, Twitter, Coins } from "lucide-react"
import { useRouter } from "next/navigation"
import { ethers } from "ethers"
import LightRays from "@/components/LightRays"
import { useAccount, useWalletClient, useChainId } from "wagmi"
import { usePredictionMarketBNB } from "@/hooks/use-predection-market"
import { usePredictionMarketPDX } from "@/hooks/use-prediction-market-pdx"
import { useClaimWinnings } from "@/hooks/useClaimWinnings"
import TwitterShareModal from "@/components/twitter-share-modal"
import ConnectTwitterButton from "@/components/connect-twitter-button"
import { LogoLoading } from "@/components/ui/logo-loading"
import { ClaimSuccessDialog } from "@/components/claim/ClaimSuccessDialog"

// Import ABIs
import BNB_MARKET_ARTIFACT from "@/contracts/Bazar.json"
import BNB_HELPER_ARTIFACT from "@/contracts/helperContract.json"
import PDX_MARKET_ARTIFACT from "@/contracts/PDXbazar.json"
import PDX_HELPER_ARTIFACT from "@/contracts/PDXhelperContract.json"
import DISPUTE_RESOLUTION_ARTIFACT from "@/contracts/DisputeResolution.json"

// Helper function to extract ABI
const extractABI = (artifact: any): ethers.InterfaceAbi => {
  return ('abi' in artifact ? artifact.abi : artifact) as ethers.InterfaceAbi
}

// Extract ABIs
const BNB_MARKET_ABI = extractABI(BNB_MARKET_ARTIFACT)
const BNB_HELPER_ABI = extractABI(BNB_HELPER_ARTIFACT)
const PDX_MARKET_ABI = extractABI(PDX_MARKET_ARTIFACT)
const PDX_HELPER_ABI = extractABI(PDX_HELPER_ARTIFACT)
const DISPUTE_RESOLUTION_ABI = extractABI(DISPUTE_RESOLUTION_ARTIFACT)

// Contract addresses - MUST MATCH the hooks!
const BNB_MARKET_ADDRESS = process.env.NEXT_PUBLIC_PREDICTION_MARKET_ADDRESS!
const BNB_HELPER_ADDRESS = process.env.NEXT_PUBLIC_HELPER_CONTRACT_ADDRESS!
const PDX_MARKET_ADDRESS = process.env.NEXT_PUBLIC_PDX_MARKET_ADDRESS!
const PDX_HELPER_ADDRESS = process.env.NEXT_PUBLIC_PDX_HELPER_ADDRESS!
const DISPUTE_ADDRESS = process.env.NEXT_PUBLIC_DISPUTE_RESOLUTION_ADDRESS!
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
  outcome: number // 0 = NO, 1 = YES, 2 = Undecided
  // Claim status
  hasClaimed?: boolean
  claimTxHash?: string
  isWinner?: boolean // true if user has winning tokens
  // Dispute-related fields
  disputeId?: number
  disputeStatus?: number
  disputeOutcome?: number
  canCreateDispute: boolean
  canVoteOnDispute: boolean
  canClaimDisputeStake: boolean
  disputeDeadline?: number
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
  // LP Earnings Data
  lpBalance?: string
  lpValue?: string
  lpEarnings?: string
  lpEarningsPercent?: number
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
  const [estimatedReceive, setEstimatedReceive] = useState<string | null>(null)
  const [isEstimating, setIsEstimating] = useState(false)
  const [stopLossPrice, setStopLossPrice] = useState("")
  const [takeProfitPrice, setTakeProfitPrice] = useState("")
  const [createdMarkets, setCreatedMarkets] = useState<Market[]>([])
  const [showTwitterModal, setShowTwitterModal] = useState(false)
  const [selectedMarketForTweet, setSelectedMarketForTweet] = useState<Market | null>(null)
  const [showRemoveLiquidityModal, setShowRemoveLiquidityModal] = useState(false)
  const [selectedMarketForLP, setSelectedMarketForLP] = useState<Market | null>(null)
  const [lpRemovalAmount, setLpRemovalAmount] = useState("")

  // Transaction State
  const [txStep, setTxStep] = useState<'idle' | 'approving' | 'selling' | 'success' | 'error'>('idle')
  const [txMessage, setTxMessage] = useState('')

  // Claim Success Dialog State
  const [showClaimSuccess, setShowClaimSuccess] = useState(false)
  const [claimTxHash, setClaimTxHash] = useState<string>("")
  const [claimAmount, setClaimAmount] = useState<string>("")
  const [claimTimestamp, setClaimTimestamp] = useState<number>(0)

  // Hooks
  const bnbHook = usePredictionMarketBNB()
  const pdxHook = usePredictionMarketPDX()

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

      // Dispute Contract
      const disputeContract = DISPUTE_ADDRESS ? new ethers.Contract(DISPUTE_ADDRESS, DISPUTE_RESOLUTION_ABI, provider) : null

      return {
        bnbMarketContract,
        bnbHelperContract,
        pdxMarketContract,
        pdxHelperContract,
        disputeContract,
        provider
      }
    } catch (error) {
      console.error('Error creating read-only contracts:', error)
      throw error
    }
  }, [])

  // Get dispute information for a market
  const getDisputeInfo = useCallback(async (
    marketContract: string,
    marketId: number
  ): Promise<{
    disputeId: number
    status: number
    outcome: number
    hasDispute: boolean
  } | null> => {
    try {
      if (!DISPUTE_ADDRESS) {
        return null
      }

      const { disputeContract } = getReadOnlyContracts()
      if (!disputeContract) {
        return null
      }

      const disputeId = await disputeContract.getMarketDispute(marketContract, marketId)

      if (Number(disputeId) === 0) {
        return null // No dispute
      }

      const disputeInfo = await disputeContract.getDisputeInfo(disputeId)

      return {
        disputeId: Number(disputeId),
        status: Number(disputeInfo.status),
        outcome: Number(disputeInfo.outcome),
        hasDispute: true
      }
    } catch (error) {
      console.error(`Error fetching dispute info for market ${marketId}:`, error)
      return null
    }
  }, [getReadOnlyContracts])

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
    const now = Math.floor(Date.now() / 1000) // Use seconds for consistency

    // Status 0 = Open (but check if time has passed)
    if (status === 0) {
      return endTime > now ? "Active" : "Resolved" // Closed if time passed
    }
    // Status 1 = Closed, Status 2 = Resolution Requested, Status 3 = Resolved, Status 4 = Disputed
    else if (status >= 1) {
      return "Resolved"
    }
    return "Cancelled"
  }

  const isMarketActive = (status: number, endTime: number): boolean => {
    const now = Math.floor(Date.now() / 1000)
    return status === 0 && endTime > now
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
        }
      }

      return formattedPositions
    } catch (error) {
      console.error(`Error fetching PDX positions for ${address}:`, error)
      return []
    }
  }, [getReadOnlyContracts, getPDXMarket])

  // Get total investment
  const getTotalInvestment = useCallback(async (address: string): Promise<{ bnb: string, pdx: string }> => {
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
        .sort(([, a], [, b]) => b - a)[0]?.[0] || "General"

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

      const enhancedPositions = await Promise.all(
        allPositions.map(async (position) => {
          const prices = calculatePrices(position.market.yesPool, position.market.noPool)

          // Fetch dispute info for this market
          const marketContractAddress = position.paymentToken === "BNB" ? BNB_MARKET_ADDRESS : PDX_MARKET_ADDRESS
          const disputeInfo = await getDisputeInfo(marketContractAddress, position.market.id)

          // Check if user can create dispute
          const now = Math.floor(Date.now() / 1000)
          const canCreateDispute =
            position.market.status === 3 && // Resolved
            position.market.disputeDeadline > now && // Within dispute window
            !disputeInfo?.hasDispute || false // No existing dispute

          // Check if user can vote on dispute
          const canVoteOnDispute =
            (disputeInfo?.hasDispute &&
              disputeInfo.status === 1) || false // Active dispute

          // Check if user can claim dispute stake
          const canClaimDisputeStake =
            (disputeInfo?.hasDispute &&
              disputeInfo.status === 3) || false // Dispute resolved

          // Determine if user is a winner and if they've claimed
          // Only consider as winner if market is FULLY RESOLVED (status 3)
          const isWinner =
            position.market.status === 3 && // Must be fully resolved
            ((position.market.outcome === 1 && parseFloat(position.yesBalance) > 0) || // YES outcome with YES tokens
              (position.market.outcome === 0 && parseFloat(position.noBalance) > 0))     // NO outcome with NO tokens

          // If market is resolved and user was a winner but has 0 winning tokens, they've likely claimed
          const hasClaimed =
            position.market.status === 3 && // Resolved
            position.market.outcome !== 2 && // Not Undecided
            ((position.market.outcome === 1 && parseFloat(position.yesBalance) === 0 && parseFloat(position.bnbInvested || position.pdxInvested || "0") > 0) ||
              (position.market.outcome === 0 && parseFloat(position.noBalance) === 0 && parseFloat(position.bnbInvested || position.pdxInvested || "0") > 0))

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
            paymentToken: position.paymentToken,
            outcome: position.market.outcome, // 0 = NO, 1 = YES, 2 = Undecided
            isWinner,
            hasClaimed,
            // Dispute-related fields
            disputeId: disputeInfo?.disputeId,
            disputeStatus: disputeInfo?.status,
            disputeOutcome: disputeInfo?.outcome,
            canCreateDispute,
            canVoteOnDispute,
            canClaimDisputeStake,
            disputeDeadline: position.market.disputeDeadline
          }
        })
      )

      return enhancedPositions

    } catch (error) {
      console.error(`Error fetching positions for ${address}:`, error)
      return []
    }
  }, [getUserBNBPositions, getUserPDXPositions, getDisputeInfo])

  // Get markets created by user
  const getUserCreatedMarkets = useCallback(async (address: string): Promise<Market[]> => {
    try {
      const { bnbMarketContract, pdxMarketContract } = getReadOnlyContracts()
      const createdMarkets: Market[] = []

      // 🔍 DEBUG: Log user address
      console.log('=== PROFILE PAGE - FETCHING CREATED MARKETS ===')
      console.log('User address:', address)

      // Fetch BNB markets
      try {
        const nextBNBMarketId = await bnbMarketContract.nextMarketId()
        const totalBNBMarkets = Number(nextBNBMarketId)
        console.log('Total BNB markets to check:', totalBNBMarkets)

        for (let i = 0; i < totalBNBMarkets; i++) {
          const market = await getBNBMarket(i)
          if (market) {
            console.log(`BNB Market ${i}:`, {
              creator: market.creator,
              question: market.question?.substring(0, 50),
              matches: market.creator.toLowerCase() === address.toLowerCase()
            })

            if (market.creator.toLowerCase() === address.toLowerCase()) {
              // Fetch LP balance and calculate earnings
              console.log(`🔍 Checking LP balance for BNB market ${i}`)

              try {
                const { bnbMarketContract } = getReadOnlyContracts()
                const lpBalanceRaw = await bnbMarketContract.lpBalances(i, address)
                const lpBalance = ethers.formatEther(lpBalanceRaw)
                console.log(`  - LP Balance:`, lpBalance)
                const lpBalanceNum = parseFloat(lpBalance)

                if (lpBalanceNum > 0) {
                  console.log(`✅ Market ${i} has LP tokens!`)
                  // Calculate LP value
                  const lpTotalSupply = parseFloat(market.lpTotalSupply)
                  const poolValue = parseFloat(market.yesPool) + parseFloat(market.noPool)
                  const lpValue = lpTotalSupply > 0 ? (lpBalanceNum / lpTotalSupply) * poolValue : 0

                  // Calculate earnings (assume creator provided initial liquidity)
                  const initialValue = parseFloat(market.totalBacking)
                  const earnings = lpValue - initialValue
                  const earningsPercent = initialValue > 0 ? (earnings / initialValue) * 100 : 0

                  console.log(`  - LP Value: ${lpValue.toFixed(6)} BNB`)
                  console.log(`  - Earnings: ${earnings.toFixed(6)} BNB (${earningsPercent.toFixed(2)}%)`)

                  market.lpBalance = lpBalance
                  market.lpValue = lpValue.toFixed(6)
                  market.lpEarnings = earnings.toFixed(6)
                  market.lpEarningsPercent = earningsPercent
                } else {
                  console.log(`ℹ️ Market ${i} has zero LP balance`)
                }
              } catch (lpError) {
                console.error(`❌ Error fetching LP data for BNB market ${i}:`, lpError)
              }

              createdMarkets.push(market)
              console.log(`✅ Match found! Added BNB market ${i}`)
            }
          }
        }
      } catch (error) {
        console.error('Error fetching BNB markets:', error)
      }

      // Fetch PDX markets
      try {
        const nextPDXMarketId = await pdxMarketContract.nextMarketId()
        const totalPDXMarkets = Number(nextPDXMarketId)
        console.log('Total PDX markets to check:', totalPDXMarkets)

        for (let i = 0; i < totalPDXMarkets; i++) {
          const market = await getPDXMarket(i)
          if (market) {
            console.log(`PDX Market ${i}:`, {
              creator: market.creator,
              question: market.question?.substring(0, 50),
              matches: market.creator.toLowerCase() === address.toLowerCase()
            })

            if (market.creator.toLowerCase() === address.toLowerCase()) {
              createdMarkets.push(market)
              console.log(`✅ Match found! Added PDX market ${i}`)
            }
          }
        }
      } catch (error) {
        console.error('Error fetching PDX markets:', error)
      }

      console.log('Total created markets found:', createdMarkets.length)
      console.log('================================================')

      return createdMarkets

    } catch (error) {
      console.error(`Error fetching created markets for ${address}:`, error)
      return []
    }
  }, [getReadOnlyContracts, getBNBMarket, getPDXMarket])

  // Main data fetching
  const fetchUserData = useCallback(async () => {
    if (!canFetchData || !account) {
      return
    }

    setIsLoading(true)
    setError(null)

    try {

      const stats = await calculateUserStats(account)
      setUserStats(stats)

      const positions = await fetchUserMarketPositions(account)
      setUserPositions(positions)

      const markets = await getUserCreatedMarkets(account)
      setCreatedMarkets(markets)


    } catch (err: any) {
      console.error("❌ Error fetching user data:", err)
      setError(err.message || 'Failed to load user data from blockchain')
      setUserStats(null)
      setUserPositions([])
      setCreatedMarkets([])
    } finally {
      setIsLoading(false)
    }
  }, [canFetchData, account, calculateUserStats, fetchUserMarketPositions, getUserCreatedMarkets])

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

  // ==================== TWITTER SHARE HANDLER ====================

  const handleShareOnTwitter = (market: Market) => {
    setSelectedMarketForTweet(market)
    setShowTwitterModal(true)
  }

  // ==================== SELL TOKEN HANDLERS ====================

  // Auto-calculate minReceive when sellAmount changes
  useEffect(() => {
    const calculateEstimate = async () => {
      if (!selectedPosition || !sellAmount || parseFloat(sellAmount) <= 0) {
        setEstimatedReceive(null)
        setMinReceive("")
        return
      }

      setIsEstimating(true)
      try {
        const isYes = sellTokenType === "YES"
        let estimate = "0"

        if (selectedPosition.paymentToken === "BNB") {
          // Use BNB hook estimation
          const result = await bnbHook.getSwapMultiplier(selectedPosition.marketId, sellAmount, isYes)
          estimate = result.amountOut
        } else {
          // Use PDX hook estimation
          const result = await pdxHook.getSellEstimatePDX(selectedPosition.marketId, sellAmount, isYes)
          estimate = result.pdxOut
        }

        setEstimatedReceive(estimate)

        // Auto-set minReceive with 5% slippage
        const minOut = (parseFloat(estimate) * 0.95).toFixed(6)
        setMinReceive(minOut)

      } catch (error) {
        console.error("Error estimating sell output:", error)
        setEstimatedReceive(null)
      } finally {
        setIsEstimating(false)
      }
    }

    const timeoutId = setTimeout(() => {
      calculateEstimate()
    }, 500) // Debounce

    return () => clearTimeout(timeoutId)
  }, [sellAmount, selectedPosition, sellTokenType, bnbHook, pdxHook])

  const handleSellTokens = (position: MarketPosition, tokenType: "YES" | "NO") => {
    setSelectedPosition(position)
    setSellTokenType(tokenType)
    const maxAmount = tokenType === "YES" ? position.yesTokens : position.noTokens
    setSellAmount(maxAmount.toString())
    // minReceive will be calculated by useEffect
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

      if (selectedPosition.paymentToken === "BNB") {
        setTxStep('selling')
        setTxMessage('Confirming sell transaction...')
        if (sellTokenType === "YES") {
          await bnbHook.sellYesForBNB(selectedPosition.marketId, sellAmount, minReceive)
        } else {
          await bnbHook.sellNoForBNB(selectedPosition.marketId, sellAmount, minReceive)
        }
      } else {
        // PDX involves approval + sell
        setTxStep('approving')
        setTxMessage('Please approve the token spend transaction (1/2)...')

        if (sellTokenType === "YES") {
          await pdxHook.sellYesForPDX(selectedPosition.marketId, sellAmount, minReceive)
        } else {
          await pdxHook.sellNoForPDX(selectedPosition.marketId, sellAmount, minReceive)
        }
      }

      setTxStep('success')
      setTxMessage('Tokens sold successfully!')

      // Wait a bit before closing
      await new Promise(resolve => setTimeout(resolve, 2000))

      setShowSellModal(false)
      await refreshData()

    } catch (err: any) {
      handleSellError(err)
    } finally {
      setActionLoading(null)
      if (txStep !== 'success') {
        setTxStep('idle')
      }
    }
  }

  const handleSellError = (err: any) => {
    console.error("Sell error:", err)
    let msg = err.message || "Failed to sell tokens"

    if (msg.includes("CALL_EXCEPTION") || msg.includes("missing revert data")) {
      msg = "Transaction failed. Try increasing slippage (reduce Minimum Receive amount) or selling a smaller amount."
    } else if (msg.includes("insufficient funds")) {
      msg = "Insufficient funds for gas fees."
    }

    setError(msg)
    setTxStep('error')
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

  // ==================== CLAIM WINNINGS HANDLER ====================

  const handleClaimWinnings = async (position: MarketPosition) => {
    setActionLoading(`claim-${position.marketId}`)
    setError(null)

    try {
      // Validate that user has winning tokens before attempting to claim
      const outcome = position.outcome

      console.log('=== CLAIM VALIDATION DEBUG ===')
      console.log('Market ID:', position.marketId)
      console.log('Payment Token:', position.paymentToken)
      console.log('Market Status:', position.marketStatus, '(3 = Resolved)')
      console.log('Outcome:', outcome, '(0 = NO, 1 = YES, 2 = Undecided)')
      console.log('YES Tokens:', position.yesTokens)
      console.log('NO Tokens:', position.noTokens)
      console.log('Is Winner:', position.isWinner)
      console.log('Has Claimed:', position.hasClaimed)

      // Check if market is actually resolved
      if (position.marketStatus !== 3) {
        const statusText = position.marketStatus === 2
          ? "awaiting resolution from the server"
          : position.marketStatus === 0
            ? "still open"
            : "not yet resolved"
        setError(`Market is ${statusText}. You can only claim after the market has been fully resolved.`)
        setActionLoading(null)
        return
      }

      if (outcome === undefined || outcome === 2) { // 2 = Undecided
        setError("Market outcome is not yet decided. Cannot claim winnings.")
        setActionLoading(null)
        return
      }

      const hasWinningTokens =
        (outcome === 1 && position.yesTokens > 0) || // YES outcome and has YES tokens
        (outcome === 0 && position.noTokens > 0)     // NO outcome and has NO tokens

      console.log('Has Winning Tokens:', hasWinningTokens)

      if (!hasWinningTokens) {
        const outcomeText = outcome === 1 ? "YES" : "NO"
        const userTokens = position.yesTokens > 0 ? "YES" : "NO"
        setError(`Cannot claim: Market resolved to ${outcomeText} but you only have ${userTokens} tokens.`)
        setActionLoading(null)
        return
      }

      console.log('✅ Validation passed, attempting claim...')

      let txReceipt
      if (position.paymentToken === "BNB") {
        txReceipt = await bnbHook.claimRedemption(position.marketId)
      } else {
        txReceipt = await pdxHook.claimPDXRedemption(position.marketId)
      }

      // Show success dialog with transaction details
      if (txReceipt) {
        const txHash = txReceipt.hash || txReceipt.transactionHash
        setClaimTxHash(txHash)
        setClaimAmount(`${position.currentValue.toFixed(4)} ${position.paymentToken}`)
        setClaimTimestamp(Math.floor(Date.now() / 1000))
        setShowClaimSuccess(true)

        // Update the position to mark as claimed with tx hash
        position.hasClaimed = true
        position.claimTxHash = txHash
      }

      // Refresh data after claim
      await refreshData()

    } catch (err: any) {
      console.error("Error claiming winnings:", err)
      let errorMessage = err.message || "Failed to claim winnings"

      // Provide more helpful error messages
      if (errorMessage.includes("invalid BigNumberish") || errorMessage.includes("null")) {
        errorMessage = "Unable to claim: You may not have winning tokens or the market outcome is not finalized."
      } else if (errorMessage.includes("market not resolved")) {
        errorMessage = "Market is not yet resolved. Please wait for resolution."
      } else if (errorMessage.includes("no tokens")) {
        errorMessage = "You don't have any tokens to claim for this outcome."
      }

      setError(errorMessage)
    } finally {
      setActionLoading(null)
    }
  }

  // ==================== REMOVE LIQUIDITY HANDLER ====================

  const handleRemoveLiquidity = async () => {
    if (!selectedMarketForLP || !lpRemovalAmount) return

    setActionLoading(`remove-lp-${selectedMarketForLP.paymentToken}-${selectedMarketForLP.id}`)
    setError(null)

    try {
      if (selectedMarketForLP.paymentToken === "BNB") {
        await bnbHook.removeLiquidity(selectedMarketForLP.id, lpRemovalAmount)
      } else {
        // TODO: PDX markets don't support liquidity removal yet
        throw new Error("PDX markets don't support liquidity removal at this time")
        // await pdxHook.removePDXLiquidity(selectedMarketForLP.id, lpRemovalAmount)
      }

      // Close modal and refresh data
      setShowRemoveLiquidityModal(false)
      setSelectedMarketForLP(null)
      setLpRemovalAmount("")
      await refreshData()

    } catch (err: any) {
      console.error("Error removing liquidity:", err)
      setError(err.message || "Failed to remove liquidity")
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

              {/* X Account Card */}
              <Card className="mb-6 backdrop-blur-sm bg-card/80">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Twitter className="h-5 w-5 text-blue-400" />
                    X (Twitter) Account
                  </CardTitle>
                  <CardDescription>
                    Link your X account to display your profile on the leaderboard
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ConnectTwitterButton />
                </CardContent>
              </Card>

              {/* Stats Grid */}
              {isLoading ? (
                <div className="flex justify-center items-center py-20 backdrop-blur-sm bg-card/80 rounded-lg">
                  <LogoLoading size={64} />
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
                          <div className={`text-2xl font-bold ${userStats.totalPnl >= 0 ? "text-green-600" : "text-red-600"
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
                        <div className={`text-xl font-bold ${userStats.unrealizedPnl >= 0 ? "text-green-600" : "text-red-600"
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

                                        {/* Dispute Status Badges */}
                                        {position.disputeStatus !== undefined && (
                                          <Badge
                                            variant="destructive"
                                            className="backdrop-blur-sm bg-yellow-600 hover:bg-yellow-700"
                                          >
                                            {position.disputeStatus === 1 && "⚠️ Disputed"}
                                            {position.disputeStatus === 2 && "⏳ Finalizing"}
                                            {position.disputeStatus === 3 && "✅ Dispute Resolved"}
                                            {position.disputeStatus === 4 && "❌ Dispute Rejected"}
                                          </Badge>
                                        )}

                                        {/* Can Create Dispute Badge */}
                                        {position.canCreateDispute && (
                                          <Badge
                                            variant="outline"
                                            className="backdrop-blur-sm border-yellow-600 text-yellow-600"
                                          >
                                            ⏰ Can Dispute
                                          </Badge>
                                        )}
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
                                    <div className={`text-xl font-bold ${position.potentialPnl >= 0 ? "text-green-600" : "text-red-600"
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

                                {/* Show Sell buttons only for active markets */}
                                {position.status === "Active" && position.yesTokens > 0 && (
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleSellTokens(position, "YES")}
                                    className="backdrop-blur-sm text-green-600 border-green-600 hover:bg-green-600/10"
                                  >
                                    Sell YES ({position.yesTokens.toFixed(4)})
                                  </Button>
                                )}

                                {position.status === "Active" && position.noTokens > 0 && (
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleSellTokens(position, "NO")}
                                    className="backdrop-blur-sm text-red-600 border-red-600 hover:bg-red-600/10"
                                  >
                                    Sell NO ({position.noTokens.toFixed(4)})
                                  </Button>
                                )}

                                {/* Claim Status Display for Resolved Markets */}
                                {position.status === "Resolved" && position.outcome !== undefined && position.outcome !== 2 && (
                                  <>
                                    {/* Already Claimed */}
                                    {position.hasClaimed && (
                                      <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-green-500/10 border border-green-500/30 backdrop-blur-sm">
                                        <span className="text-green-600 text-sm font-medium">✅ Already Claimed</span>
                                        {position.claimTxHash && (
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-6 px-2 text-xs"
                                            onClick={() => window.open(`https://testnet.bscscan.com/tx/${position.claimTxHash}`, '_blank')}
                                          >
                                            <ExternalLink className="w-3 h-3" />
                                          </Button>
                                        )}
                                      </div>
                                    )}

                                    {/* Can Claim - User Won */}
                                    {!position.hasClaimed && position.isWinner && (
                                      <Button
                                        type="button"
                                        size="sm"
                                        onClick={() => handleClaimWinnings(position)}
                                        disabled={actionLoading === `claim-${position.marketId}`}
                                        className="backdrop-blur-sm bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white border-0"
                                      >
                                        {actionLoading === `claim-${position.marketId}` ? (
                                          <>
                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                            Claiming...
                                          </>
                                        ) : (
                                          "🏆 Claim Winnings"
                                        )}
                                      </Button>
                                    )}

                                    {/* User Lost */}
                                    {!position.hasClaimed && !position.isWinner && (
                                      <div className="px-3 py-2 rounded-md bg-red-500/10 border border-red-500/30 backdrop-blur-sm">
                                        <span className="text-red-600 text-sm font-medium">
                                          ❌ You Lost
                                          {position.outcome === 1 ? " (Market: YES)" : " (Market: NO)"}
                                        </span>
                                      </div>
                                    )}
                                  </>
                                )}

                                {/* Create Dispute Button */}
                                {position.canCreateDispute && (
                                  <Button
                                    type="button"
                                    size="sm"
                                    onClick={() => router.push(`/disputes?create=${position.marketId}`)}
                                    className="backdrop-blur-sm bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-700 hover:to-orange-700 text-white border-0"
                                  >
                                    ⚖️ Create Dispute
                                  </Button>
                                )}

                                {/* Vote on Dispute Button */}
                                {position.canVoteOnDispute && (
                                  <Button
                                    type="button"
                                    size="sm"
                                    onClick={() => router.push(`/disputes?vote=${position.disputeId}`)}
                                    className="backdrop-blur-sm bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white border-0"
                                  >
                                    🗳️ Vote on Dispute
                                  </Button>
                                )}

                                {/* Claim Dispute Stakes Button */}
                                {position.canClaimDisputeStake && (
                                  <Button
                                    type="button"
                                    size="sm"
                                    onClick={() => router.push(`/disputes?claim=${position.disputeId}`)}
                                    className="backdrop-blur-sm bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white border-0"
                                  >
                                    💰 Claim Dispute Stakes
                                  </Button>
                                )}

                                {/* View Dispute Button - If dispute exists */}
                                {position.disputeId && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => router.push(`/disputes?id=${position.disputeId}`)}
                                    className="backdrop-blur-sm border-yellow-600 text-yellow-600 hover:bg-yellow-600/10"
                                  >
                                    ⚖️ View Dispute
                                  </Button>
                                )}

                                {/* Show strategy buttons only for active markets */}
                                {position.status === "Active" && (
                                  <>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleSetStopLoss(position)}
                                      className="backdrop-blur-sm text-green-600 border-green-600 hover:bg-green-600/10"
                                    >
                                      Set Stop Loss
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleSetTakeProfit(position)}
                                      className="backdrop-blur-sm text-red-600 border-red-600 hover:bg-red-600/10"
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
                  {isEstimating ? (
                    <p className="text-xs text-blue-400 mt-1 flex items-center gap-1">
                      <Loader2 className="w-3 h-3 animate-spin" /> Calculating estimate...
                    </p>
                  ) : estimatedReceive && (
                    <p className="text-xs text-green-400 mt-1">
                      Estimated: {parseFloat(estimatedReceive).toFixed(4)} {selectedPosition.paymentToken} (5% slippage applied)
                    </p>
                  )}
                </div>

                {txStep === 'idle' ? (
                  <div className="flex gap-2">
                    <Button
                      onClick={executeSellTokens}
                      disabled={!sellAmount || !minReceive || !!actionLoading}
                      className="flex-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 hover:from-indigo-600 hover:via-purple-600 hover:to-pink-600 text-white border-0 shadow-lg shadow-purple-500/50"
                    >
                      Sell {sellTokenType} Tokens
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setShowSellModal(false)}
                      className="border-muted-foreground/30 hover:bg-muted/50 hover:border-primary/50"
                    >
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Transaction Progress UI */}
                    <div className="bg-muted/50 p-4 rounded-lg space-y-3">
                      {/* Step 1: Approval */}
                      <div className="flex items-center gap-3">
                        {txStep === 'approving' && <Loader2 className="w-4 h-4 animate-spin text-blue-500" />}
                        {(txStep === 'selling' || txStep === 'success') && <div className="w-4 h-4 rounded-full bg-green-500 flex items-center justify-center text-[10px] text-white">✓</div>}
                        {txStep === 'error' && <div className="w-4 h-4 rounded-full bg-red-500 flex items-center justify-center text-[10px] text-white">✕</div>}
                        <span className={txStep === 'approving' ? 'font-medium text-blue-500' : 'text-muted-foreground'}>
                          1. Approve Tokens
                        </span>
                      </div>

                      {/* Step 2: Sell */}
                      <div className="flex items-center gap-3">
                        {txStep === 'selling' && <Loader2 className="w-4 h-4 animate-spin text-blue-500" />}
                        {txStep === 'success' && <div className="w-4 h-4 rounded-full bg-green-500 flex items-center justify-center text-[10px] text-white">✓</div>}
                        <span className={txStep === 'selling' ? 'font-medium text-blue-500' : 'text-muted-foreground'}>
                          2. Confirm Sell Transaction
                        </span>
                      </div>
                    </div>

                    {/* Status Message */}
                    <div className={`text-sm text-center p-2 rounded ${txStep === 'error' ? 'bg-red-500/10 text-red-500' :
                      txStep === 'success' ? 'bg-green-500/10 text-green-500' :
                        'bg-blue-500/10 text-blue-500'
                      }`}>
                      {txMessage}
                    </div>

                    {/* Close Button (only on success/error) */}
                    {(txStep === 'success' || txStep === 'error') && (
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => {
                          setShowSellModal(false)
                          setTxStep('idle')
                        }}
                      >
                        Close
                      </Button>
                    )}
                  </div>
                )}
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
                    className="flex-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 hover:from-indigo-600 hover:via-purple-600 hover:to-pink-600 text-white border-0 shadow-lg shadow-purple-500/50"
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
                    className="border-muted-foreground/30 hover:bg-muted/50 hover:border-primary/50"
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
                    className="flex-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 hover:from-indigo-600 hover:via-purple-600 hover:to-pink-600 text-white border-0 shadow-lg shadow-purple-500/50"
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
                    className="border-muted-foreground/30 hover:bg-muted/50 hover:border-primary/50"
                  >
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Markets I Created Section */}
        {canFetchData && !isLoading && createdMarkets.length > 0 && (
          <div className="max-w-7xl mx-auto px-4 pb-8">
            <Card className="backdrop-blur-sm bg-card/80">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Markets I Created
                </CardTitle>
                <CardDescription>
                  Share your markets on X (Twitter) to attract more traders and increase liquidity
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4">
                  {createdMarkets.map((market) => {
                    const prices = calculatePrices(market.yesPool, market.noPool)
                    const isActive = market.status === 0 && new Date(market.endTime * 1000) > new Date()

                    return (
                      <div
                        key={`${market.paymentToken}-${market.id}`}
                        className="flex flex-col md:flex-row md:items-center justify-between p-4 border rounded-lg hover:border-primary/50 transition-colors gap-4"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="font-semibold">{market.question}</h4>
                            {isActive ? (
                              <Badge variant="default" className="bg-green-500/20 text-green-400 border-green-500/50">
                                Active
                              </Badge>
                            ) : (
                              <Badge variant="secondary">Closed</Badge>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                            <span className="px-2 py-1 bg-primary/10 text-primary rounded text-xs">
                              {market.category}
                            </span>
                            <span className="px-2 py-1 bg-blue-500/10 text-blue-400 rounded text-xs">
                              {market.paymentToken}
                            </span>
                            <span>•</span>
                            <span>Volume: {parseFloat(market.totalBacking).toFixed(4)} {market.paymentToken}</span>
                          </div>
                          <div className="mt-2 grid grid-cols-2 gap-2 text-sm max-w-xs">
                            <div className="p-2 bg-green-500/10 rounded">
                              <span className="text-green-400 font-semibold">YES: {prices.yesPrice}%</span>
                            </div>
                            <div className="p-2 bg-red-500/10 rounded">
                              <span className="text-red-400 font-semibold">NO: {prices.noPrice}%</span>
                            </div>
                          </div>
                          {/* LP Earnings Display */}
                          {market.lpBalance && parseFloat(market.lpBalance) > 0 && (
                            <div className="mt-3 p-4 bg-gradient-to-r from-green-950/30 to-emerald-950/30 border border-green-600/30 rounded-lg">
                              <div className="flex items-center gap-2 mb-3">
                                <Coins className="w-4 h-4 text-green-400" />
                                <div className="text-sm font-semibold text-green-400">LP Position</div>
                              </div>
                              <div className="grid grid-cols-2 gap-3 text-xs">
                                <div className="space-y-1">
                                  <div className="text-muted-foreground">LP Tokens</div>
                                  <div className="font-semibold text-white">{parseFloat(market.lpBalance).toFixed(4)}</div>
                                </div>
                                <div className="space-y-1">
                                  <div className="text-muted-foreground">Current Value</div>
                                  <div className="font-semibold text-white">{market.lpValue} {market.paymentToken}</div>
                                </div>
                                <div className="space-y-1">
                                  <div className="text-muted-foreground">Earnings</div>
                                  <div className={`font-semibold ${parseFloat(market.lpEarnings || "0") >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                    {parseFloat(market.lpEarnings || "0") >= 0 ? '+' : ''}{market.lpEarnings} {market.paymentToken}
                                  </div>
                                </div>
                                <div className="space-y-1">
                                  <div className="text-muted-foreground">ROI</div>
                                  <div className={`font-semibold ${(market.lpEarningsPercent || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                    {(market.lpEarningsPercent || 0) >= 0 ? '+' : ''}{(market.lpEarningsPercent || 0).toFixed(2)}%
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                        <div className="flex gap-2">
                          {market.lpBalance && parseFloat(market.lpBalance) > 0 && (
                            <Button
                              onClick={() => {
                                setSelectedMarketForLP(market)
                                setLpRemovalAmount(market.lpBalance || "")
                                setShowRemoveLiquidityModal(true)
                              }}
                              variant="outline"
                              className="gap-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border-emerald-500/50"
                            >
                              <Coins className="w-4 h-4" />
                              Remove Liquidity
                            </Button>
                          )}
                          <Button
                            onClick={() => handleShareOnTwitter(market)}
                            variant="outline"
                            className="gap-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border-blue-500/50"
                          >
                            <Twitter className="w-4 h-4" />
                            Share on X
                          </Button>
                          <Button
                            onClick={() => router.push(`/markets/${market.question.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').substring(0, 60)}-${market.paymentToken}-${market.id}`)}
                            variant="ghost"
                            size="icon"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Remove Liquidity Modal */}
        {showRemoveLiquidityModal && selectedMarketForLP && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/90 backdrop-blur-sm" onClick={() => setShowRemoveLiquidityModal(false)} />
            <Card className="relative w-full max-w-md backdrop-blur-sm bg-card/95">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Coins className="w-5 h-5 text-emerald-400" />
                  Remove Liquidity & Claim Fees
                </CardTitle>
                <CardDescription>
                  {selectedMarketForLP.question}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* LP Balance Info */}
                <div className="p-4 bg-gradient-to-r from-emerald-950/30 to-green-950/30 border border-emerald-600/30 rounded-lg">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <div className="text-muted-foreground mb-1">Your LP Tokens</div>
                      <div className="font-semibold text-white">{parseFloat(selectedMarketForLP.lpBalance || '0').toFixed(4)}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground mb-1">Current Value</div>
                      <div className="font-semibold text-white">{selectedMarketForLP.lpValue} {selectedMarketForLP.paymentToken}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground mb-1">Earnings</div>
                      <div className="font-semibold text-green-400">{selectedMarketForLP.lpEarnings} {selectedMarketForLP.paymentToken}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground mb-1">ROI</div>
                      <div className={`font-semibold ${(selectedMarketForLP.lpEarningsPercent || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {(selectedMarketForLP.lpEarningsPercent || 0) >= 0 ? '+' : ''}{(selectedMarketForLP.lpEarningsPercent || 0).toFixed(2)}%
                      </div>
                    </div>
                  </div>
                </div>

                {/* LP Amount Input */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    LP Tokens to Remove
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={lpRemovalAmount}
                      onChange={(e) => setLpRemovalAmount(e.target.value)}
                      className="w-full px-3 py-2 border rounded-md bg-background pr-16"
                      placeholder="0.0"
                      step="0.0001"
                      max={selectedMarketForLP.lpBalance}
                    />
                    <Button
                      onClick={() => setLpRemovalAmount(selectedMarketForLP.lpBalance || "")}
                      variant="ghost"
                      size="sm"
                      className="absolute right-1 top-1/2 -translate-y-1/2 h-7 text-xs"
                    >
                      MAX
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Available: {parseFloat(selectedMarketForLP.lpBalance || '0').toFixed(4)} LP
                  </p>
                </div>

                {error && (
                  <div className="p-3 bg-destructive/10 border border-destructive/50 rounded-md">
                    <p className="text-sm text-destructive">{error}</p>
                  </div>
                )}

                <div className="flex gap-2">
                  <Button
                    onClick={handleRemoveLiquidity}
                    disabled={!lpRemovalAmount || parseFloat(lpRemovalAmount) <= 0 || !!actionLoading}
                    className="flex-1 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white border-0"
                  >
                    {actionLoading === `remove-lp-${selectedMarketForLP.paymentToken}-${selectedMarketForLP.id}` ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Removing...
                      </>
                    ) : (
                      "💰 Claim Fees"
                    )}
                  </Button>
                  <Button
                    onClick={() => {
                      setShowRemoveLiquidityModal(false)
                      setSelectedMarketForLP(null)
                      setLpRemovalAmount("")
                    }}
                    variant="outline"
                    disabled={!!actionLoading}
                  >
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Twitter Share Modal */}
        {showTwitterModal && selectedMarketForTweet && (
          <TwitterShareModal
            market={selectedMarketForTweet}
            onClose={() => {
              setShowTwitterModal(false)
              setSelectedMarketForTweet(null)
            }}
          />
        )}

        {/* Claim Success Dialog */}
        <ClaimSuccessDialog
          isOpen={showClaimSuccess}
          onClose={() => setShowClaimSuccess(false)}
          txHash={claimTxHash}
          amount={claimAmount}
          timestamp={claimTimestamp}
          autoCloseMs={3000}
        />

        <Footer />
      </div>
    </main>
  )
}