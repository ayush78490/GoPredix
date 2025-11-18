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
  paymentToken?: "BNB" | "PDX"
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
        
        if (network.chainId !== BigInt(97)) {
          console.warn("⚠️ Not on BSC Testnet. Current chain:", network.chainId)
          setAdapterContract(null)
          setViewsContract(null)
          setResolutionContract(null)
          setPdxTokenContract(null)
          setIsContractReady(false)
          return
        }

        const adapterContractInstance = new ethers.Contract(
          DUAL_TOKEN_ADAPTER_ADDRESS,
          DUAL_TOKEN_ADAPTER_ABI,
          provider
        )

        const viewsContractInstance = new ethers.Contract(
          VIEWS_ADAPTER_ADDRESS,
          VIEWS_ADAPTER_ABI,
          provider
        )

        const resolutionContractInstance = new ethers.Contract(
          RESOLUTION_ADDRESS,
          RESOLUTION_ABI,
          provider
        )

        const pdxTokenInstance = new ethers.Contract(
          PDX_TOKEN_ADDRESS,
          ERC20_ABI,
          provider
        )
        
        try {
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

  // ==================== ✅ FIXED: USER INVESTMENT (READ FROM MAIN ADAPTER) ====================

  const getUserInvestment = useCallback(async (marketId: number, userAddress: string): Promise<UserInvestment> => {
    if (!adapterContract) throw new Error('Adapter contract not available')
    
    try {
      // ✅ Read directly from pdxUserInvestments mapping in main adapter
      const investment = await (adapterContract as any).pdxUserInvestments(BigInt(marketId), userAddress)
      
      return {
        totalInvested: ethers.formatEther(investment.totalInvested || BigInt(0)),
        yesBalance: ethers.formatEther(investment.yesBalance || BigInt(0)),
        noBalance: ethers.formatEther(investment.noBalance || BigInt(0))
      }
    } catch (error) {
      console.error('❌ Error fetching user investment:', error)
      return {
        totalInvested: "0",
        yesBalance: "0",
        noBalance: "0"
      }
    }
  }, [adapterContract])

  // ==================== RESOLUTION FUNCTIONS ====================

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

  // ==================== ✅ FIXED: GET PDX MARKET (READ FROM MAIN ADAPTER) ====================

  const getPDXMarket = useCallback(async (marketId: number): Promise<PDXMarket> => {
    if (!adapterContract) throw new Error('Adapter contract not available')

    try {
      // ✅ Read directly from pdxMarkets mapping in main adapter
      const marketData = await (adapterContract as any).pdxMarkets(BigInt(marketId))
      
      if (!marketData || !marketData.creator || marketData.creator === "0x0000000000000000000000000000000000000000") {
        throw new Error(`PDX Market ${marketId} not found`)
      }

      let question = marketData.question || `PDX Market ${marketId}`
      if (typeof question === 'string' && question.startsWith('"') && question.endsWith('"')) {
        question = question.slice(1, -1)
      }

      // Calculate prices from pools
      const yesPoolNum = parseFloat(ethers.formatEther(marketData.yesPool))
      const noPoolNum = parseFloat(ethers.formatEther(marketData.noPool))
      const totalPool = yesPoolNum + noPoolNum

      let yesPrice = 50
      let noPrice = 50
      
      if (totalPool > 0) {
        yesPrice = (yesPoolNum / totalPool) * 100
        noPrice = (noPoolNum / totalPool) * 100
      }

      const market: PDXMarket = {
        id: marketId,
        creator: marketData.creator,
        question: question,
        category: marketData.category || "General",
        endTime: Number(marketData.endTime),
        status: Number(marketData.status),
        outcome: Number(marketData.outcome),
        yesToken: marketData.yesToken,
        noToken: marketData.noToken,
        yesPool: ethers.formatEther(marketData.yesPool),
        noPool: ethers.formatEther(marketData.noPool),
        totalBacking: ethers.formatEther(marketData.totalBacking),
        yesPrice: yesPrice,
        noPrice: noPrice,
        yesMultiplier: yesPrice > 0 ? 100 / yesPrice : 2,
        noMultiplier: noPrice > 0 ? 100 / noPrice : 2,
        paymentToken: "PDX"
      }

      return market

    } catch (error) {
      console.error('❌ Error fetching PDX market:', error)
      throw error
    }
  }, [adapterContract])

  // ==================== ✅ FIXED: USER POSITIONS (READ FROM MAIN ADAPTER) ====================

  const getPDXMarketIds = useCallback(async (): Promise<number[]> => {
    if (!adapterContract) throw new Error('Adapter contract not available')
    
    try {
      // ✅ Read nextPDXMarketId from main adapter
      const nextMarketId = await (adapterContract as any).nextPDXMarketId()
      const marketIds: number[] = []
      
      for (let i = 0; i < Number(nextMarketId); i++) {
        marketIds.push(i)
      }
      
      return marketIds
    } catch (error) {
      console.error('❌ Error fetching PDX market IDs:', error)
      return []
    }
  }, [adapterContract])

  const getUserPositions = useCallback(async (userAddress: string): Promise<any[]> => {
    if (!adapterContract) throw new Error('Adapter contract not available')

    try {
      const markets: any[] = []
      
      // ✅ Get all PDX markets from main adapter
      const nextId = await (adapterContract as any).nextPDXMarketId()
      const marketCount = Number(nextId)
      
      for (let marketId = 0; marketId < marketCount; marketId++) {
        try {
          // ✅ Read from pdxUserInvestments mapping
          const investment = await (adapterContract as any).pdxUserInvestments(marketId, userAddress)
          
          if (investment && investment.totalInvested > BigInt(0)) {
            const market = await getPDXMarket(marketId)
            
            markets.push({
              marketId,
              market,
              yesBalance: ethers.formatEther(investment.yesBalance || BigInt(0)),
              noBalance: ethers.formatEther(investment.noBalance || BigInt(0)),
              bnbInvested: ethers.formatEther(investment.totalInvested),  // Using totalInvested as bnbInvested for compatibility
              paymentToken: "PDX"
            })
          }
        } catch (error) {
          console.warn(`Error fetching PDX position for market ${marketId}:`, error)
        }
      }
      
      console.log(`✅ Found ${markets.length} PDX positions for ${userAddress}`)
      return markets
    } catch (error) {
      console.error('❌ Error fetching user PDX positions:', error)
      return []
    }
  }, [adapterContract, getPDXMarket])

  // ==================== ESTIMATION FUNCTIONS (Keep using views contract for calculations) ====================

  const getBuyYesMultiplier = useCallback(async (
    marketId: number,
    pdxAmount: string
  ): Promise<MultiplierInfo> => {
    if (!viewsContract) throw new Error('Views contract not available')
    
    try {
      const pdxAmountWei = ethers.parseEther(pdxAmount)
      const result = await (viewsContract as any).getBuyYesMultiplier(
        BigInt(marketId),
        pdxAmountWei
      )
      
      return {
        multiplier: Number(result[0]) / 10000,
        totalOut: ethers.formatEther(result[1]),
        totalFee: ethers.formatEther(result[2])
      }
    } catch (error) {
      console.error('❌ Error estimating YES purchase:', error)
      throw error
    }
  }, [viewsContract])

  const getBuyNoMultiplier = useCallback(async (
    marketId: number,
    pdxAmount: string
  ): Promise<MultiplierInfo> => {
    if (!viewsContract) throw new Error('Views contract not available')
    
    try {
      const pdxAmountWei = ethers.parseEther(pdxAmount)
      const result = await (viewsContract as any).getBuyNoMultiplier(
        BigInt(marketId),
        pdxAmountWei
      )
      
      return {
        multiplier: Number(result[0]) / 10000,
        totalOut: ethers.formatEther(result[1]),
        totalFee: ethers.formatEther(result[2])
      }
    } catch (error) {
      console.error('❌ Error estimating NO purchase:', error)
      throw error
    }
  }, [viewsContract])

  const getCurrentMultipliers = useCallback(async (marketId: number): Promise<TradingInfo> => {
    if (!viewsContract) throw new Error('Views contract not available')
    
    try {
      const result = await (viewsContract as any).getTradingInfo(BigInt(marketId))
      
      return {
        yesMultiplier: Number(result[0]) / 10000,
        noMultiplier: Number(result[1]) / 10000,
        yesPrice: Number(result[2]),
        noPrice: Number(result[3]),
        totalLiquidity: ethers.formatEther(result[4])
      }
    } catch (error) {
      console.error('❌ Error fetching current multipliers:', error)
      throw error
    }
  }, [viewsContract])

  const getSellEstimatePDX = useCallback(async (
    marketId: number,
    tokenAmount: string,
    isYes: boolean
  ): Promise<{ pdxOut: string; fee: string }> => {
    if (!viewsContract) throw new Error('Views contract not available')
    
    try {
      const tokenAmountWei = ethers.parseEther(tokenAmount)
      const result = await (viewsContract as any).getSellEstimate(
        BigInt(marketId),
        tokenAmountWei,
        isYes
      )
      
      return {
        pdxOut: ethers.formatEther(result[0]),
        fee: ethers.formatEther(result[1])
      }
    } catch (error) {
      console.error('❌ Error estimating PDX sell:', error)
      return {
        pdxOut: (parseFloat(tokenAmount) * 0.95).toFixed(6),
        fee: (parseFloat(tokenAmount) * 0.01).toFixed(6)
      }
    }
  }, [viewsContract])

  // ==================== TRADING FUNCTIONS (PDX ONLY) ====================

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

      const approveTx = await pdxWithSigner.approve(DUAL_TOKEN_ADAPTER_ADDRESS, totalValue)
      await approveTx.wait()
      console.log('✅ PDX approved for market creation')

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

      let marketId: number
      const marketCreatedTopic = ethers.id('MarketCreated(uint256,address,string)')
      const event = receipt.logs.find((log: any) => log.topics[0] === marketCreatedTopic)

      if (event) {
        const iface = new ethers.Interface(DUAL_TOKEN_ADAPTER_ABI)
        const decodedEvent = iface.parseLog(event)
        marketId = Number(decodedEvent?.args[0])
      } else {
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

  const buyYesWithPDX = useCallback(async (
    marketId: number,
    minTokensOut: string,
    pdxAmount: string
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
    minTokensOut: string,
    pdxAmount: string
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

  return {
    // Market management
    createMarketWithPDX,
    getPDXMarket,
    getUserPositions,
    getPDXMarketIds,
    
    // Trading functions (PDX ONLY)
    buyYesWithPDX,
    buyNoWithPDX,
    sellYesForPDX,
    sellNoForPDX,
    
    // Estimation functions
    getBuyYesMultiplier,
    getBuyNoMultiplier,
    getCurrentMultipliers,
    getSellEstimatePDX,
    
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
