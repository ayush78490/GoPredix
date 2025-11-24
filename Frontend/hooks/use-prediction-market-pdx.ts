import { useState, useCallback, useEffect } from 'react'
import { ethers } from 'ethers'
import { useAccount, useWalletClient, usePublicClient } from 'wagmi'
import PDX_PREDICTION_MARKET_ABI from '../contracts/pdxabi.json'
import PDX_HELPER_ABI from '../contracts/pdxhelperabi.json'
import ERC20_ABI from '../contracts/erc20ABI.json'

// Contract addresses
const PDX_PREDICTION_MARKET_ADDRESS = process.env.NEXT_PUBLIC_PDX_MARKET_ADDRESS || '0x7d46139e1513571f19c9B87cE9A01D21cA9ef665'
const PDX_HELPER_ADDRESS = process.env.NEXT_PUBLIC_PDX_HELPER_ADDRESS || '0x0CCaDd82A453075B8C0193809cC3693ef58E46D1'
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

      let yesPriceDecimal = 0.5
      let noPriceDecimal = 0.5

      if (totalPool > 0) {
        yesPriceDecimal = yesPoolNum / totalPool
        noPriceDecimal = noPoolNum / totalPool
      }

      // Now return prices in cents (0–100) for UI, but use decimal for multiplier
      const yesPrice = yesPriceDecimal * 100
      const noPrice = noPriceDecimal * 100

      // CORRECT multiplier: 1 / decimal_price
      const yesMultiplier = yesPriceDecimal > 0 ? 1 / yesPriceDecimal : 2
      const noMultiplier = noPriceDecimal > 0 ? 1 / noPriceDecimal : 2

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
      // ✅ FIXED: Swap - call getBuyNoOutput to get YES multiplier
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
      // ✅ FIXED: Swap - call getBuyYesOutput to get NO multiplier
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
      console.error('❌ Error estimating NO purchase:', error)
      throw error
    }
  }, [marketContract])

  const getCurrentMultipliers = useCallback(async (marketId: number): Promise<TradingInfo> => {
    if (!marketContract) throw new Error('Market contract not available')

    try {
      const result = await (marketContract as any).getCurrentMultipliers(BigInt(marketId))

      // result[0] = yesMultiplier from contract (scaled by 1_000_000)
      // result[1] = noMultiplier from contract (scaled by 1_000_000)
      // result[2] = yesPrice in basis points (e.g., 7800 = 78.00%)
      // result[3] = noPrice in basis points (e.g., 2200 = 22.00%)

      const yesPriceInCents = Number(result[2]) / 100  // Convert basis points to percentage (0-100)
      const noPriceInCents = Number(result[3]) / 100   // e.g., 7800 → 78

      const yesPriceDecimal = yesPriceInCents / 100     // 0.78
      const noPriceDecimal = noPriceInCents / 100       // 0.22

      return {
        yesMultiplier: yesPriceDecimal > 0 ? 1 / yesPriceDecimal : 2,
        noMultiplier: noPriceDecimal > 0 ? 1 / noPriceDecimal : 2,
        yesPrice: yesPriceInCents,        // keep as 78 for UI (78%)
        noPrice: noPriceInCents,          // keep as 22 for UI (22%)
        totalLiquidity: "0"
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
      endTimeReadable: new Date(params.endTime * 1000).toLocaleString(),
      initialYes: params.initialYes,
      initialNo: params.initialNo,
      totalPDX: ethers.formatEther(totalValue)
    })

    // Validate parameters before proceeding
    const now = Math.floor(Date.now() / 1000)
    if (params.endTime <= now) {
      throw new Error(`Invalid end time: ${params.endTime}. Must be in the future (current: ${now})`)
    }

    if (params.question.length > 200) {
      throw new Error('Question too long (max 200 characters)')
    }

    // Check PDX balance
    console.log('💰 Checking PDX balance...')
    const balance = await (pdxWithSigner as any).balanceOf(account)
    const balanceFormatted = ethers.formatEther(balance)
    console.log(`Balance: ${balanceFormatted} PDX, Required: ${ethers.formatEther(totalValue)} PDX`)

    if (balance < totalValue) {
      throw new Error(
        `Insufficient PDX balance.\n` +
        `Required: ${ethers.formatEther(totalValue)} PDX\n` +
        `Available: ${balanceFormatted} PDX\n` +
        `Shortage: ${ethers.formatEther(totalValue - balance)} PDX`
      )
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
        try {
          const resetTx = await (pdxWithSigner as any).approve(PDX_PREDICTION_MARKET_ADDRESS, BigInt(0))
          const resetReceipt = await resetTx.wait()
          console.log('✅ Allowance reset:', resetReceipt.hash)
        } catch (resetError: any) {
          console.warn('⚠️ Reset allowance failed (may not be required):', resetError.message)
          // Continue anyway, some tokens don't require reset
        }
      }

      const approveTx = await (pdxWithSigner as any).approve(PDX_PREDICTION_MARKET_ADDRESS, totalValue)
      console.log('⏳ Approval transaction sent:', approveTx.hash)
      const approvalReceipt = await approveTx.wait()
      console.log('✅ PDX approved for market creation. Gas used:', approvalReceipt.gasUsed.toString())
    } else {
      console.log('✅ Sufficient allowance already exists')
    }

    // Verify approval was successful
    const newAllowance = await (pdxWithSigner as any).allowance(account, PDX_PREDICTION_MARKET_ADDRESS)
    console.log(`Verified allowance: ${ethers.formatEther(newAllowance)} PDX`)

    if (newAllowance < totalValue) {
      throw new Error(
        `Approval verification failed.\n` +
        `Expected: ${ethers.formatEther(totalValue)} PDX\n` +
        `Actual: ${ethers.formatEther(newAllowance)} PDX\n` +
        `Please try again or contact support.`
      )
    }

    // Check if contract is paused (if the contract has this function)
    try {
      const isPaused = await (marketWithSigner as any).paused?.()
      if (isPaused) {
        throw new Error('Market contract is currently paused. Please try again later.')
      }
      console.log('✅ Contract is not paused')
    } catch (pauseError: any) {
      // Contract doesn't have paused() function - skip check
      console.log('ℹ️ Contract does not have paused() function - skipping pause check')
      // Continue without throwing
    }

    // Estimate gas before sending transaction
    console.log('⛽ Estimating gas for market creation...')
    let gasEstimate
    try {
      gasEstimate = await (marketWithSigner as any).createMarket.estimateGas(
        params.question,
        validation.category || params.category || 'General',
        BigInt(params.endTime),
        initialYesWei,
        initialNoWei
      )
      console.log(`Gas estimate: ${gasEstimate.toString()}`)
    } catch (estimateError: any) {
      console.error('❌ Gas estimation failed:', estimateError)
      
      // Provide specific error messages based on the error
      if (estimateError.message?.includes('insufficient')) {
        throw new Error('Insufficient funds for transaction or PDX balance too low')
      }
      if (estimateError.message?.includes('paused')) {
        throw new Error('Contract is paused')
      }
      if (estimateError.message?.includes('MIN_LIQUIDITY')) {
        throw new Error('Initial liquidity too low. Please increase the amounts.')
      }
      if (estimateError.data) {
        // Try to decode the error
        try {
          const decodedError = marketWithSigner.interface.parseError(estimateError.data)
          throw new Error(`Contract error: ${decodedError?.name || 'Unknown error'}`)
        } catch {
          // Could not decode
        }
      }
      
      throw new Error(
        `Transaction validation failed. Possible reasons:\n` +
        `- Minimum liquidity requirement not met (try higher amounts)\n` +
        `- Invalid resolution time (must be in future)\n` +
        `- Contract restrictions or paused state\n` +
        `- Network congestion\n\n` +
        `Technical details: ${estimateError.message || estimateError.reason || 'Unknown error'}`
      )
    }

    console.log('🚀 Creating market...')
    
    // Add gas buffer to estimate (30% extra)
    const gasLimit = (gasEstimate * BigInt(130)) / BigInt(100)
    console.log(`Using gas limit: ${gasLimit.toString()} (estimate + 30% buffer)`)

    const tx = await (marketWithSigner as any).createMarket(
      params.question,
      validation.category || params.category || 'General',
      BigInt(params.endTime),
      initialYesWei,
      initialNoWei,
      { gasLimit } // Add explicit gas limit
    )

    console.log('⏳ Transaction sent:', tx.hash)
    console.log('Waiting for confirmation...')
    const receipt = await tx.wait()

    if (!receipt) {
      throw new Error('Transaction failed - no receipt returned')
    }

    if (receipt.status === 0) {
      throw new Error('Transaction reverted on-chain')
    }

    console.log(`✅ Transaction confirmed in block ${receipt.blockNumber}`)
    console.log(`Gas used: ${receipt.gasUsed.toString()}`)

    // Get the new market ID
    const nextId = await (marketWithSigner as any).nextMarketId()
    const marketId = Number(nextId) - 1

    console.log(`✅ Market created successfully with ID: ${marketId}`)
    
    // Verify the market was created
    try {
      const createdMarket = await getPDXMarket(marketId)
      console.log('✅ Market verified:', {
        id: createdMarket.id,
        question: createdMarket.question,
        category: createdMarket.category
      })
    } catch (verifyError) {
      console.warn('⚠️ Could not verify market creation:', verifyError)
      // Don't throw - market was likely created successfully
    }

    return marketId

  } catch (error: any) {
    console.error('❌ Error creating market:', error)
    
    // Enhanced error messages with specific handling
    if (error.message?.includes('Insufficient PDX balance')) {
      throw error // Already well formatted
    } else if (error.message?.includes('Approval verification failed')) {
      throw error // Already well formatted
    } else if (error.message?.includes('Invalid end time')) {
      throw error // Already well formatted
    } else if (error.message?.includes('Question too long')) {
      throw error // Already well formatted
    } else if (error.message?.includes('paused')) {
      throw new Error('Market contract is currently paused. Please try again later.')
    } else if (error.code === 'ACTION_REJECTED' || error.message?.includes('user rejected')) {
      throw new Error('Transaction was cancelled by user')
    } else if (error.code === 'CALL_EXCEPTION') {
      throw new Error(
        'Transaction would fail on-chain. Common causes:\n' +
        '• Insufficient PDX balance or allowance\n' +
        '• Contract is paused\n' +
        '• Minimum liquidity not met (try 1 PDX or more for each side)\n' +
        '• Invalid parameters (check question length, end time)\n' +
        '• Network issues\n\n' +
        'Please check your PDX balance and try again with higher amounts.'
      )
    } else if (error.code === 'INSUFFICIENT_FUNDS') {
      throw new Error('Insufficient BNB for gas fees. Please add BNB to your wallet.')
    } else if (error.code === 'NETWORK_ERROR') {
      throw new Error('Network error. Please check your connection and try again.')
    } else if (error.code === 'TIMEOUT') {
      throw new Error('Transaction timed out. Please try again.')
    } else {
      throw new Error(
        error.reason || 
        error.message || 
        'Failed to create market. Please try again or contact support.'
      )
    }
  } finally {
    setIsLoading(false)
  }
}, [walletClient, account, isConnected, isContractReady, marketContract, pdxTokenContract, getSigner, getPDXMarket])

  // Debug helper function
  const debugMarketCreation = useCallback(async () => {
    if (!account || !pdxTokenContract || !marketContract) {
      console.error('❌ Debug failed: Not connected or contracts not ready')
      return
    }

    try {
      const provider = getProvider()
      if (!provider) throw new Error('Provider not available')

      const pdxInstance = new ethers.Contract(PDX_TOKEN_ADDRESS, ERC20_ABI, provider)
      const balance = await (pdxInstance as any).balanceOf(account)
      const allowance = await (pdxInstance as any).allowance(account, PDX_PREDICTION_MARKET_ADDRESS)
      const network = await provider.getNetwork()

      console.log('🔍 Debug Information:')
      console.log('━'.repeat(50))
      console.log('Wallet Address:', account)
      console.log('Network:', network.name, '(Chain ID:', network.chainId.toString(), ')')
      console.log('PDX Balance:', ethers.formatEther(balance), 'PDX')
      console.log('PDX Allowance:', ethers.formatEther(allowance), 'PDX')
      console.log('Market Contract:', PDX_PREDICTION_MARKET_ADDRESS)
      console.log('PDX Token:', PDX_TOKEN_ADDRESS)
      console.log('Helper Contract:', PDX_HELPER_ADDRESS)
      
      // Check contract status
      try {
        const nextMarketId = await (marketContract as any).nextMarketId()
        console.log('Total Markets:', Number(nextMarketId))
        
        const owner = await (marketContract as any).owner()
        console.log('Contract Owner:', owner)
      } catch (contractError) {
        console.error('❌ Contract check failed:', contractError)
      }

      // Check if paused
      try {
        const isPaused = await (marketContract as any).paused()
        console.log('Contract Paused:', isPaused ? 'YES ⚠️' : 'NO ✅')
      } catch {
        console.log('Contract Paused: Unknown (no paused() function)')
      }

      console.log('━'.repeat(50))
    } catch (error) {
      console.error('❌ Debug failed:', error)
    }
  }, [account, pdxTokenContract, marketContract, getProvider])
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

    // ✅ FIXED: Swap - call buyNoWithPDXFor to actually buy YES tokens
    const tx = await (marketWithSigner as any).buyNoWithPDXFor(
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

    // ✅ FIXED: Swap - call buyYesWithPDXFor to actually buy NO tokens
    const tx = await (marketWithSigner as any).buyYesWithPDXFor(
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