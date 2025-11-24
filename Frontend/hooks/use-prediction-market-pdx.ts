import { useState, useCallback, useEffect } from 'react'
import { ethers } from 'ethers'
import { useAccount, useWalletClient, usePublicClient } from 'wagmi'
import PDX_PREDICTION_MARKET_ABI from '../contracts/pdxabi.json'
import PDX_HELPER_ABI from '../contracts/pdxhelperabi.json'
import ERC20_ABI from '../contracts/erc20ABI.json'

// Contract addresses
const PDX_PREDICTION_MARKET_ADDRESS = process.env.NEXT_PUBLIC_PDX_MARKET_ADDRESS || '0x275fa689f785fa232861a076aD4cc1955F88171A'
const PDX_HELPER_ADDRESS = process.env.NEXT_PUBLIC_PDX_HELPER_ADDRESS || '0x02D4E1573ec5ade27eC852fBBf873d7073219E21'
const PDX_TOKEN_ADDRESS = process.env.NEXT_PUBLIC_PDX_TOKEN_ADDRESS || '0xeE943aCCAa07ED556DfAc9d3a76015050fA78BC8'

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

export interface PDXMarket {
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
  totalBacking: string
  yesPrice?: number
  noPrice?: number
  yesMultiplier?: number
  noMultiplier?: number
  paymentToken: "PDX"
}

export interface MarketCreationParams {
  question: string
  category: string
  endTime: number
  initialYes: string
  initialNo: string
}

export interface UserInvestment {
  totalInvested: string
  yesBalance: string
  noBalance: string
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

// PDX Market Creation Validation
async function validatePDXMarketWithPerplexity(params: MarketCreationParams): Promise<{ valid: boolean, reason?: string, category?: string }> {
  try {
    const res = await fetch('https://sigma-predection.vercel.app/api/validateMarket', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params)
    })

    if (!res.ok) {
      let errorMessage = 'Failed to validate PDX market with AI'
      try {
        const errorData = await res.json()
        errorMessage = errorData.reason || errorData.error || errorMessage
      } catch {
        errorMessage = res.statusText || errorMessage
      }
      throw new Error(errorMessage)
    }

    return await res.json()
  } catch (error: any) {
    console.error('PDX Validation request failed:', error)
    throw new Error(error.message || 'Network error during PDX validation')
  }
}

export function usePredictionMarketPDX() {
  const { address: account, isConnected } = useAccount()
  const { data: walletClient } = useWalletClient()
  const publicClient = usePublicClient()
  
  const [isLoading, setIsLoading] = useState(false)
  const [marketContract, setMarketContract] = useState<ethers.Contract | null>(null)
  const [helperContract, setHelperContract] = useState<ethers.Contract | null>(null)
  const [pdxTokenContract, setPdxTokenContract] = useState<ethers.Contract | null>(null)
  const [isContractReady, setIsContractReady] = useState(false)

  // Create ethers provider from wagmi public client (for read operations only)
  const getProvider = useCallback(() => {
    if (!publicClient) return null
    
    // Create a proper ethers provider from viem public client
    return new ethers.JsonRpcProvider('https://data-seed-prebsc-1-s1.bnbchain.org:8545')
  }, [publicClient])

  // Get signer for write operations
  const getSigner = useCallback(async () => {
    if (!walletClient || !account) return null
    
    // Create ethers wallet from wagmi wallet client
    const provider = getProvider()
    if (!provider) return null

    // Use BrowserProvider with the wallet client's transport
    const browserProvider = new ethers.BrowserProvider(walletClient as any)
    return await browserProvider.getSigner(account)
  }, [walletClient, account, getProvider])

  // Initialize contracts when provider changes
  useEffect(() => {
    const initializeContracts = async () => {
      const provider = getProvider()
      
      if (!provider) {
        setMarketContract(null)
        setHelperContract(null)
        setPdxTokenContract(null)
        setIsContractReady(false)
        return
      }

      try {
        const network = await provider.getNetwork()

        // compare as number to avoid BigInt literal issues in TS targets < ES2020
        if (Number(network.chainId) !== 97) {
          console.warn("⚠️ Not on BSC Testnet. Current chain:", network.chainId?.toString?.() ?? network.chainId)
          setMarketContract(null)
          setHelperContract(null)
          setPdxTokenContract(null)
          setIsContractReady(false)
          return
        }

        const marketInstance = new ethers.Contract(
          PDX_PREDICTION_MARKET_ADDRESS,
          PDX_PREDICTION_MARKET_ABI,
          provider
        )

        const helperInstance = new ethers.Contract(
          PDX_HELPER_ADDRESS,
          PDX_HELPER_ABI,
          provider
        )

        const pdxInstance = new ethers.Contract(
          PDX_TOKEN_ADDRESS,
          ERC20_ABI,
          provider
        )

        try {
          const owner = await (marketInstance as any).owner()
          console.log('✅ PDX Market contract connected. Owner:', owner)

          const nextMarketId = await (marketInstance as any).nextMarketId()
          console.log('✅ Total markets:', Number(nextMarketId))

          const pdxBalance = await (pdxInstance as any).balanceOf(PDX_PREDICTION_MARKET_ADDRESS)
          console.log('✅ PDX token contract connected. Market balance:', ethers.formatEther(pdxBalance))

          setMarketContract(marketInstance)
          setHelperContract(helperInstance)
          setPdxTokenContract(pdxInstance)
          setIsContractReady(true)
        } catch (testError) {
          console.error('❌ PDX Contract initialization test failed:', testError)
          setMarketContract(null)
          setHelperContract(null)
          setPdxTokenContract(null)
          setIsContractReady(false)
        }

      } catch (error) {
        console.error('❌ Error initializing PDX contracts:', error)
        setMarketContract(null)
        setHelperContract(null)
        setPdxTokenContract(null)
        setIsContractReady(false)
      }
    }

    initializeContracts()
  }, [getProvider])

  // ==================== VIEW FUNCTIONS ====================

  const getPDXMarket = useCallback(async (marketId: number): Promise<PDXMarket> => {
    if (!marketContract) throw new Error('Market contract not available')

    try {
      const marketData = await (marketContract as any).markets(BigInt(marketId))

      if (!marketData || !marketData.creator || marketData.creator === "0x0000000000000000000000000000000000000000") {
        throw new Error(`Market ${marketId} not found`)
      }

      const yesPoolNum = parseFloat(ethers.formatEther(marketData.yesPool))
      const noPoolNum = parseFloat(ethers.formatEther(marketData.noPool))
      const totalPool = yesPoolNum + noPoolNum

      let yesPrice = 50
      let noPrice = 50

      if (totalPool > 0) {
        yesPrice = (yesPoolNum / totalPool) * 100
        noPrice = (noPoolNum / totalPool) * 100
      }

      return {
        id: marketId,
        creator: marketData.creator,
        question: marketData.question,
        category: marketData.category,
        endTime: Number(marketData.endTime),
        status: Number(marketData.status),
        outcome: Number(marketData.outcome),
        yesToken: marketData.yesToken,
        noToken: marketData.noToken,
        yesPool: ethers.formatEther(marketData.yesPool),
        noPool: ethers.formatEther(marketData.noPool),
        totalBacking: ethers.formatEther(marketData.totalBacking),
        yesPrice,
        noPrice,
        yesMultiplier: yesPrice > 0 ? 100 / yesPrice : 2,
        noMultiplier: noPrice > 0 ? 100 / noPrice : 2,
        paymentToken: "PDX"
      }
    } catch (error) {
      console.error('❌ Error fetching market:', error)
      throw error
    }
  }, [marketContract])

  const getPDXMarketIds = useCallback(async (): Promise<number[]> => {
    if (!marketContract) throw new Error('Market contract not available')

    try {
      const nextMarketId = await (marketContract as any).nextMarketId()
      const totalMarkets = Number(nextMarketId)
      
      // Generate array of market IDs without loop
      return Array.from({ length: totalMarkets }, (_, i) => i)
    } catch (error) {
      console.error('❌ Error fetching market IDs:', error)
      return []
    }
  }, [marketContract])

  const getPDXMarkets = useCallback(async (marketIds: number[]): Promise<PDXMarket[]> => {
    if (!marketContract) throw new Error('Market contract not available')
    if (marketIds.length === 0) return []

    try {
      // Batch fetch all markets in parallel
      const marketPromises = marketIds.map(id => getPDXMarket(id))
      const markets = await Promise.allSettled(marketPromises)
      
      // Filter out failed fetches and return successful ones
      return markets
        .filter((result): result is PromiseFulfilledResult<PDXMarket> => result.status === 'fulfilled')
        .map(result => result.value)
    } catch (error) {
      console.error('❌ Error batch fetching markets:', error)
      return []
    }
  }, [marketContract, getPDXMarket])

  const getAllPDXMarkets = useCallback(async (): Promise<PDXMarket[]> => {
    try {
      const marketIds = await getPDXMarketIds()
      return await getPDXMarkets(marketIds)
    } catch (error) {
      console.error('❌ Error fetching all markets:', error)
      return []
    }
  }, [getPDXMarketIds, getPDXMarkets])

  const getUserInvestment = useCallback(async (marketId: number, userAddress: string): Promise<UserInvestment> => {
    if (!helperContract) throw new Error('Helper contract not available')

    try {
      const provider = getProvider()
      if (!provider) throw new Error('Provider not available')

      const investment = await (helperContract as any).getMarketInvestment(BigInt(marketId), userAddress)

      // Get YES/NO token balances
      const market = await getPDXMarket(marketId)
      const yesTokenContract = new ethers.Contract(market.yesToken, ERC20_ABI, provider)
      const noTokenContract = new ethers.Contract(market.noToken, ERC20_ABI, provider)

      const yesBalance = await (yesTokenContract as any).balanceOf(userAddress)
      const noBalance = await (noTokenContract as any).balanceOf(userAddress)

      return {
        totalInvested: ethers.formatEther(investment),
        yesBalance: ethers.formatEther(yesBalance),
        noBalance: ethers.formatEther(noBalance)
      }
    } catch (error) {
      console.error('❌ Error fetching user investment:', error)
      return {
        totalInvested: "0",
        yesBalance: "0",
        noBalance: "0"
      }
    }
  }, [helperContract, getPDXMarket, getProvider])

  const getUserPositions = useCallback(async (userAddress: string): Promise<any[]> => {
    if (!helperContract) throw new Error('Helper contract not available')

    try {
      const positions = await (helperContract as any).getUserPositions(userAddress)

      const formattedPositions = await Promise.all(
        positions.map(async (pos: any) => {
          const market = await getPDXMarket(Number(pos.marketId))
          return {
            marketId: Number(pos.marketId),
            market,
            yesBalance: ethers.formatEther(pos.yesBalance),
            noBalance: ethers.formatEther(pos.noBalance),
            pdxInvested: ethers.formatEther(pos.pdxInvested),
            paymentToken: "PDX"
          }
        })
      )

      return formattedPositions
    } catch (error) {
      console.error('❌ Error fetching user positions:', error)
      return []
    }
  }, [helperContract, getPDXMarket])

  // ==================== ESTIMATION FUNCTIONS ====================

  const getBuyYesMultiplier = useCallback(async (
    marketId: number,
    pdxAmount: string
  ): Promise<MultiplierInfo> => {
    if (!marketContract) throw new Error('Market contract not available')

    try {
      const pdxAmountWei = ethers.parseEther(pdxAmount)
      const result = await (marketContract as any).getBuyYesOutput(BigInt(marketId), pdxAmountWei)

      const totalOut = ethers.formatEther(result[0])
      const totalFee = ethers.formatEther(result[1])
      const multiplier = parseFloat(totalOut) / parseFloat(pdxAmount)

      return {
        multiplier,
        totalOut,
        totalFee
      }
    } catch (error) {
      console.error('❌ Error estimating YES purchase:', error)
      throw error
    }
  }, [marketContract])

  const getBuyNoMultiplier = useCallback(async (
    marketId: number,
    pdxAmount: string
  ): Promise<MultiplierInfo> => {
    if (!marketContract) throw new Error('Market contract not available')

    try {
      const pdxAmountWei = ethers.parseEther(pdxAmount)
      const result = await (marketContract as any).getBuyNoOutput(BigInt(marketId), pdxAmountWei)

      const totalOut = ethers.formatEther(result[0])
      const totalFee = ethers.formatEther(result[1])
      const multiplier = parseFloat(totalOut) / parseFloat(pdxAmount)

      return {
        multiplier,
        totalOut,
        totalFee
      }
    } catch (error) {
      console.error('❌ Error estimating NO purchase:', error)
      throw error
    }
  }, [marketContract])

  const getCurrentMultipliers = useCallback(async (marketId: number): Promise<TradingInfo> => {
    if (!marketContract) throw new Error('Market contract not available')

    try {
      const result = await (marketContract as any).getCurrentMultipliers(BigInt(marketId))

      return {
        yesMultiplier: Number(result[0]) / 10000,
        noMultiplier: Number(result[1]) / 10000,
        yesPrice: Number(result[2]),
        noPrice: Number(result[3]),
        totalLiquidity: "0" // Calculate from market data if needed
      }
    } catch (error) {
      console.error('❌ Error fetching current multipliers:', error)
      throw error
    }
  }, [marketContract])

  const getSellEstimatePDX = useCallback(async (
    marketId: number,
    tokenAmount: string,
    isYes: boolean
  ): Promise<{ pdxOut: string; fee: string }> => {
    try {
      // Estimate based on AMM formula (simplified)
      const market = await getPDXMarket(marketId)
      const fee = parseFloat(tokenAmount) * 0.005 // 0.5% fee
      const pdxOut = parseFloat(tokenAmount) - fee

      return {
        pdxOut: pdxOut.toFixed(6),
        fee: fee.toFixed(6)
      }
    } catch (error) {
      console.error('❌ Error estimating sell:', error)
      return {
        pdxOut: (parseFloat(tokenAmount) * 0.995).toFixed(6),
        fee: (parseFloat(tokenAmount) * 0.005).toFixed(6)
      }
    }
  }, [getPDXMarket])

  // ==================== TRADING FUNCTIONS ====================

  const createMarketWithPDX = useCallback(async (
    params: MarketCreationParams
  ): Promise<number> => {
    if (!walletClient || !account || !isConnected) {
      throw new Error('Wallet not connected or wrong network')
    }
    if (!isContractReady || !marketContract || !pdxTokenContract) {
      throw new Error('Contracts not ready')
    }

    // Get signer from wallet client
    const signer = await getSigner()
    if (!signer) throw new Error('Failed to get signer')

    setIsLoading(true)
    try {
      const validation = await validatePDXMarketWithPerplexity(params)
      if (!validation.valid) {
        throw new Error(validation.reason || 'Market validation failed')
      }

      const marketWithSigner = (marketContract as ethers.Contract).connect(signer) as ethers.Contract
      const pdxWithSigner = (pdxTokenContract as ethers.Contract).connect(signer) as ethers.Contract

      const initialYesWei = ethers.parseEther(params.initialYes)
      const initialNoWei = ethers.parseEther(params.initialNo)
      const totalValue = initialYesWei + initialNoWei

      console.log('📊 Market Creation Details:', {
        question: params.question,
        category: validation.category || params.category,
        endTime: params.endTime,
        initialYes: params.initialYes,
        initialNo: params.initialNo,
        totalPDX: ethers.formatEther(totalValue)
      })

      // Check PDX balance first
      console.log('💰 Checking PDX balance...')
      const balance = await (pdxWithSigner as any).balanceOf(account)
      const balanceFormatted = ethers.formatEther(balance)
      console.log(`Balance: ${balanceFormatted} PDX, Required: ${ethers.formatEther(totalValue)} PDX`)

      if (balance < totalValue) {
        throw new Error(`Insufficient PDX balance. You have ${balanceFormatted} PDX but need ${ethers.formatEther(totalValue)} PDX`)
      }

      // Check current allowance
      console.log('🔍 Checking current PDX allowance...')
      const currentAllowance = await (pdxWithSigner as any).allowance(account, PDX_PREDICTION_MARKET_ADDRESS)
      console.log(`Current allowance: ${ethers.formatEther(currentAllowance)} PDX`)

      // Only approve if needed
      if (currentAllowance < totalValue) {
        console.log(`✍️ Approving ${ethers.formatEther(totalValue)} PDX...`)
        
        // Reset allowance to 0 first if there's an existing allowance (some tokens require this)
        if (currentAllowance > BigInt(0)) {
          console.log('Resetting existing allowance to 0...')
          const resetTx = await (pdxWithSigner as any).approve(PDX_PREDICTION_MARKET_ADDRESS, BigInt(0))
          await resetTx.wait()
          console.log('✅ Allowance reset')
        }

        const approveTx = await (pdxWithSigner as any).approve(PDX_PREDICTION_MARKET_ADDRESS, totalValue)
        console.log('⏳ Waiting for approval transaction...')
        await approveTx.wait()
        console.log('✅ PDX approved for market creation')
      } else {
        console.log('✅ Sufficient allowance already exists')
      }

      // Verify approval was successful
      const newAllowance = await (pdxWithSigner as any).allowance(account, PDX_PREDICTION_MARKET_ADDRESS)
      console.log(`Verified allowance: ${ethers.formatEther(newAllowance)} PDX`)

      if (newAllowance < totalValue) {
        throw new Error('Approval failed. Please try again.')
      }

      console.log('🚀 Creating market...')
      const tx = await (marketWithSigner as any).createMarket(
        params.question,
        validation.category || params.category || 'General',
        BigInt(params.endTime),
        initialYesWei,
        initialNoWei
      )

      console.log('⏳ Waiting for market creation:', tx.hash)
      const receipt = await tx.wait()

      if (!receipt) {
        throw new Error('Transaction failed')
      }

      const nextId = await (marketWithSigner as any).nextMarketId()
      const marketId = Number(nextId) - 1

      console.log(`✅ Market created with ID: ${marketId}`)
      return marketId

    } catch (error: any) {
      console.error('❌ Error creating market:', error)
      
      // Enhanced error messages
      if (error.message?.includes('Insufficient PDX balance')) {
        throw error
      } else if (error.code === 'CALL_EXCEPTION') {
        throw new Error('Transaction failed during simulation. This could be due to: insufficient PDX balance, contract paused, or invalid parameters. Please check your PDX balance and try again.')
      } else if (error.message?.includes('user rejected')) {
        throw new Error('Transaction was rejected by user')
      } else {
        throw new Error(error.reason || error.message || 'Failed to create market')
      }
    } finally {
      setIsLoading(false)
    }
  }, [walletClient, account, isConnected, isContractReady, marketContract, pdxTokenContract, getSigner])

  const buyYesWithPDX = useCallback(async (
    marketId: number,
    minTokensOut: string,
    pdxAmount: string
  ) => {
    if (!walletClient || !isConnected || !marketContract || !pdxTokenContract || !account) {
      throw new Error('Wallet not connected or wrong network')
    }

    const signer = await getSigner()
    if (!signer) throw new Error('Failed to get signer')

    const pdxWithSigner = (pdxTokenContract as ethers.Contract).connect(signer) as ethers.Contract
    const marketWithSigner = (marketContract as ethers.Contract).connect(signer) as ethers.Contract

    const pdxAmountWei = ethers.parseEther(pdxAmount)
    const minOutWei = ethers.parseEther(minTokensOut)

    const approveTx = await (pdxWithSigner as any).approve(PDX_PREDICTION_MARKET_ADDRESS, pdxAmountWei)
    await approveTx.wait()
    console.log('✅ PDX approved for buy YES')

    const tx = await (marketWithSigner as any).buyYesWithPDXFor(
      BigInt(marketId),
      account,
      minOutWei,
      pdxAmountWei
    )

    return await tx.wait()
  }, [walletClient, isConnected, marketContract, pdxTokenContract, account, getSigner])

  const buyNoWithPDX = useCallback(async (
    marketId: number,
    minTokensOut: string,
    pdxAmount: string
  ) => {
    if (!walletClient || !isConnected || !marketContract || !pdxTokenContract || !account) {
      throw new Error('Wallet not connected or wrong network')
    }

    const signer = await getSigner()
    if (!signer) throw new Error('Failed to get signer')

    const pdxWithSigner = (pdxTokenContract as ethers.Contract).connect(signer) as ethers.Contract
    const marketWithSigner = (marketContract as ethers.Contract).connect(signer) as ethers.Contract

    const pdxAmountWei = ethers.parseEther(pdxAmount)
    const minOutWei = ethers.parseEther(minTokensOut)

    const approveTx = await (pdxWithSigner as any).approve(PDX_PREDICTION_MARKET_ADDRESS, pdxAmountWei)
    await approveTx.wait()
    console.log('✅ PDX approved for buy NO')

    const tx = await (marketWithSigner as any).buyNoWithPDXFor(
      BigInt(marketId),
      account,
      minOutWei,
      pdxAmountWei
    )

    return await tx.wait()
  }, [walletClient, isConnected, marketContract, pdxTokenContract, account, getSigner])

  const sellYesForPDX = useCallback(async (
    marketId: number,
    tokenAmount: string,
    minPDXOut: string
  ) => {
    if (!walletClient || !isConnected || !marketContract || !account) throw new Error('Wallet not connected')

    const signer = await getSigner()
    if (!signer) throw new Error('Failed to get signer')

    const marketWithSigner = (marketContract as ethers.Contract).connect(signer) as ethers.Contract

    const tokenAmountWei = ethers.parseEther(tokenAmount)
    const minPDXOutWei = ethers.parseEther(minPDXOut)

    const tx = await (marketWithSigner as any).sellYesForPDX(
      BigInt(marketId),
      tokenAmountWei,
      minPDXOutWei
    )

    return await tx.wait()
  }, [walletClient, isConnected, marketContract, account, getSigner])

  const sellNoForPDX = useCallback(async (
    marketId: number,
    tokenAmount: string,
    minPDXOut: string
  ) => {
    if (!walletClient || !isConnected || !marketContract || !account) throw new Error('Wallet not connected')

    const signer = await getSigner()
    if (!signer) throw new Error('Failed to get signer')

    const marketWithSigner = (marketContract as ethers.Contract).connect(signer) as ethers.Contract

    const tokenAmountWei = ethers.parseEther(tokenAmount)
    const minPDXOutWei = ethers.parseEther(minPDXOut)

    const tx = await (marketWithSigner as any).sellNoForPDX(
      BigInt(marketId),
      tokenAmountWei,
      minPDXOutWei
    )

    return await tx.wait()
  }, [walletClient, isConnected, marketContract, account, getSigner])

  // ==================== RESOLUTION ====================

  const requestResolution = useCallback(async (marketId: number, reason: string) => {
    if (!walletClient || !isConnected || !marketContract || !account) {
      throw new Error('Wallet not connected')
    }

    const signer = await getSigner()
    if (!signer) throw new Error('Failed to get signer')

    const marketWithSigner = (marketContract as ethers.Contract).connect(signer) as ethers.Contract
    const tx = await (marketWithSigner as any).requestResolution(BigInt(marketId), reason)
    return await tx.wait()
  }, [walletClient, isConnected, marketContract, account, getSigner])

  const claimPDXRedemption = useCallback(async (marketId: number) => {
    if (!walletClient || !isConnected || !marketContract || !account) {
      throw new Error('Wallet not connected')
    }

    const signer = await getSigner()
    if (!signer) throw new Error('Failed to get signer')

    const marketWithSigner = (marketContract as ethers.Contract).connect(signer) as ethers.Contract
    const tx = await (marketWithSigner as any).claimRedemption(BigInt(marketId))
    return await tx.wait()
  }, [walletClient, isConnected, marketContract, account, getSigner])

  const canRequestResolution = useCallback(async (marketId: number): Promise<boolean> => {
    if (!helperContract) return false

    try {
      return await (helperContract as any).canRequestResolution(BigInt(marketId))
    } catch (error) {
      console.error('❌ Error checking resolution:', error)
      return false
    }
  }, [helperContract])

  // Helper function to check PDX balance
  const checkPDXBalance = useCallback(async (requiredAmount: string): Promise<{ hasBalance: boolean, currentBalance: string, required: string }> => {
    if (!account || !pdxTokenContract) {
      return { hasBalance: false, currentBalance: '0', required: requiredAmount }
    }

    try {
      const provider = getProvider()
      if (!provider) throw new Error('Provider not available')

      const pdxInstance = new ethers.Contract(PDX_TOKEN_ADDRESS, ERC20_ABI, provider)
      const balance = await (pdxInstance as any).balanceOf(account)
      const balanceFormatted = ethers.formatEther(balance)
      const requiredWei = ethers.parseEther(requiredAmount)

      return {
        hasBalance: balance >= requiredWei,
        currentBalance: balanceFormatted,
        required: requiredAmount
      }
    } catch (error) {
      console.error('❌ Error checking PDX balance:', error)
      return { hasBalance: false, currentBalance: '0', required: requiredAmount }
    }
  }, [account, pdxTokenContract, getProvider])

  return {
    // Market management
    createMarketWithPDX,
    getPDXMarket,
    getPDXMarkets,
    getAllPDXMarkets,
    getUserPositions,
    getPDXMarketIds,

    // Trading
    buyYesWithPDX,
    buyNoWithPDX,
    sellYesForPDX,
    sellNoForPDX,

    // Estimation
    getBuyYesMultiplier,
    getBuyNoMultiplier,
    getCurrentMultipliers,
    getSellEstimatePDX,

    // Resolution
    requestResolution,
    claimPDXRedemption,
    canRequestResolution,

    // View
    getUserInvestment,
    checkPDXBalance,

    // State
    isLoading,
    marketContract,
    helperContract,
    pdxTokenContract,
    marketAddress: PDX_PREDICTION_MARKET_ADDRESS,
    helperAddress: PDX_HELPER_ADDRESS,
    pdxTokenAddress: PDX_TOKEN_ADDRESS,
    isContractReady,

    // Constants
    MarketStatus,
    Outcome,
  }
}