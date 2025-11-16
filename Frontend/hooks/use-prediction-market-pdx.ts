import { useState, useCallback, useEffect } from 'react'
import { ethers } from 'ethers'
import { useWeb3Context } from '@/lib/wallet-context'
import DUAL_TOKEN_ADAPTER_ABI from '../contracts/dualtokenadapterABI.json'
import VIEWS_ADAPTER_ABI from '../contracts/dualtokenadapterviewerABI.json'
import RESOLUTION_ABI from '../contracts/resolutionpdxABI.json'
import ERC20_ABI from '../contracts/erc20ABI.json'

// Contract addresses - PDX only (from your 3 contracts)
const DUAL_TOKEN_ADAPTER_ADDRESS = process.env.NEXT_PUBLIC_DUAL_TOKEN_ADAPTER_ADDRESS || '0xb356a469387EE9DE6d6BeceDa975Af7Df69b7e06'
const VIEWS_ADAPTER_ADDRESS = process.env.NEXT_PUBLIC_VIEWS_ADAPTER_ADDRESS || '0xfACd4d853d1CC37A624F5aB20De5C553371b1Da1'
const RESOLUTION_ADDRESS = process.env.NEXT_PUBLIC_RESOLUTION_ADDRESS || '0xF3943cA8bEa0E5c147C5E626d0a3A3164c5B889f'
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
  Undecided = 255,
  Yes = 1,
  No = 0
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

export interface ResolutionState {
  requested: boolean
  requestTime: number
  requester: string
  disputed: boolean
  disputeTime: number
  disputer: string
  resolved: boolean
  outcome: boolean
}

export interface Order {
  marketId: number
  user: string
  triggerPrice: number
  amount: string
  orderType: number
  isActive: boolean
}

// PDX Market Creation Validation
async function validatePDXMarketWithPerplexity(params: MarketCreationParams): Promise<{ valid: boolean, reason?: string, category?: string }> {
  try {
    const res = await fetch('https://sigma-predection.vercel.app/api/validate-market', {
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
  const { account, provider, signer, isCorrectNetwork } = useWeb3Context()
  const [isLoading, setIsLoading] = useState(false)
  const [adapterContract, setAdapterContract] = useState<ethers.Contract | null>(null)
  const [viewsContract, setViewsContract] = useState<ethers.Contract | null>(null)
  const [resolutionContract, setResolutionContract] = useState<ethers.Contract | null>(null)
  const [pdxTokenContract, setPdxTokenContract] = useState<ethers.Contract | null>(null)
  const [isContractReady, setIsContractReady] = useState(false)

  // Initialize contracts
  useEffect(() => {
    const initializeContracts = async () => {
      if (!provider) {
        setAdapterContract(null)
        setViewsContract(null)
        setResolutionContract(null)
        setPdxTokenContract(null)
        setIsContractReady(false)
        return
      }

      try {
        const network = await provider.getNetwork()
        
        // BSC Testnet chain ID is 97
        if (network.chainId !== BigInt(97)) {
          console.warn("⚠️ Not on BSC Testnet. Current chain:", network.chainId)
          setAdapterContract(null)
          setViewsContract(null)
          setResolutionContract(null)
          setPdxTokenContract(null)
          setIsContractReady(false)
          return
        }

        // Initialize Dual Token Adapter contract
        const adapterContractInstance = new ethers.Contract(
          DUAL_TOKEN_ADAPTER_ADDRESS,
          DUAL_TOKEN_ADAPTER_ABI,
          provider
        )

        // Initialize Views adapter contract
        const viewsContractInstance = new ethers.Contract(
          VIEWS_ADAPTER_ADDRESS,
          VIEWS_ADAPTER_ABI,
          provider
        )

        // Initialize Resolution contract
        const resolutionContractInstance = new ethers.Contract(
          RESOLUTION_ADDRESS,
          RESOLUTION_ABI,
          provider
        )

        // Initialize PDX token contract
        const pdxTokenInstance = new ethers.Contract(
          PDX_TOKEN_ADDRESS,
          ERC20_ABI,
          provider
        )
        
        try {
          // Test contracts
          const adapterOwner = await (adapterContractInstance as any).owner()
          console.log('✅ Dual Token Adapter contract connected. Owner:', adapterOwner)
          
          const verifyConnection = await (viewsContractInstance as any).verifyConnection()
          console.log('✅ Views adapter contract connected:', verifyConnection)
          
          const mainAdapterAddress = await (resolutionContractInstance as any).mainAdapter()
          console.log('✅ Resolution contract connected. Main adapter:', mainAdapterAddress)
          
          const pdxBalance = await (pdxTokenInstance as any).balanceOf(DUAL_TOKEN_ADAPTER_ADDRESS)
          console.log('✅ PDX token contract connected. Adapter balance:', ethers.formatEther(pdxBalance))
          
          setAdapterContract(adapterContractInstance)
          setViewsContract(viewsContractInstance)
          setResolutionContract(resolutionContractInstance)
          setPdxTokenContract(pdxTokenInstance)
          setIsContractReady(true)
        } catch (testError) {
          console.error('❌ PDX Contract initialization test failed:', testError)
          setAdapterContract(null)
          setViewsContract(null)
          setResolutionContract(null)
          setPdxTokenContract(null)
          setIsContractReady(false)
        }
        
      } catch (error) {
        console.error('❌ Error initializing PDX contracts:', error)
        setAdapterContract(null)
        setViewsContract(null)
        setResolutionContract(null)
        setPdxTokenContract(null)
        setIsContractReady(false)
      }
    }

    initializeContracts()
  }, [provider])

  // ==================== MARKET CREATION (PDX ONLY) ====================

  const createMarketWithPDX = useCallback(async (
    params: MarketCreationParams
  ): Promise<number> => {
    if (!signer || !account || !isCorrectNetwork) {
      throw new Error('Wallet not connected or wrong network')
    }
    if (!isContractReady || !adapterContract || !pdxTokenContract) {
      throw new Error('PDX Contract not ready - please ensure you\'re on BSC Testnet')
    }

    setIsLoading(true)
    try {
      const validation = await validatePDXMarketWithPerplexity(params)
      if (!validation.valid) {
        throw new Error(validation.reason || 'Market question did not pass AI validation')
      }

      const adapterWithSigner = new ethers.Contract(
        DUAL_TOKEN_ADAPTER_ADDRESS,
        DUAL_TOKEN_ADAPTER_ABI,
        signer
      )

      const pdxWithSigner = new ethers.Contract(
        PDX_TOKEN_ADDRESS,
        ERC20_ABI,
        signer
      )

      const initialYesWei = ethers.parseEther(params.initialYes)
      const initialNoWei = ethers.parseEther(params.initialNo)
      const totalValue = initialYesWei + initialNoWei

    // Approve PDX tokens
    const approveTx = await pdxWithSigner.approve(DUAL_TOKEN_ADAPTER_ADDRESS, totalValue)
    await approveTx.wait()
    console.log('✅ PDX approved for market creation')

    // Create market with PDX
    const tx = await (adapterWithSigner as any).createMarketWithPDX(
      params.question,
      validation.category || params.category || 'General',
      BigInt(params.endTime),
      initialYesWei,
      initialNoWei
    )
    console.log('📝 Creating PDX market with initial YES:', params.initialYes, 'NO:', params.initialNo)
    
    console.log('⏳ Waiting for market creation transaction:', tx.hash)
    const receipt = await tx.wait()
    
    if (!receipt) {
      throw new Error('Transaction failed - no receipt returned')
    }

    // Step 4: Get market ID from event
    let marketId: number
    const marketCreatedTopic = ethers.id('MarketCreated(uint256,address,string)')
    const event = receipt.logs.find((log: any) => log.topics[0] === marketCreatedTopic)

    if (event) {
      const iface = new ethers.Interface(DUAL_TOKEN_ADAPTER_ABI)
      const decodedEvent = iface.parseLog(event)
      marketId = Number(decodedEvent?.args[0])
    } else {
      // Fallback: get from nextPDXMarketId
      const nextId = await (adapterWithSigner as any).nextPDXMarketId()
      marketId = Number(nextId) - 1
    }

    console.log(`✅ PDX Market created with ID: ${marketId}`)
    return marketId

  } catch (error: any) {
    console.error('❌ Error creating PDX market:', error)
    throw new Error(error.reason || error.message || 'Failed to create PDX market')
  } finally {
    setIsLoading(false)
  }
}, [signer, account, isCorrectNetwork, isContractReady, adapterContract, pdxTokenContract])

  // ==================== MARKET DATA FETCHING ====================

  const getPDXMarket = useCallback(async (marketId: number): Promise<PDXMarket> => {
    if (!adapterContract || !viewsContract) throw new Error('PDX Contracts not available')

    try {
      const marketData = await (adapterContract as any).pdxMarkets(BigInt(marketId))
      
      let question = marketData.question || `PDX Market ${marketId}`
      if (typeof question === 'string' && question.startsWith('"') && question.endsWith('"')) {
        question = question.slice(1, -1)
      }

      // Get enhanced trading info from views contract
      const tradingInfo = await (viewsContract as any).getTradingInfo(BigInt(marketId))
      
      const market: PDXMarket = {
        id: marketId,
        creator: marketData.creator,
        question: question,
        category: marketData.category || "General",
        endTime: Number(marketData.endTime),
        status: marketData.status || MarketStatus.Open,
        outcome: marketData.outcome,
        yesToken: marketData.yesToken,
        noToken: marketData.noToken,
        yesPool: ethers.formatEther(marketData.yesPool),
        noPool: ethers.formatEther(marketData.noPool),
        totalBacking: ethers.formatEther(marketData.totalBacking),
        yesPrice: Number(tradingInfo[2]) / 100,
        noPrice: Number(tradingInfo[3]) / 100,
        yesMultiplier: Number(tradingInfo[0]) / 10000,
        noMultiplier: Number(tradingInfo[1]) / 10000
      }

      return market

    } catch (error) {
      console.error('❌ Error fetching PDX market:', error)
      throw error
    }
  }, [adapterContract, viewsContract])

  // ==================== TRADING FUNCTIONS (PDX ONLY) ====================

  const buyYesWithPDX = useCallback(async (
    marketId: number,
    pdxAmount: string,
    minTokensOut: string
  ) => {
    if (!signer || !isCorrectNetwork || !adapterContract || !pdxTokenContract) {
      throw new Error('Wallet not connected or wrong network')
    }
    
    const pdxWithSigner = new ethers.Contract(
      PDX_TOKEN_ADDRESS,
      ERC20_ABI,
      signer
    )

    const adapterWithSigner = new ethers.Contract(
      DUAL_TOKEN_ADAPTER_ADDRESS,
      DUAL_TOKEN_ADAPTER_ABI,
      signer
    )
    
    const pdxAmountWei = ethers.parseEther(pdxAmount)
    const minOutWei = ethers.parseEther(minTokensOut)
    
    // Approve PDX
    const approveTx = await pdxWithSigner.approve(DUAL_TOKEN_ADAPTER_ADDRESS, pdxAmountWei)
    await approveTx.wait()
    console.log('✅ PDX approved for buy YES')
    
    const tx = await (adapterWithSigner as any).buyYesWithPDX(
      BigInt(marketId),
      account,
      minOutWei,
      pdxAmountWei
    )
    
    return await tx.wait()
  }, [signer, isCorrectNetwork, adapterContract, pdxTokenContract, account])

  const buyNoWithPDX = useCallback(async (
    marketId: number,
    pdxAmount: string,
    minTokensOut: string
  ) => {
    if (!signer || !isCorrectNetwork || !adapterContract || !pdxTokenContract) {
      throw new Error('Wallet not connected or wrong network')
    }
    
    const pdxWithSigner = new ethers.Contract(
      PDX_TOKEN_ADDRESS,
      ERC20_ABI,
      signer
    )

    const adapterWithSigner = new ethers.Contract(
      DUAL_TOKEN_ADAPTER_ADDRESS,
      DUAL_TOKEN_ADAPTER_ABI,
      signer
    )
    
    const pdxAmountWei = ethers.parseEther(pdxAmount)
    const minOutWei = ethers.parseEther(minTokensOut)
    
    // Approve PDX
    const approveTx = await pdxWithSigner.approve(DUAL_TOKEN_ADAPTER_ADDRESS, pdxAmountWei)
    await approveTx.wait()
    console.log('✅ PDX approved for buy NO')
    
    const tx = await (adapterWithSigner as any).buyNoWithPDX(
      BigInt(marketId),
      account,
      minOutWei,
      pdxAmountWei
    )
    
    return await tx.wait()
  }, [signer, isCorrectNetwork, adapterContract, pdxTokenContract, account])

  const sellYesForPDX = useCallback(async (
    marketId: number,
    tokenAmount: string,
    minPDXOut: string
  ) => {
    if (!signer || !isCorrectNetwork || !adapterContract) throw new Error('Wallet not connected or wrong network')
    
    const adapterWithSigner = new ethers.Contract(
      DUAL_TOKEN_ADAPTER_ADDRESS,
      DUAL_TOKEN_ADAPTER_ABI,
      signer
    )
    
    const tokenAmountWei = ethers.parseEther(tokenAmount)
    const minPDXOutWei = ethers.parseEther(minPDXOut)
    
    const tx = await (adapterWithSigner as any).sellYesForPDX(
      BigInt(marketId),
      tokenAmountWei,
      minPDXOutWei
    )
    
    return await tx.wait()
  }, [signer, isCorrectNetwork, adapterContract])

  const sellNoForPDX = useCallback(async (
    marketId: number,
    tokenAmount: string,
    minPDXOut: string
  ) => {
    if (!signer || !isCorrectNetwork || !adapterContract) throw new Error('Wallet not connected or wrong network')
    
    const adapterWithSigner = new ethers.Contract(
      DUAL_TOKEN_ADAPTER_ADDRESS,
      DUAL_TOKEN_ADAPTER_ABI,
      signer
    )
    
    const tokenAmountWei = ethers.parseEther(tokenAmount)
    const minPDXOutWei = ethers.parseEther(minPDXOut)
    
    const tx = await (adapterWithSigner as any).sellNoForPDX(
      BigInt(marketId),
      tokenAmountWei,
      minPDXOutWei
    )
    
    return await tx.wait()
  }, [signer, isCorrectNetwork, adapterContract])

  // ==================== LIQUIDITY FUNCTIONS ====================

  const addPDXLiquidity = useCallback(async (
    marketId: number,
    yesAmount: string,
    noAmount: string
  ) => {
    if (!signer || !isCorrectNetwork || !adapterContract || !pdxTokenContract) {
      throw new Error('Wallet not connected or wrong network')
    }
    
    const pdxWithSigner = new ethers.Contract(
      PDX_TOKEN_ADDRESS,
      ERC20_ABI,
      signer
    )

    const adapterWithSigner = new ethers.Contract(
      DUAL_TOKEN_ADAPTER_ADDRESS,
      DUAL_TOKEN_ADAPTER_ABI,
      signer
    )
    
    const yesAmountWei = ethers.parseEther(yesAmount)
    const noAmountWei = ethers.parseEther(noAmount)
    const totalAmount = yesAmountWei + noAmountWei
    
    // Approve PDX
    const approveTx = await pdxWithSigner.approve(DUAL_TOKEN_ADAPTER_ADDRESS, totalAmount)
    await approveTx.wait()
    console.log('✅ PDX approved for liquidity')
    
    const tx = await (adapterWithSigner as any).addPDXLiquidity(
      BigInt(marketId),
      yesAmountWei,
      noAmountWei
    )
    
    return await tx.wait()
  }, [signer, isCorrectNetwork, adapterContract, pdxTokenContract])

  const removePDXLiquidity = useCallback(async (
    marketId: number,
    lpAmount: string
  ) => {
    if (!signer || !isCorrectNetwork || !adapterContract) throw new Error('Wallet not connected or wrong network')
    
    const adapterWithSigner = new ethers.Contract(
      DUAL_TOKEN_ADAPTER_ADDRESS,
      DUAL_TOKEN_ADAPTER_ABI,
      signer
    )
    
    const lpAmountWei = ethers.parseEther(lpAmount)
    
    const tx = await (adapterWithSigner as any).removePDXLiquidity(
      BigInt(marketId),
      lpAmountWei
    )
    
    return await tx.wait()
  }, [signer, isCorrectNetwork, adapterContract])

  // ==================== ORDER MANAGEMENT ====================

  const createStopLossOrder = useCallback(async (
    marketId: number,
    triggerPrice: number,
    amount: string
  ) => {
    if (!signer || !isCorrectNetwork || !adapterContract) {
      throw new Error('Wallet not connected or wrong network')
    }
    
    const adapterWithSigner = new ethers.Contract(
      DUAL_TOKEN_ADAPTER_ADDRESS,
      DUAL_TOKEN_ADAPTER_ABI,
      signer
    )
    
    const amountWei = ethers.parseEther(amount)
    
    const tx = await (adapterWithSigner as any).createStopLossOrder(
      BigInt(marketId),
      triggerPrice,
      amountWei
    )
    
    return await tx.wait()
  }, [signer, isCorrectNetwork, adapterContract])

  const createTakeProfitOrder = useCallback(async (
    marketId: number,
    triggerPrice: number,
    amount: string
  ) => {
    if (!signer || !isCorrectNetwork || !adapterContract) {
      throw new Error('Wallet not connected or wrong network')
    }
    
    const adapterWithSigner = new ethers.Contract(
      DUAL_TOKEN_ADAPTER_ADDRESS,
      DUAL_TOKEN_ADAPTER_ABI,
      signer
    )
    
    const amountWei = ethers.parseEther(amount)
    
    const tx = await (adapterWithSigner as any).createTakeProfitOrder(
      BigInt(marketId),
      triggerPrice,
      amountWei
    )
    
    return await tx.wait()
  }, [signer, isCorrectNetwork, adapterContract])

  const executeOrder = useCallback(async (orderId: number) => {
    if (!signer || !isCorrectNetwork || !adapterContract) {
      throw new Error('Wallet not connected or wrong network')
    }
    
    const adapterWithSigner = new ethers.Contract(
      DUAL_TOKEN_ADAPTER_ADDRESS,
      DUAL_TOKEN_ADAPTER_ABI,
      signer
    )
    
    const tx = await (adapterWithSigner as any).executeOrder(BigInt(orderId))
    return await tx.wait()
  }, [signer, isCorrectNetwork, adapterContract])

  const cancelOrder = useCallback(async (orderId: number) => {
    if (!signer || !isCorrectNetwork || !adapterContract) {
      throw new Error('Wallet not connected or wrong network')
    }
    
    const adapterWithSigner = new ethers.Contract(
      DUAL_TOKEN_ADAPTER_ADDRESS,
      DUAL_TOKEN_ADAPTER_ABI,
      signer
    )
    
    const tx = await (adapterWithSigner as any).cancelOrder(BigInt(orderId))
    return await tx.wait()
  }, [signer, isCorrectNetwork, adapterContract])

  const getUserOrders = useCallback(async (userAddress: string): Promise<number[]> => {
    if (!adapterContract) throw new Error('Adapter contract not available')
    
    try {
      const orderIds = await (adapterContract as any).getUserOrders(userAddress)
      return orderIds.map((id: bigint) => Number(id))
    } catch (error) {
      console.error('❌ Error fetching user orders:', error)
      return []
    }
  }, [adapterContract])

  const checkOrderTrigger = useCallback(async (orderId: number): Promise<boolean> => {
    if (!adapterContract) throw new Error('Adapter contract not available')
    
    try {
      return await (adapterContract as any).checkOrderTrigger(BigInt(orderId))
    } catch (error) {
      console.error('❌ Error checking order trigger:', error)
      return false
    }
  }, [adapterContract])

  // ==================== RESOLUTION FUNCTIONS ====================

  const requestResolution = useCallback(async (marketId: number) => {
    if (!signer || !isCorrectNetwork || !resolutionContract) {
      throw new Error('Wallet not connected or wrong network')
    }
    
    const resolutionWithSigner = new ethers.Contract(
      RESOLUTION_ADDRESS,
      RESOLUTION_ABI,
      signer
    )
    
    const tx = await (resolutionWithSigner as any).requestResolution(BigInt(marketId))
    return await tx.wait()
  }, [signer, isCorrectNetwork, resolutionContract])

  const resolveMarket = useCallback(async (marketId: number, outcome: boolean) => {
    if (!signer || !isCorrectNetwork || !resolutionContract) {
      throw new Error('Wallet not connected or wrong network')
    }
    
    const resolutionWithSigner = new ethers.Contract(
      RESOLUTION_ADDRESS,
      RESOLUTION_ABI,
      signer
    )
    
    const tx = await (resolutionWithSigner as any).resolveMarket(BigInt(marketId), outcome)
    return await tx.wait()
  }, [signer, isCorrectNetwork, resolutionContract])

  const disputeResolution = useCallback(async (marketId: number) => {
    if (!signer || !isCorrectNetwork || !resolutionContract) {
      throw new Error('Wallet not connected or wrong network')
    }
    
    const resolutionWithSigner = new ethers.Contract(
      RESOLUTION_ADDRESS,
      RESOLUTION_ABI,
      signer
    )
    
    const tx = await (resolutionWithSigner as any).disputeResolution(BigInt(marketId))
    return await tx.wait()
  }, [signer, isCorrectNetwork, resolutionContract])

  const claimPDXRedemption = useCallback(async (marketId: number) => {
    if (!signer || !isCorrectNetwork || !resolutionContract) {
      throw new Error('Wallet not connected or wrong network')
    }
    
    const resolutionWithSigner = new ethers.Contract(
      RESOLUTION_ADDRESS,
      RESOLUTION_ABI,
      signer
    )
    
    const tx = await (resolutionWithSigner as any).claimPDXRedemption(BigInt(marketId))
    return await tx.wait()
  }, [signer, isCorrectNetwork, resolutionContract])

  // ==================== VIEW FUNCTIONS ====================

  const getUserInvestment = useCallback(async (marketId: number, userAddress: string): Promise<UserInvestment> => {
    if (!viewsContract) throw new Error('Views contract not available')
    
    try {
      const investment = await (viewsContract as any).getMarketInvestment(BigInt(marketId), userAddress)
      return {
        totalInvested: ethers.formatEther(investment[0]),
        yesBalance: ethers.formatEther(investment[1]),
        noBalance: ethers.formatEther(investment[2])
      }
    } catch (error) {
      console.error('❌ Error fetching user investment:', error)
      throw error
    }
  }, [viewsContract])

  const getResolutionStatus = useCallback(async (marketId: number): Promise<ResolutionState> => {
    if (!resolutionContract) throw new Error('Resolution contract not available')
    
    try {
      const resolution = await (resolutionContract as any).getResolution(BigInt(marketId))
      return {
        requested: resolution[0],
        requestTime: Number(resolution[1]),
        requester: resolution[2],
        disputed: resolution[3],
        disputeTime: Number(resolution[4]),
        disputer: resolution[5],
        resolved: resolution[6],
        outcome: resolution[7]
      }
    } catch (error) {
      console.error('❌ Error fetching resolution status:', error)
      throw error
    }
  }, [resolutionContract])

  const canRequestResolution = useCallback(async (marketId: number): Promise<boolean> => {
    if (!resolutionContract) throw new Error('Resolution contract not available')
    
    try {
      return await (resolutionContract as any).canRequestResolution(BigInt(marketId))
    } catch (error) {
      console.error('❌ Error checking if can request resolution:', error)
      return false
    }
  }, [resolutionContract])

  const canDispute = useCallback(async (marketId: number): Promise<boolean> => {
    if (!resolutionContract) throw new Error('Resolution contract not available')
    
    try {
      return await (resolutionContract as any).canDispute(BigInt(marketId))
    } catch (error) {
      console.error('❌ Error checking if can dispute:', error)
      return false
    }
  }, [resolutionContract])

  const getResolutionStatusString = useCallback(async (marketId: number): Promise<string> => {
    if (!resolutionContract) throw new Error('Resolution contract not available')
    
    try {
      return await (resolutionContract as any).getResolutionStatus(BigInt(marketId))
    } catch (error) {
      console.error('❌ Error getting resolution status string:', error)
      return 'Unknown'
    }
  }, [resolutionContract])

  const getDisputeDeadline = useCallback(async (marketId: number): Promise<number> => {
    if (!resolutionContract) throw new Error('Resolution contract not available')
    
    try {
      const deadline = await (resolutionContract as any).getDisputeDeadline(BigInt(marketId))
      return Number(deadline)
    } catch (error) {
      console.error('❌ Error getting dispute deadline:', error)
      return 0
    }
  }, [resolutionContract])

  const getMarketOutcome = useCallback(async (marketId: number): Promise<boolean> => {
    if (!resolutionContract) throw new Error('Resolution contract not available')
    
    try {
      return await (resolutionContract as any).getMarketOutcome(BigInt(marketId))
    } catch (error) {
      console.error('❌ Error getting market outcome:', error)
      throw error
    }
  }, [resolutionContract])

  return {
    // Market management
    createMarketWithPDX,
    getPDXMarket,
    
    // Trading functions (PDX ONLY)
    buyYesWithPDX,
    buyNoWithPDX,
    sellYesForPDX,
    sellNoForPDX,
    
    // Liquidity management
    addPDXLiquidity,
    removePDXLiquidity,
    
    // Order management
    createStopLossOrder,
    createTakeProfitOrder,
    executeOrder,
    cancelOrder,
    getUserOrders,
    checkOrderTrigger,
    
    // Resolution & Redemption
    requestResolution,
    resolveMarket,
    disputeResolution,
    claimPDXRedemption,
    
    // View functions
    getUserInvestment,
    getResolutionStatus,
    canRequestResolution,
    canDispute,
    getResolutionStatusString,
    getDisputeDeadline,
    getMarketOutcome,
    
    // State
    isLoading,
    adapterContract,
    viewsContract,
    resolutionContract,
    pdxTokenContract,
    adapterAddress: DUAL_TOKEN_ADAPTER_ADDRESS,
    viewsAddress: VIEWS_ADAPTER_ADDRESS,
    resolutionAddress: RESOLUTION_ADDRESS,
    pdxTokenAddress: PDX_TOKEN_ADDRESS,
    isContractReady,
    
    // Constants
    MarketStatus,
    Outcome,
  }
}