import { useState, useCallback, useEffect } from 'react'
import { ethers, BrowserProvider, JsonRpcSigner } from 'ethers'
import { useAccount, useWalletClient, usePublicClient } from 'wagmi'
import PREDICTION_MARKET_JSON from '../contracts/abi.json'
import HELPER_JSON from '../contracts/helperABI.json'

const PREDICTION_MARKET_ABI = (PREDICTION_MARKET_JSON as any).abi || PREDICTION_MARKET_JSON
const HELPER_ABI = (HELPER_JSON as any).abi || HELPER_JSON

// Contract addresses - BNB only
const PREDICTION_MARKET_ADDRESS = process.env.NEXT_PUBLIC_PREDICTION_MARKET_ADDRESS || '0x52Ca4B7673646B8b922ea00ccef6DD0375B14619'
const HELPER_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_HELPER_CONTRACT_ADDRESS || '0xC940106a30742F21daE111d41e8F41d482feda15'

console.log('🔍 BNB Hook using Prediction Market:', PREDICTION_MARKET_ADDRESS)
console.log('🔍 BNB Hook using Helper:', HELPER_CONTRACT_ADDRESS)

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

export interface PricePoint {
  timestamp: number
  price: number
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
  isResolved?: boolean
  isCancelled?: boolean
}

export interface MarketCreationParams {
  question: string
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
    const res = await fetch('https://sigma-predection.vercel.app/api/validateMarket', {
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
    return data
  } catch (error: any) {
    // ✅ Fallback to local validation
    return {
      valid: true,
      category: 'General',
      reason: 'Using local validation'
    }
  }
}

export function usePredictionMarketBNB() {
  const { address: account, isConnected } = useAccount()
  const { data: walletClient } = useWalletClient()
  const publicClient = usePublicClient()

  const [isLoading, setIsLoading] = useState(false)
  const [marketContract, setMarketContract] = useState<ethers.Contract | null>(null)
  const [helperContract, setHelperContract] = useState<ethers.Contract | null>(null)
  const [isContractReady, setIsContractReady] = useState(false)
  const [provider, setProvider] = useState<BrowserProvider | null>(null)
  const [signer, setSigner] = useState<JsonRpcSigner | null>(null)

  const isCorrectNetwork = publicClient?.chain?.id === 97

  // Initialize provider from publicClient
  useEffect(() => {
    const initProvider = async () => {
      if (publicClient) {
        try {
          const ethersProvider = new BrowserProvider(publicClient.transport as any)
          setProvider(ethersProvider)
        } catch (error) {
          console.error('❌ Error initializing provider:', error)
        }
      } else {
        setProvider(null)
      }
    }
    initProvider()
  }, [publicClient])

  // Initialize signer from walletClient
  useEffect(() => {
    const initSigner = async () => {
      if (walletClient && account) {
        try {
          // Convert Wagmi's walletClient to ethers signer
          const ethersSigner = new ethers.BrowserProvider(walletClient.transport as any).getSigner(account)
          setSigner(await ethersSigner)
        } catch (error) {
          console.error('❌ Error initializing signer:', error)
          setSigner(null)
        }
      } else {
        setSigner(null)
      }
    }
    initSigner()
  }, [walletClient, account])

  // Initialize contracts
  useEffect(() => {
    const initializeContracts = async () => {

      if (!provider) {
        setMarketContract(null)
        setHelperContract(null)
        setIsContractReady(false)
        return
      }

      try {
        const network = await provider.getNetwork()

        if (Number(network.chainId) !== 97) {
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
          const nextId = await (predictionMarketContract as any).nextMarketId()

          const feeBps = await (helperContractInstance as any).feeBps?.() || 0

          setMarketContract(predictionMarketContract)
          setHelperContract(helperContractInstance)
          setIsContractReady(true)
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
  }, [provider, account])

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
      let validation: { valid: boolean; reason?: string; category?: string }
      try {
        validation = await validateMarketWithPerplexity(params)
        if (!validation.valid) {
          validation = { valid: true, category: 'General' }
        }
      } catch (error) {
        validation = { valid: true, category: 'General' }
      }

      const marketWithSigner = new ethers.Contract(
        PREDICTION_MARKET_ADDRESS,
        PREDICTION_MARKET_ABI,
        signer
      )

      const initialYesWei = ethers.parseEther(params.initialYes)
      const initialNoWei = ethers.parseEther(params.initialNo)
      const totalValue = initialYesWei + initialNoWei


      const tx = await (marketWithSigner as any).createMarket(
        params.question,
        BigInt(params.endTime),
        initialYesWei,
        initialNoWei,
        { value: totalValue }
      )

      const receipt = await tx.wait()
      let marketId: number

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


      // ✅ Store market creation date in Supabase to avoid block scanning later
      try {
        const createdAt = new Date().toISOString()
        await fetch('/api/markets/store', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            marketId,
            paymentToken: 'BNB',
            createdAt,
            blockNumber: receipt.blockNumber,
            transactionHash: receipt.hash,
            creatorAddress: account,
            question: params.question,
            category: validation.category || 'General',
            endTime: params.endTime,
          }),
        })
      } catch (storeError) {
      }

      return marketId

    } catch (error: any) {
      console.error('❌ Error creating market:', error)
      throw new Error(error.reason || error.message || 'Failed to create market')
    } finally {
      setIsLoading(false)
    }
  }, [signer, account, isCorrectNetwork, isContractReady, marketContract])

  // ==================== MARKET DATA FETCHING ====================

  const getMarket = useCallback(async (marketId: number): Promise<BNBMarket | null> => {
    if (!marketContract) return null

    try {
      // ✅ FIXED: Fetch directly from main contract (like PDX hook) to ensure accuracy
      const marketData = await (marketContract as any).markets(BigInt(marketId))

      // Check if market exists (creator is not zero address)
      if (marketData.creator === "0x0000000000000000000000000000000000000000") {
        return null
      }

      const yesPoolNum = parseFloat(ethers.formatEther(marketData.yesPool))
      const noPoolNum = parseFloat(ethers.formatEther(marketData.noPool))
      const totalPool = yesPoolNum + noPoolNum

      // Default to 50/50 if empty
      let yesPriceDecimal = 0.5
      let noPriceDecimal = 0.5

      if (totalPool > 0) {
        yesPriceDecimal = yesPoolNum / totalPool
        noPriceDecimal = noPoolNum / totalPool
      }

      // Prices in cents (0-100)
      const yesPrice = yesPriceDecimal * 100
      const noPrice = noPriceDecimal * 100

      // Multipliers: 1 / decimal_price
      const yesMultiplier = yesPriceDecimal > 0 ? 1 / yesPriceDecimal : 2
      const noMultiplier = noPriceDecimal > 0 ? 1 / noPriceDecimal : 2

      return {
        id: marketId,
        creator: marketData.creator,
        question: marketData.question,
        category: "General",
        endTime: Number(marketData.endTime),
        outcome: Number(marketData.outcome),
        status: Number(marketData.status),
        yesToken: marketData.yesToken,
        noToken: marketData.noToken,
        yesPool: ethers.formatEther(marketData.yesPool),
        noPool: ethers.formatEther(marketData.noPool),
        lpTotalSupply: ethers.formatEther(marketData.lpTotalSupply),
        totalBacking: ethers.formatEther(marketData.totalBacking || 0),
        platformFees: ethers.formatEther(marketData.platformFees),
        resolutionRequestedAt: Number(marketData.resolutionRequestedAt),
        resolutionRequester: marketData.resolutionRequester,
        resolutionReason: marketData.resolutionReason ? ethers.decodeBytes32String(marketData.resolutionReason) : "",
        resolutionConfidence: Number(marketData.resolutionConfidence),
        disputeDeadline: Number(marketData.disputeDeadline),
        disputer: marketData.disputer,
        disputeReason: "",
        yesPrice,
        noPrice,
        yesMultiplier,
        noMultiplier,
        isResolved: Number(marketData.status) === 3,
        isCancelled: Number(marketData.status) === 4,
      }
    } catch (error) {
      console.error(`Error fetching market ${marketId}:`, error)
      return null
    }
  }, [marketContract])


  // ==================== USER INVESTMENT FUNCTIONS ====================

  const getMarketInvestment = useCallback(async (
    userAddress: string,
    marketId: number
  ): Promise<string> => {
    if (!helperContract) throw new Error('Helper contract not available')

    try {
      const investment = await (helperContract as any).getMarketInvestment(BigInt(marketId), userAddress)
      const investmentBNB = ethers.formatEther(investment)
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
      }

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
      // ✅ FIXED: Correctly call getBuyYesMultiplier (no swap needed)
      const result = await (helperContract as any).getBuyYesMultiplier(BigInt(marketId), amountInWei)

      const totalOutTokens = Number(ethers.formatEther(result.totalOut))
      const bnbAmountNumber = parseFloat(bnbAmount)
      const realMultiplier = bnbAmountNumber > 0 ? totalOutTokens / bnbAmountNumber : 0


      return {
        multiplier: realMultiplier,
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
      // ✅ FIXED: Correctly call getBuyNoMultiplier (no swap needed)
      const result = await (helperContract as any).getBuyNoMultiplier(BigInt(marketId), amountInWei)

      const totalOutTokens = Number(ethers.formatEther(result.totalOut))
      const bnbAmountNumber = parseFloat(bnbAmount)
      const realMultiplier = bnbAmountNumber > 0 ? totalOutTokens / bnbAmountNumber : 0


      return {
        multiplier: realMultiplier,
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

      // ✅ FIXED: Use prices for multiplier calculation (same as PDX hook logic)
      // result[2] = yesPrice in basis points (e.g., 7800 = 78.00%)
      // result[3] = noPrice in basis points (e.g., 2200 = 22.00%)

      const yesPriceInCents = Number(result[2]) / 100  // 78.00
      const noPriceInCents = Number(result[3]) / 100   // 22.00

      const yesPriceDecimal = yesPriceInCents / 100    // 0.78
      const noPriceDecimal = noPriceInCents / 100      // 0.22

      return {
        yesMultiplier: yesPriceDecimal > 0 ? 1 / yesPriceDecimal : 2,
        noMultiplier: noPriceDecimal > 0 ? 1 / noPriceDecimal : 2,
        yesPrice: yesPriceInCents,
        noPrice: noPriceInCents
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

      // ✅ FIXED: Invert the multipliers
      const yesPriceBps = Number(result.yesMultiplier) / 10000
      const noPriceBps = Number(result.noMultiplier) / 10000

      return {
        yesMultiplier: yesPriceBps > 0 ? Number((1 / yesPriceBps).toFixed(4)) : 2,
        noMultiplier: noPriceBps > 0 ? Number((1 / noPriceBps).toFixed(4)) : 2,
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

  const getBuyOutcomeOut = useCallback(async (
    marketId: number,
    bnbAmount: string,
    outcome: "YES" | "NO"
  ): Promise<{ amountOut: string; fee: string }> => {
    const contract = helperContract || marketContract
    if (!contract) {
      throw new Error('Contracts not available')
    }

    try {
      const amountInWei = ethers.parseEther(bnbAmount)

      if (outcome === "YES") {
        const res: any = await (contract as any).getBuyYesOut(BigInt(marketId), amountInWei)
        const yesOut = res?.[0] ?? res?.yesOut ?? res
        const fee = res?.[1] ?? res?.fee ?? BigInt(0)
        return {
          amountOut: ethers.formatEther(yesOut),
          fee: ethers.formatEther(fee)
        }
      } else {
        const res: any = await (contract as any).getBuyNoOut(BigInt(marketId), amountInWei)
        const noOut = res?.[0] ?? res?.noOut ?? res
        const fee = res?.[1] ?? res?.fee ?? BigInt(0)
        return {
          amountOut: ethers.formatEther(noOut),
          fee: ethers.formatEther(fee)
        }
      }
    } catch (error) {
      console.error('getBuyOutcomeOut error:', error)
      return { amountOut: "0", fee: "0" }
    }
  }, [helperContract, marketContract])

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
    if (!account) throw new Error('No account connected')

    const marketWithSigner = new ethers.Contract(
      PREDICTION_MARKET_ADDRESS,
      PREDICTION_MARKET_ABI,
      signer
    )

    const amountInWei = ethers.parseEther(amountIn)
    const minOutWei = ethers.parseEther(minTokensOut)

    // ✅ FIXED: Swap - call buyYesWithBNBFor to actually buy YES tokens
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
    if (!account) throw new Error('No account connected')

    const marketWithSigner = new ethers.Contract(
      PREDICTION_MARKET_ADDRESS,
      PREDICTION_MARKET_ABI,
      signer
    )

    const amountInWei = ethers.parseEther(amountIn)
    const minOutWei = ethers.parseEther(minTokensOut)

    // ✅ FIXED: Correctly call buyNoWithBNBFor
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
      minBNBOutWei,
      { gasLimit: 500000n }
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

  const getMarketPriceHistory = useCallback(async (marketId: number): Promise<PricePoint[]> => {
    if (!marketContract) return []

    try {

      const points: PricePoint[] = []

      // ✅ Try to get creation date from Supabase (avoids expensive block scanning)
      try {
        const response = await fetch(`/api/markets/get-creation-date?marketId=${marketId}&paymentToken=BNB`)
        if (response.ok) {
          const result = await response.json()
          if (result.success && result.data?.created_at) {
            const createdAt = new Date(result.data.created_at).getTime()
            points.push({
              timestamp: createdAt,
              price: 50 // Markets start at 50%
            })
          } else {
          }
        }
      } catch (fetchError) {
      }

      const provider = marketContract.runner?.provider
      if (!provider) throw new Error("No provider")

      const currentBlock = await provider.getBlockNumber()
      // ✅ Reduced scan range to 500K blocks (from 2M) to minimize RPC calls
      const startBlock = Math.max(0, currentBlock - 500000)

      // Get Buy events
      const buyFilter = marketContract.filters.BuyWithBNB(BigInt(marketId))
      let buyEvents: any[] = []
      try {
        buyEvents = await marketContract.queryFilter(buyFilter, startBlock, currentBlock)
      } catch (e) {
      }

      // Get Sell events
      const sellFilter = marketContract.filters.SellForBNB(BigInt(marketId))
      let sellEvents: any[] = []
      try {
        sellEvents = await marketContract.queryFilter(sellFilter, startBlock, currentBlock)
      } catch (e) {
      }

      // Process Buy events
      for (const event of buyEvents) {
        try {
          const block = await event.getBlock()
          const { buyYes, bnbIn, tokenOut } = (event as any).args

          const pricePerToken = Number(ethers.formatEther(bnbIn)) / Number(ethers.formatEther(tokenOut))

          let yesPrice = 0
          if (buyYes) {
            yesPrice = pricePerToken * 100
          } else {
            yesPrice = 100 - (pricePerToken * 100)
          }

          points.push({
            timestamp: block.timestamp * 1000,
            price: Math.max(0, Math.min(100, yesPrice))
          })
        } catch (e) {
        }
      }

      // Process Sell events
      for (const event of sellEvents) {
        try {
          const block = await event.getBlock()
          const { sellYes, tokenIn, bnbOut } = (event as any).args

          const pricePerToken = Number(ethers.formatEther(bnbOut)) / Number(ethers.formatEther(tokenIn))

          let yesPrice = 0
          if (sellYes) {
            yesPrice = pricePerToken * 100
          } else {
            yesPrice = 100 - (pricePerToken * 100)
          }

          points.push({
            timestamp: block.timestamp * 1000,
            price: Math.max(0, Math.min(100, yesPrice))
          })
        } catch (e) {
        }
      }

      points.sort((a, b) => a.timestamp - b.timestamp)

      // Add current time point
      if (points.length > 0) {
        const lastPoint = points[points.length - 1]
        points.push({
          timestamp: Date.now(),
          price: lastPoint.price
        })
      }

      return points

    } catch (error) {
      console.error('Error fetching price history:', error)
      return []
    }
  }, [marketContract])

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
    getBuyOutcomeOut,

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
    getMarketPriceHistory,

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