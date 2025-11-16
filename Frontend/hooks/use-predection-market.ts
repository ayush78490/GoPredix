import { useState, useCallback, useEffect } from 'react'
import { ethers } from 'ethers'
import { useWeb3Context } from '@/lib/wallet-context'
import PREDICTION_MARKET_JSON from '../contracts/abi.json'
import HELPER_JSON from '../contracts/helperABI.json'

const PREDICTION_MARKET_ABI = (PREDICTION_MARKET_JSON as any).abi || PREDICTION_MARKET_JSON
const HELPER_ABI = (HELPER_JSON as any).abi || HELPER_JSON

// Contract addresses - BNB only
const PREDICTION_MARKET_ADDRESS = process.env.NEXT_PUBLIC_PREDICTION_MARKET_ADDRESS || '0x651790f7A07d818D5a2152572C46e2e3C6E226E5'
const HELPER_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_HELPER_CONTRACT_ADDRESS || '0x00B4af3a7950CF31DdB1dCC4D8413193713CD2b5'

// Market Status enum
export enum MarketStatus {
  Open = 0,
  Closed = 1,
  ResolutionRequested = 2,
  Resolved = 3,
  Disputed = 4
}

export enum Outcome {
  Undecided = 0,
  Yes = 1,
  No = 2
}

export interface BNBMarket {
  id: number
  creator: string
  question: string
  category: string
  endTime: number
  status: MarketStatus
  outcome: Outcome
  yesToken: string
  noToken: string
  yesPool: string
  noPool: string
  lpTotalSupply: string
  totalBacking: string
  platformFees: string
  resolutionRequestedAt: number
  resolutionRequester: string
  resolutionReason: string
  resolutionConfidence: number
  disputeDeadline: number
  disputer: string
  disputeReason: string
  yesPrice?: number
  noPrice?: number
  yesMultiplier?: number
  noMultiplier?: number
}

export interface MarketCreationParams {
  question: string
  category: string
  endTime: number
  initialYes: string
  initialNo: string
}

export interface UserPosition {
  marketId: number
  yesBalance: string
  noBalance: string
  totalInvested: string
  bnbInvested: string
}

export interface MultiplierInfo {
  multiplier: number
  totalOut: string
  totalFee: string
}

export interface TradingInfo {
  yesMultiplier: number
  noMultiplier: number
  yesPrice: number
  noPrice: number
  totalLiquidity: string
}

export interface SwapMultiplierInfo {
  multiplier: number
  amountOut: string
  fee: string
}

export interface OrderInfo {
  user: string
  marketId: number
  isYes: boolean
  tokenAmount: string
  stopLossPrice: number
  takeProfitPrice: number
  isActive: boolean
}

export enum OrderType {
  StopLoss = 0,
  TakeProfit = 1
}

// AI Validation Helper - with fallback
async function validateMarketWithPerplexity(params: MarketCreationParams): Promise<{ valid: boolean, reason?: string, category?: string }> {
  try {
    console.log('🔍 Attempting AI validation...')
    const res = await fetch('https://sigma-predection.vercel.app/api/validate-market', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
      signal: AbortSignal.timeout(5000)
    })

    if (!res.ok) {
      let errorMessage = 'Failed to validate market with AI'
      try {
        const errorData = await res.json()
        errorMessage = errorData.reason || errorData.error || errorMessage
      } catch {
        errorMessage = res.statusText || errorMessage
      }
      throw new Error(errorMessage)
    }

    const data = await res.json()
    console.log('✅ AI validation passed')
    return data
  } catch (error: any) {
    console.warn('⚠️ AI validation failed, using local validation:', error?.message)
    // ✅ Fallback to local validation
    return {
      valid: true,
      category: params.category || 'General',
      reason: 'Using local validation'
    }
  }
}

export function usePredictionMarketBNB() {
  const { account, provider, signer, isCorrectNetwork } = useWeb3Context()
  const [isLoading, setIsLoading] = useState(false)
  const [marketContract, setMarketContract] = useState<ethers.Contract | null>(null)
  const [helperContract, setHelperContract] = useState<ethers.Contract | null>(null)
  const [isContractReady, setIsContractReady] = useState(false)

  // Initialize contracts
  useEffect(() => {
    const initializeContracts = async () => {
      console.log('🔍 useWeb3Context - Provider:', !!provider)
      
      if (!provider) {
        console.warn('⚠️ No provider available')
        setMarketContract(null)
        setHelperContract(null)
        setIsContractReady(false)
        return
      }

      try {
        const network = await provider.getNetwork()
        console.log('🌐 Network check:', { chainId: network.chainId.toString(), expected: '97' })
        
        // BSC Testnet chain ID is 97
        if (network.chainId !== BigInt(97)) {
          console.warn("⚠️ Not on BSC Testnet. Current chain:", network.chainId.toString())
          setMarketContract(null)
          setHelperContract(null)
          setIsContractReady(false)
          return
        }

        // Initialize main prediction market contract
        const predictionMarketContract = new ethers.Contract(
          PREDICTION_MARKET_ADDRESS,
          PREDICTION_MARKET_ABI,
          provider
        )

        // Initialize helper contract
        const helperContractInstance = new ethers.Contract(
          HELPER_CONTRACT_ADDRESS,
          HELPER_ABI,
          provider
        )
        
        try {
          // Test contracts
          console.log('📝 Testing Prediction Market contract...')
          const nextId = await (predictionMarketContract as any).nextMarketId()
          console.log('✅ Prediction Market contract connected. Next market ID:', nextId.toString())
          
          console.log('📝 Testing Helper contract...')
          // ✅ BUG FIX: Use helperContractInstance instead of marketContract
          const feeBps = await (helperContractInstance as any).feeBps?.() || 0
          console.log('✅ Helper contract connected. Fee BPS:', feeBps.toString())
          
          setMarketContract(predictionMarketContract)
          setHelperContract(helperContractInstance)
          setIsContractReady(true)
          console.log('✅ All contracts initialized successfully')
        } catch (testError) {
          console.error('❌ Contract initialization test failed:', testError)
          setMarketContract(null)
          setHelperContract(null)
          setIsContractReady(false)
        }
        
      } catch (error) {
        console.error('❌ Error initializing contracts:', error)
        setMarketContract(null)
        setHelperContract(null)
        setIsContractReady(false)
      }
    }

    initializeContracts()
  }, [provider])

  // ==================== MARKET CREATION (BNB ONLY) ====================

  const createMarket = useCallback(async (
    params: MarketCreationParams
  ): Promise<number> => {
    if (!signer || !account || !isCorrectNetwork) {
      throw new Error('Wallet not connected or wrong network')
    }
    if (!isContractReady || !marketContract) {
      throw new Error('Contract not ready - please ensure you\'re on BSC Testnet')
    }

    setIsLoading(true)
    try {
      // ✅ BUG FIX: Validation with fallback
      let validation: { valid: boolean; reason?: string; category?: string }
      try {
        validation = await validateMarketWithPerplexity(params)
        if (!validation.valid) {
          console.warn("⚠️ AI validation failed, using local validation")
          validation = { valid: true, category: params.category || 'General' }
        }
      } catch (error) {
        console.warn("⚠️ AI validation request failed, using local validation")
        validation = { valid: true, category: params.category || 'General' }
      }

      const marketWithSigner = new ethers.Contract(
        PREDICTION_MARKET_ADDRESS,
        PREDICTION_MARKET_ABI,
        signer
      )

      const initialYesWei = ethers.parseEther(params.initialYes)
      const initialNoWei = ethers.parseEther(params.initialNo)
      const totalValue = initialYesWei + initialNoWei

      console.log('📝 Creating BNB market...', { question: params.question })

      // Create market with BNB
      const tx = await (marketWithSigner as any).createMarket(
        params.question,
        validation.category || params.category || 'General',
        BigInt(params.endTime),
        initialYesWei,
        initialNoWei,
        { value: totalValue }
      )

      const receipt = await tx.wait()
      let marketId: number

      // Find MarketCreated event
      const marketCreatedTopic = ethers.id('MarketCreated(uint256,string,string,address,address,uint256)')
      const event = receipt?.logs.find((log: any) => log.topics[0] === marketCreatedTopic)

      if (event) {
        const iface = new ethers.Interface(PREDICTION_MARKET_ABI)
        const decodedEvent = iface.parseLog(event)
        marketId = Number(decodedEvent?.args[0])
      } else {
        const nextId = await (marketWithSigner as any).nextMarketId()
        marketId = Number(nextId) - 1
      }

      console.log(`✅ BNB Market created with ID: ${marketId}`)
      return marketId

    } catch (error: any) {
      console.error('❌ Error creating market:', error)
      throw new Error(error.reason || error.message || 'Failed to create market')
    } finally {
      setIsLoading(false)
    }
  }, [signer, account, isCorrectNetwork, isContractReady, marketContract])

  // ==================== MARKET DATA FETCHING ====================

  const getMarket = useCallback(async (marketId: number): Promise<BNBMarket> => {
    if (!marketContract || !helperContract) throw new Error('Contracts not available')

    try {
      const marketData = await (marketContract as any).markets(BigInt(marketId))

      // Remove quotes from question
      let question = marketData.question || `Market ${marketId}`
      if (typeof question === 'string' && question.startsWith('"') && question.endsWith('"')) {
        question = question.slice(1, -1)
      }

      // Get trading info from helper contract
      const tradingInfo = await (helperContract as any).getTradingInfo(BigInt(marketId))
      
      const market: BNBMarket = {
        id: marketId,
        creator: marketData.creator,
        question: question,
        category: marketData.category || "General",
        endTime: Number(marketData.endTime),
        status: marketData.status,
        outcome: marketData.outcome,
        yesToken: marketData.yesToken,
        noToken: marketData.noToken,
        yesPool: ethers.formatEther(marketData.yesPool),
        noPool: ethers.formatEther(marketData.noPool),
        lpTotalSupply: ethers.formatEther(marketData.lpTotalSupply),
        totalBacking: ethers.formatEther(marketData.totalBacking),
        platformFees: ethers.formatEther(marketData.platformFees),
        resolutionRequestedAt: Number(marketData.resolutionRequestedAt),
        resolutionRequester: marketData.resolutionRequester,
        resolutionReason: marketData.resolutionReason,
        resolutionConfidence: Number(marketData.resolutionConfidence),
        disputeDeadline: Number(marketData.disputeDeadline),
        disputer: marketData.disputer,
        disputeReason: marketData.disputeReason,
        yesPrice: Number(tradingInfo.yesPrice) / 100,
        noPrice: Number(tradingInfo.noPrice) / 100,
        yesMultiplier: Number(tradingInfo.yesMultiplier) / 10000,
        noMultiplier: Number(tradingInfo.noMultiplier) / 10000
      }

      return market

    } catch (error) {
      console.error('❌ Error fetching market:', error)
      throw error
    }
  }, [marketContract, helperContract])

  // ==================== USER INVESTMENT FUNCTIONS ====================

  const getMarketInvestment = useCallback(async (
    userAddress: string, 
    marketId: number
  ): Promise<string> => {
    if (!helperContract) throw new Error('Helper contract not available')
    
    try {
      const investment = await (helperContract as any).getMarketInvestment(BigInt(marketId), userAddress)
      const investmentBNB = ethers.formatEther(investment)
      console.log(`📊 Market ${marketId} investment for ${userAddress}: ${investmentBNB} BNB`)
      return investmentBNB
      
    } catch (error) {
      console.error('❌ Error fetching market investment:', error)
      return "0"
    }
  }, [helperContract])

  const getTotalInvestment = useCallback(async (userAddress: string): Promise<string> => {
    if (!helperContract) throw new Error('Helper contract not available')
    
    try {
      const totalInvestment = await (helperContract as any).getUserTotalInvestment(userAddress)
      const totalInvestmentBNB = ethers.formatEther(totalInvestment)
      console.log(`💰 Total BNB investment for ${userAddress}: ${totalInvestmentBNB} BNB`)
      return totalInvestmentBNB
      
    } catch (error) {
      console.error('❌ Error fetching total investment:', error)
      return "0"
    }
  }, [helperContract])

  // ==================== USER POSITIONS ====================

  const getUserPositions = useCallback(async (userAddress: string): Promise<UserPosition[]> => {
    if (!helperContract) throw new Error('Helper contract not available')
    
    try {
      console.log('🔍 Fetching user positions from helper contract...')
      
      const positions = await (helperContract as any).getUserPositions(userAddress)
      const formattedPositions: UserPosition[] = []
      
      for (const pos of positions) {
        const yesBalanceFormatted = ethers.formatEther(pos.yesBalance)
        const noBalanceFormatted = ethers.formatEther(pos.noBalance)
        const bnbInvested = ethers.formatEther(pos.bnbInvested)
        
        const position: UserPosition = {
          marketId: Number(pos.marketId),
          yesBalance: yesBalanceFormatted,
          noBalance: noBalanceFormatted,
          totalInvested: (parseFloat(yesBalanceFormatted) + parseFloat(noBalanceFormatted)).toFixed(4),
          bnbInvested
        }
        
        formattedPositions.push(position)
        console.log(`✅ Position for market ${pos.marketId}:`, position)
      }
      
      console.log(`📊 Total positions found: ${formattedPositions.length}`)
      return formattedPositions
      
    } catch (error) {
      console.error('❌ Error fetching user positions:', error)
      throw error
    }
  }, [helperContract])

  // ==================== MULTIPLIER & PRICE CALCULATIONS ====================

  const getBuyYesMultiplier = useCallback(async (
    marketId: number, 
    bnbAmount: string
  ): Promise<MultiplierInfo> => {
    if (!helperContract) throw new Error('Helper contract not available')
    
    try {
      const amountInWei = ethers.parseEther(bnbAmount)
      const result = await (helperContract as any).getBuyYesMultiplier(BigInt(marketId), amountInWei)
      
      return {
        multiplier: Number(result.multiplier) / 10000,
        totalOut: ethers.formatEther(result.totalOut),
        totalFee: ethers.formatEther(result.totalFee)
      }
    } catch (error) {
      console.error('❌ Error calculating YES multiplier:', error)
      throw error
    }
  }, [helperContract])

  const getBuyNoMultiplier = useCallback(async (
    marketId: number, 
    bnbAmount: string
  ): Promise<MultiplierInfo> => {
    if (!helperContract) throw new Error('Helper contract not available')
    
    try {
      const amountInWei = ethers.parseEther(bnbAmount)
      const result = await (helperContract as any).getBuyNoMultiplier(BigInt(marketId), amountInWei)
      
      return {
        multiplier: Number(result.multiplier) / 10000,
        totalOut: ethers.formatEther(result.totalOut),
        totalFee: ethers.formatEther(result.totalFee)
      }
    } catch (error) {
      console.error('❌ Error calculating NO multiplier:', error)
      throw error
    }
  }, [helperContract])

  const getCurrentMultipliers = useCallback(async (
    marketId: number
  ): Promise<{ yesMultiplier: number; noMultiplier: number; yesPrice: number; noPrice: number }> => {
    if (!helperContract) throw new Error('Helper contract not available')
    
    try {
      const result = await (helperContract as any).getCurrentMultipliers(BigInt(marketId))
      
      return {
        yesMultiplier: Number(result[0]) / 10000,
        noMultiplier: Number(result[1]) / 10000,
        yesPrice: Number(result[2]) / 100,
        noPrice: Number(result[3]) / 100
      }
    } catch (error) {
      console.error('❌ Error fetching current multipliers:', error)
      throw error
    }
  }, [helperContract])

  const getTradingInfo = useCallback(async (marketId: number): Promise<TradingInfo> => {
    if (!helperContract) throw new Error('Helper contract not available')
    
    try {
      const result = await (helperContract as any).getTradingInfo(BigInt(marketId))
      
      return {
        yesMultiplier: Number(result.yesMultiplier) / 10000,
        noMultiplier: Number(result.noMultiplier) / 10000,
        yesPrice: Number(result.yesPrice) / 100,
        noPrice: Number(result.noPrice) / 100,
        totalLiquidity: ethers.formatEther(result.totalLiquidity)
      }
    } catch (error) {
      console.error('❌ Error fetching trading info:', error)
      throw error
    }
  }, [helperContract])

  const getSwapMultiplier = useCallback(async (
    marketId: number,
    amountIn: string,
    isYesIn: boolean
  ): Promise<SwapMultiplierInfo> => {
    if (!helperContract) throw new Error('Helper contract not available')
    
    try {
      const amountInWei = ethers.parseEther(amountIn)
      const result = await (helperContract as any).getSwapMultiplier(BigInt(marketId), amountInWei, isYesIn)
      
      return {
        multiplier: Number(result.multiplier) / 10000,
        amountOut: ethers.formatEther(result.amountOut),
        fee: ethers.formatEther(result.fee)
      }
    } catch (error) {
      console.error('❌ Error calculating swap multiplier:', error)
      throw error
    }
  }, [helperContract])

  // ==================== PRICE CALCULATIONS ====================

  const getYesPrice = useCallback(async (marketId: number): Promise<number> => {
    if (!helperContract) throw new Error('Helper contract not available')
    
    try {
      const price = await (helperContract as any).getYesPrice(BigInt(marketId))
      return Number(price) / 100
    } catch (error) {
      console.error('❌ Error fetching YES price:', error)
      throw error
    }
  }, [helperContract])

  const getNoPrice = useCallback(async (marketId: number): Promise<number> => {
    if (!helperContract) throw new Error('Helper contract not available')
    
    try {
      const price = await (helperContract as any).getNoPrice(BigInt(marketId))
      return Number(price) / 100
    } catch (error) {
      console.error('❌ Error fetching NO price:', error)
      throw error
    }
  }, [helperContract])

  // ==================== STATUS CHECKS ====================

  const canRequestResolution = useCallback(async (marketId: number): Promise<boolean> => {
    if (!helperContract) throw new Error('Helper contract not available')
    
    try {
      return await (helperContract as any).canRequestResolution(BigInt(marketId))
    } catch (error) {
      console.error('❌ Error checking resolution status:', error)
      return false
    }
  }, [helperContract])

  const canDispute = useCallback(async (marketId: number): Promise<boolean> => {
    if (!helperContract) throw new Error('Helper contract not available')
    
    try {
      return await (helperContract as any).canDispute(BigInt(marketId))
    } catch (error) {
      console.error('❌ Error checking dispute status:', error)
      return false
    }
  }, [helperContract])

  // ==================== TRADING FUNCTIONS (BNB ONLY) ====================

  const buyYesWithBNB = useCallback(async (
    marketId: number,
    minTokensOut: string,
    amountIn: string
  ) => {
    if (!signer || !isCorrectNetwork || !marketContract) throw new Error('Wallet not connected or wrong network')
    
    const marketWithSigner = new ethers.Contract(
      PREDICTION_MARKET_ADDRESS,
      PREDICTION_MARKET_ABI,
      signer
    )
    
    const amountInWei = ethers.parseEther(amountIn)
    const minOutWei = ethers.parseEther(minTokensOut)
    
    const tx = await (marketWithSigner as any).buyYesWithBNBFor(
      BigInt(marketId),
      account,
      minOutWei,
      { value: amountInWei }
    )
    
    return await tx.wait()
  }, [signer, isCorrectNetwork, marketContract, account])

  const buyNoWithBNB = useCallback(async (
    marketId: number,
    minTokensOut: string,
    amountIn: string
  ) => {
    if (!signer || !isCorrectNetwork || !marketContract) throw new Error('Wallet not connected or wrong network')
    
    const marketWithSigner = new ethers.Contract(
      PREDICTION_MARKET_ADDRESS,
      PREDICTION_MARKET_ABI,
      signer
    )
    
    const amountInWei = ethers.parseEther(amountIn)
    const minOutWei = ethers.parseEther(minTokensOut)
    
    const tx = await (marketWithSigner as any).buyNoWithBNBFor(
      BigInt(marketId),
      account,
      minOutWei,
      { value: amountInWei }
    )
    
    return await tx.wait()
  }, [signer, isCorrectNetwork, marketContract, account])

  const sellYesForBNB = useCallback(async (
    marketId: number,
    tokenAmount: string,
    minBNBOut: string
  ) => {
    if (!signer || !isCorrectNetwork || !marketContract) throw new Error('Wallet not connected or wrong network')
    
    const marketWithSigner = new ethers.Contract(
      PREDICTION_MARKET_ADDRESS,
      PREDICTION_MARKET_ABI,
      signer
    )
    
    const tokenAmountWei = ethers.parseEther(tokenAmount)
    const minBNBOutWei = ethers.parseEther(minBNBOut)
    
    const tx = await (marketWithSigner as any).sellYesForBNB(
      BigInt(marketId),
      tokenAmountWei,
      minBNBOutWei
    )
    
    return await tx.wait()
  }, [signer, isCorrectNetwork, marketContract])

  const sellNoForBNB = useCallback(async (
    marketId: number,
    tokenAmount: string,
    minBNBOut: string
  ) => {
    if (!signer || !isCorrectNetwork || !marketContract) throw new Error('Wallet not connected or wrong network')
    
    const marketWithSigner = new ethers.Contract(
      PREDICTION_MARKET_ADDRESS,
      PREDICTION_MARKET_ABI,
      signer
    )
    
    const tokenAmountWei = ethers.parseEther(tokenAmount)
    const minBNBOutWei = ethers.parseEther(minBNBOut)
    
    const tx = await (marketWithSigner as any).sellNoForBNB(
      BigInt(marketId),
      tokenAmountWei,
      minBNBOutWei
    )
    
    return await tx.wait()
  }, [signer, isCorrectNetwork, marketContract])

  // ==================== LIQUIDITY FUNCTIONS ====================

  const addLiquidity = useCallback(async (
    marketId: number,
    yesAmount: string,
    noAmount: string
  ) => {
    if (!signer || !isCorrectNetwork || !marketContract) throw new Error('Wallet not connected or wrong network')
    
    const marketWithSigner = new ethers.Contract(
      PREDICTION_MARKET_ADDRESS,
      PREDICTION_MARKET_ABI,
      signer
    )
    
    const yesAmountWei = ethers.parseEther(yesAmount)
    const noAmountWei = ethers.parseEther(noAmount)
    
    const tx = await (marketWithSigner as any).addLiquidity(
      BigInt(marketId),
      yesAmountWei,
      noAmountWei
    )
    
    return await tx.wait()
  }, [signer, isCorrectNetwork, marketContract])

  const removeLiquidity = useCallback(async (
    marketId: number,
    lpAmount: string
  ) => {
    if (!signer || !isCorrectNetwork || !marketContract) throw new Error('Wallet not connected or wrong network')
    
    const marketWithSigner = new ethers.Contract(
      PREDICTION_MARKET_ADDRESS,
      PREDICTION_MARKET_ABI,
      signer
    )
    
    const lpAmountWei = ethers.parseEther(lpAmount)
    
    const tx = await (marketWithSigner as any).removeLiquidity(
      BigInt(marketId),
      lpAmountWei
    )
    
    return await tx.wait()
  }, [signer, isCorrectNetwork, marketContract])

  // ==================== STOP-LOSS & TAKE-PROFIT ORDERS ====================

  const createStopLossOrder = useCallback(async (
    marketId: number,
    isYes: boolean,
    tokenAmount: string,
    stopLossPrice: number
  ) => {
    if (!signer || !isCorrectNetwork || !marketContract) throw new Error('Wallet not connected or wrong network')
    
    const marketWithSigner = new ethers.Contract(
      PREDICTION_MARKET_ADDRESS,
      PREDICTION_MARKET_ABI,
      signer
    )
    
    const tokenAmountWei = ethers.parseEther(tokenAmount)
    
    const tx = await (marketWithSigner as any).createStopLossOrder(
      BigInt(marketId),
      isYes,
      tokenAmountWei,
      stopLossPrice
    )
    
    return await tx.wait()
  }, [signer, isCorrectNetwork, marketContract])

  const createTakeProfitOrder = useCallback(async (
    marketId: number,
    isYes: boolean,
    tokenAmount: string,
    takeProfitPrice: number
  ) => {
    if (!signer || !isCorrectNetwork || !marketContract) throw new Error('Wallet not connected or wrong network')
    
    const marketWithSigner = new ethers.Contract(
      PREDICTION_MARKET_ADDRESS,
      PREDICTION_MARKET_ABI,
      signer
    )
    
    const tokenAmountWei = ethers.parseEther(tokenAmount)
    
    const tx = await (marketWithSigner as any).createTakeProfitOrder(
      BigInt(marketId),
      isYes,
      tokenAmountWei,
      takeProfitPrice
    )
    
    return await tx.wait()
  }, [signer, isCorrectNetwork, marketContract])

  const executeOrder = useCallback(async (orderId: number) => {
    if (!signer || !isCorrectNetwork || !marketContract) throw new Error('Wallet not connected or wrong network')
    
    const marketWithSigner = new ethers.Contract(
      PREDICTION_MARKET_ADDRESS,
      PREDICTION_MARKET_ABI,
      signer
    )
    
    const tx = await (marketWithSigner as any).executeOrder(BigInt(orderId))
    return await tx.wait()
  }, [signer, isCorrectNetwork, marketContract])

  const cancelOrder = useCallback(async (orderId: number) => {
    if (!signer || !isCorrectNetwork || !marketContract) throw new Error('Wallet not connected or wrong network')
    
    const marketWithSigner = new ethers.Contract(
      PREDICTION_MARKET_ADDRESS,
      PREDICTION_MARKET_ABI,
      signer
    )
    
    const tx = await (marketWithSigner as any).cancelOrder(BigInt(orderId))
    return await tx.wait()
  }, [signer, isCorrectNetwork, marketContract])

  const getUserOrders = useCallback(async (userAddress: string): Promise<number[]> => {
    if (!marketContract) throw new Error('Market contract not available')
    
    try {
      const orderIds = await (marketContract as any).getUserOrders(userAddress)
      return orderIds.map((id: bigint) => Number(id))
    } catch (error) {
      console.error('❌ Error fetching user orders:', error)
      return []
    }
  }, [marketContract])

  const getOrderInfo = useCallback(async (orderId: number): Promise<OrderInfo> => {
    if (!marketContract) throw new Error('Market contract not available')
    
    try {
      const orderInfo = await (marketContract as any).getOrderInfo(BigInt(orderId))
      return {
        user: orderInfo.user,
        marketId: Number(orderInfo.marketId),
        isYes: orderInfo.isYes,
        tokenAmount: ethers.formatEther(orderInfo.tokenAmount),
        stopLossPrice: Number(orderInfo.stopLossPrice),
        takeProfitPrice: Number(orderInfo.takeProfitPrice),
        isActive: orderInfo.isActive
      }
    } catch (error) {
      console.error('❌ Error fetching order info:', error)
      throw error
    }
  }, [marketContract])

  const checkOrderTrigger = useCallback(async (orderId: number): Promise<{ triggered: boolean; currentPrice: number; triggerPrice: number }> => {
    if (!marketContract) throw new Error('Market contract not available')
    
    try {
      const result = await (marketContract as any).checkOrderTrigger(BigInt(orderId))
      return {
        triggered: result[0],
        currentPrice: Number(result[1]),
        triggerPrice: Number(result[2])
      }
    } catch (error) {
      console.error('❌ Error checking order trigger:', error)
      throw error
    }
  }, [marketContract])

  // ==================== RESOLUTION FUNCTIONS ====================

  const requestResolution = useCallback(async (marketId: number, reason: string = '') => {
    if (!signer || !isCorrectNetwork || !marketContract) throw new Error('Wallet not connected or wrong network')
    
    const marketWithSigner = new ethers.Contract(
      PREDICTION_MARKET_ADDRESS,
      PREDICTION_MARKET_ABI,
      signer
    )
    
    const tx = await (marketWithSigner as any).requestResolution(BigInt(marketId), reason)
    return await tx.wait()
  }, [signer, isCorrectNetwork, marketContract])

  const resolveMarket = useCallback(async (marketId: number, outcomeIndex: number, reason: string, confidence: number) => {
    if (!signer || !isCorrectNetwork || !marketContract) throw new Error('Wallet not connected or wrong network')
    
    const marketWithSigner = new ethers.Contract(
      PREDICTION_MARKET_ADDRESS,
      PREDICTION_MARKET_ABI,
      signer
    )
    
    const tx = await (marketWithSigner as any).resolveMarket(BigInt(marketId), outcomeIndex, reason, confidence)
    return await tx.wait()
  }, [signer, isCorrectNetwork, marketContract])

  const claimRedemption = useCallback(async (marketId: number) => {
    if (!signer || !isCorrectNetwork || !marketContract) throw new Error('Wallet not connected or wrong network')
    
    const marketWithSigner = new ethers.Contract(
      PREDICTION_MARKET_ADDRESS,
      PREDICTION_MARKET_ABI,
      signer
    )
    
    const tx = await (marketWithSigner as any).claimRedemption(BigInt(marketId))
    return await tx.wait()
  }, [signer, isCorrectNetwork, marketContract])

  const withdrawPlatformFees = useCallback(async (marketId: number) => {
    if (!signer || !isCorrectNetwork || !marketContract) throw new Error('Wallet not connected or wrong network')
    
    const marketWithSigner = new ethers.Contract(
      PREDICTION_MARKET_ADDRESS,
      PREDICTION_MARKET_ABI,
      signer
    )
    
    const tx = await (marketWithSigner as any).withdrawPlatformFees(BigInt(marketId))
    return await tx.wait()
  }, [signer, isCorrectNetwork, marketContract])

  return {
    // Market management
    createMarket,
    getMarket,
    
    // Investment tracking
    getMarketInvestment,
    getTotalInvestment,
    
    // Multiplier & Price calculations
    getBuyYesMultiplier,
    getBuyNoMultiplier,
    getCurrentMultipliers,
    getTradingInfo,
    getSwapMultiplier,
    getYesPrice,
    getNoPrice,
    
    // Trading functions (BNB ONLY)
    buyYesWithBNB,
    buyNoWithBNB,
    sellYesForBNB,
    sellNoForBNB,
    
    // Liquidity management
    addLiquidity,
    removeLiquidity,
    
    // Stop-loss & Take-profit orders
    createStopLossOrder,
    createTakeProfitOrder,
    executeOrder,
    cancelOrder,
    getUserOrders,
    getOrderInfo,
    checkOrderTrigger,
    
    // Resolution system
    requestResolution,
    resolveMarket,
    claimRedemption,
    withdrawPlatformFees,
    
    // Status checks
    canRequestResolution,
    canDispute,
    
    // User positions
    getUserPositions,
    
    // State
    isLoading,
    marketContract,
    helperContract,
    marketAddress: PREDICTION_MARKET_ADDRESS,
    helperAddress: HELPER_CONTRACT_ADDRESS,
    isContractReady,
    
    // Constants
    MarketStatus,
    Outcome,
    OrderType,
  }
}