// import { useState, useCallback, useEffect } from 'react'
// import { ethers } from 'ethers'
// import { useWeb3Context } from '@/lib/wallet-context'
// import PDX_PREDICTION_MARKET_ABI from '@/contracts/pdxtradingabi.json'
// import PDX_TOKEN_ARTIFACT from '@/contracts/GPXToken.json'

// // Extract ABI from artifact or use as-is if it's already the ABI
// const PDX_TOKEN_ABI = (PDX_TOKEN_ARTIFACT as any).abi || PDX_TOKEN_ARTIFACT

// // Contract addresses - Update these with your deployed addresses
// const PDX_PREDICTION_MARKET_ADDRESS = process.env.NEXT_PUBLIC_PDX_CONTRACT_ADDRESS || '0x1631b333056c95D01E3f67Bb76d58FC51c15e5F9'
// const PDX_TOKEN_ADDRESS = process.env.NEXT_PUBLIC_PDX_TOKEN_ADDRESS || '0xeE943aCCAa07ED556DfAc9d3a76015050fA78BC8'

// // Market Status enum matching the contract
// export enum MarketStatus {
//   Open = 0,
//   Closed = 1,
//   ResolutionRequested = 2,
//   Resolved = 3,
//   Disputed = 4
// }

// // Outcome enum matching the contract
// export enum Outcome {
//   Undecided = 0,
//   Yes = 1,
//   No = 2
// }

// // Market interface
// export interface PDXMarket {
//   id: number
//   creator: string
//   question: string
//   category: string
//   endTime: number
//   status: MarketStatus
//   outcome: Outcome
//   yesToken: string
//   noToken: string
//   yesPool: string
//   noPool: string
//   lpTotalSupply: string
//   totalBacking: string
//   platformFees: string
//   resolutionRequestedAt: number
//   disputeDeadline: number
//   resolutionReason: string
//   resolutionConfidence: number
//   yesPrice?: number
//   noPrice?: number
//   yesMultiplier?: number
//   noMultiplier?: number
// }

// export interface PDXMarketCreationParams {
//   question: string
//   category: string
//   endTime: number
//   initialYes: string
//   initialNo: string
//   pdxAmount: string
// }

// export interface PDXMultiplierInfo {
//   multiplier: number
//   totalOut: string
//   totalFee: string
// }

// export interface PDXUserPosition {
//   market: PDXMarket
//   yesBalance: string
//   noBalance: string
//   totalInvested: string
//   pdxInvested: string
// }

// export interface PDXOrderInfo {
//   orderId: number
//   user: string
//   marketId: number
//   isYes: boolean
//   tokenAmount: string
//   stopLossPrice: number
//   takeProfitPrice: number
//   isActive: boolean
//   createdAt: number
// }

// export function usePDXPredictionMarket() {
//   const { account, provider, signer, isCorrectNetwork } = useWeb3Context()
//   const [isLoading, setIsLoading] = useState(false)
//   const [contract, setContract] = useState<ethers.Contract | null>(null)
//   const [pdxToken, setPdxToken] = useState<ethers.Contract | null>(null)
//   const [isContractReady, setIsContractReady] = useState(false)
//   const [pdxBalance, setPdxBalance] = useState<string>('0')
//   const [pdxAllowance, setPdxAllowance] = useState<string>('0')

//   // Initialize contracts
//   useEffect(() => {
//     const initializeContracts = async () => {
//       if (!provider) {
//         setContract(null)
//         setPdxToken(null)
//         setIsContractReady(false)
//         return
//       }

//       try {
//         const network = await provider.getNetwork()
        
//         // Check for correct network (BSC Testnet = 97, or your network)
//         if (network.chainId !== BigInt(97)) {
//           console.warn("⚠️ Not on BSC Testnet. Current chain:", network.chainId)
//           setContract(null)
//           setPdxToken(null)
//           setIsContractReady(false)
//           return
//         }

//         // Initialize PDX Prediction Market contract
//         const marketContract = new ethers.Contract(
//           PDX_PREDICTION_MARKET_ADDRESS,
//           PDX_PREDICTION_MARKET_ABI,
//           provider
//         )

//         // Initialize PDX Token contract
//         const tokenContract = new ethers.Contract(
//           PDX_TOKEN_ADDRESS,
//           PDX_TOKEN_ABI,
//           provider
//         )
        
//         try {
//           // Test contracts
//           const nextId = await (marketContract as any).nextMarketId()
//           console.log('✅ PDX Market contract connected. Next market ID:', nextId.toString())
          
//           const tokenName = await (tokenContract as any).name()
//           console.log('✅ PDX Token connected:', tokenName)
          
//           setContract(marketContract)
//           setPdxToken(tokenContract)
//           setIsContractReady(true)
//         } catch (testError) {
//           console.error('❌ PDX Contract initialization test failed:', testError)
//           setContract(null)
//           setPdxToken(null)
//           setIsContractReady(false)
//         }
        
//       } catch (error) {
//         console.error('❌ Error initializing PDX contracts:', error)
//         setContract(null)
//         setPdxToken(null)
//         setIsContractReady(false)
//       }
//     }

//     initializeContracts()
//   }, [provider])

//   // Fetch PDX balance and allowance
//   useEffect(() => {
//     const fetchBalanceAndAllowance = async () => {
//       if (!pdxToken || !account) return

//       try {
//         const balance = await (pdxToken as any).balanceOf(account)
//         setPdxBalance(ethers.formatEther(balance))

//         const allowance = await (pdxToken as any).allowance(account, PDX_PREDICTION_MARKET_ADDRESS)
//         setPdxAllowance(ethers.formatEther(allowance))

//         console.log(`💰 PDX Balance: ${ethers.formatEther(balance)}`)
//         console.log(`✅ PDX Allowance: ${ethers.formatEther(allowance)}`)
//       } catch (error) {
//         console.error('❌ Error fetching PDX balance/allowance:', error)
//       }
//     }

//     fetchBalanceAndAllowance()
//   }, [pdxToken, account])

//   // ==================== PDX TOKEN FUNCTIONS ====================

//   const approvePDX = useCallback(async (amount: string): Promise<void> => {
//     if (!signer || !account || !isCorrectNetwork) {
//       throw new Error('Wallet not connected or wrong network')
//     }
//     if (!pdxToken) {
//       throw new Error('PDX Token contract not available')
//     }

//     try {
//       const tokenWithSigner = pdxToken.connect(signer) as any
//       const amountWei = ethers.parseEther(amount)

//       console.log(`📝 Approving ${amount} PDX...`)
//       const tx = await tokenWithSigner.approve(PDX_PREDICTION_MARKET_ADDRESS, amountWei)
//       await tx.wait()

//       // Update allowance
//       const newAllowance = await (pdxToken as any).allowance(account, PDX_PREDICTION_MARKET_ADDRESS)
//       setPdxAllowance(ethers.formatEther(newAllowance))

//       console.log('✅ PDX approval successful')
//     } catch (error: any) {
//       console.error('❌ Error approving PDX:', error)
//       throw new Error(error.reason || error.message || 'Failed to approve PDX')
//     }
//   }, [signer, account, isCorrectNetwork, pdxToken])

//   const getPDXBalance = useCallback(async (address?: string): Promise<string> => {
//     if (!pdxToken) throw new Error('PDX Token contract not available')
    
//     const targetAddress = address || account
//     if (!targetAddress) throw new Error('No address provided')

//     try {
//       const balance = await (pdxToken as any).balanceOf(targetAddress)
//       return ethers.formatEther(balance)
//     } catch (error) {
//       console.error('❌ Error fetching PDX balance:', error)
//       return '0'
//     }
//   }, [pdxToken, account])

//   const checkPDXAllowance = useCallback(async (): Promise<boolean> => {
//     if (!pdxToken || !account) return false

//     try {
//       const allowance = await (pdxToken as any).allowance(account, PDX_PREDICTION_MARKET_ADDRESS)
//       return allowance > BigInt(0)
//     } catch (error) {
//       console.error('❌ Error checking PDX allowance:', error)
//       return false
//     }
//   }, [pdxToken, account])

//   // ==================== MARKET CREATION ====================

//   const createMarket = useCallback(async (
//     params: PDXMarketCreationParams
//   ): Promise<number> => {
//     if (!signer || !account || !isCorrectNetwork) {
//       throw new Error('Wallet not connected or wrong network')
//     }
//     if (!isContractReady) {
//       throw new Error('Contract not ready - please ensure you are on the correct network')
//     }

//     setIsLoading(true)
//     try {
//       const contractWithSigner = contract!.connect(signer) as any

//       const initialYesWei = ethers.parseEther(params.initialYes)
//       const initialNoWei = ethers.parseEther(params.initialNo)
//       const pdxAmountWei = ethers.parseEther(params.pdxAmount)

//       // Check if approval is needed
//       const currentAllowance = await (pdxToken as any).allowance(account, PDX_PREDICTION_MARKET_ADDRESS)
//       if (currentAllowance < pdxAmountWei) {
//         console.log('⚠️ Insufficient PDX allowance, requesting approval...')
//         await approvePDX(params.pdxAmount)
//       }

//       console.log('📝 Creating PDX market...')
//       const tx = await contractWithSigner.createMarket(
//         params.question,
//         params.category,
//         BigInt(params.endTime),
//         initialYesWei,
//         initialNoWei,
//         pdxAmountWei
//       )

//       const receipt = await tx.wait()

//       // Extract market ID from event
//       let marketId: number
//       const marketCreatedTopic = ethers.id('MarketCreated(uint256,string,string,address,address,uint256)')
//       const event = receipt?.logs.find((log: any) => log.topics[0] === marketCreatedTopic)

//       if (event) {
//         const iface = new ethers.Interface(PDX_PREDICTION_MARKET_ABI)
//         const decodedEvent = iface.parseLog(event)
//         marketId = Number(decodedEvent?.args.id)
//       } else {
//         const nextId = await contractWithSigner.nextMarketId()
//         marketId = Number(nextId) - 1
//       }

//       console.log('✅ PDX Market created:', marketId)
//       return marketId

//     } catch (error: any) {
//       console.error('❌ Error creating PDX market:', error)
//       throw new Error(error.reason || error.message || 'Failed to create market')
//     } finally {
//       setIsLoading(false)
//     }
//   }, [signer, account, isCorrectNetwork, isContractReady, contract, pdxToken, approvePDX])

//   // ==================== MARKET DATA FETCHING ====================

//   const getMarket = useCallback(async (marketId: number): Promise<PDXMarket> => {
//     if (!contract) throw new Error('Contract not available')

//     try {
//       const marketData = await (contract as any).markets(BigInt(marketId))

//       // Get current multipliers
//       const multipliers = await (contract as any).getCurrentMultipliers(BigInt(marketId))

//       const market: PDXMarket = {
//         id: marketId,
//         creator: marketData[0] || "0x0000000000000000000000000000000000000000",
//         question: marketData[1] || `Market ${marketId}`,
//         category: marketData[2] || "General",
//         endTime: Number(marketData[3] || 0),
//         status: marketData[4] || MarketStatus.Open,
//         outcome: marketData[5] || Outcome.Undecided,
//         yesToken: marketData[6] || "0x0000000000000000000000000000000000000000",
//         noToken: marketData[7] || "0x0000000000000000000000000000000000000000",
//         yesPool: ethers.formatEther(marketData[8] || 0),
//         noPool: ethers.formatEther(marketData[9] || 0),
//         lpTotalSupply: ethers.formatEther(marketData[10] || 0),
//         totalBacking: ethers.formatEther(marketData[11] || 0),
//         platformFees: ethers.formatEther(marketData[12] || 0),
//         resolutionRequestedAt: Number(marketData[13] || 0),
//         disputeDeadline: Number(marketData[17] || 0),
//         resolutionReason: marketData[15] || '',
//         resolutionConfidence: Number(marketData[16] || 0),
//         yesMultiplier: Number(multipliers[0]) / 10000,
//         noMultiplier: Number(multipliers[1]) / 10000,
//         yesPrice: Number(multipliers[2]) / 100,
//         noPrice: Number(multipliers[3]) / 100
//       }

//       return market

//     } catch (error) {
//       console.error('❌ Error fetching PDX market:', error)
//       throw error
//     }
//   }, [contract])

//   // ==================== TRADING FUNCTIONS ====================

//   const getBuyYesOutput = useCallback(async (
//     marketId: number,
//     pdxAmount: string
//   ): Promise<PDXMultiplierInfo> => {
//     if (!contract) throw new Error('Contract not available')

//     try {
//       const amountWei = ethers.parseEther(pdxAmount)
//       const result = await (contract as any).getBuyYesOutput(BigInt(marketId), amountWei)

//       const totalOut = ethers.formatEther(result[0])
//       const totalFee = ethers.formatEther(result[1])
//       const multiplier = parseFloat(totalOut) / parseFloat(pdxAmount)

//       return {
//         multiplier,
//         totalOut,
//         totalFee
//       }
//     } catch (error) {
//       console.error('❌ Error calculating YES output:', error)
//       throw error
//     }
//   }, [contract])

//   const getBuyNoOutput = useCallback(async (
//     marketId: number,
//     pdxAmount: string
//   ): Promise<PDXMultiplierInfo> => {
//     if (!contract) throw new Error('Contract not available')

//     try {
//       const amountWei = ethers.parseEther(pdxAmount)
//       const result = await (contract as any).getBuyNoOutput(BigInt(marketId), amountWei)

//       const totalOut = ethers.formatEther(result[0])
//       const totalFee = ethers.formatEther(result[1])
//       const multiplier = parseFloat(totalOut) / parseFloat(pdxAmount)

//       return {
//         multiplier,
//         totalOut,
//         totalFee
//       }
//     } catch (error) {
//       console.error('❌ Error calculating NO output:', error)
//       throw error
//     }
//   }, [contract])

//   const buyYesWithPDX = useCallback(async (
//     marketId: number,
//     minTokensOut: string,
//     pdxAmount: string
//   ) => {
//     if (!signer || !isCorrectNetwork) throw new Error('Wallet not connected or wrong network')
//     if (!account) throw new Error('No account connected')

//     // Check and request approval if needed
//     const amountWei = ethers.parseEther(pdxAmount)
//     const currentAllowance = await (pdxToken as any).allowance(account, PDX_PREDICTION_MARKET_ADDRESS)
    
//     if (currentAllowance < amountWei) {
//       console.log('⚠️ Insufficient PDX allowance, requesting approval...')
//       await approvePDX(pdxAmount)
//     }

//     const contractWithSigner = contract!.connect(signer) as any
//     const minOutWei = ethers.parseEther(minTokensOut)

//     const tx = await contractWithSigner.buyYesWithPDXFor(
//       BigInt(marketId),
//       account,
//       minOutWei,
//       amountWei
//     )

//     return await tx.wait()
//   }, [signer, isCorrectNetwork, contract, pdxToken, account, approvePDX])

//   const buyNoWithPDX = useCallback(async (
//     marketId: number,
//     minTokensOut: string,
//     pdxAmount: string
//   ) => {
//     if (!signer || !isCorrectNetwork) throw new Error('Wallet not connected or wrong network')
//     if (!account) throw new Error('No account connected')

//     // Check and request approval if needed
//     const amountWei = ethers.parseEther(pdxAmount)
//     const currentAllowance = await (pdxToken as any).allowance(account, PDX_PREDICTION_MARKET_ADDRESS)
    
//     if (currentAllowance < amountWei) {
//       console.log('⚠️ Insufficient PDX allowance, requesting approval...')
//       await approvePDX(pdxAmount)
//     }

//     const contractWithSigner = contract!.connect(signer) as any
//     const minOutWei = ethers.parseEther(minTokensOut)

//     const tx = await contractWithSigner.buyNoWithPDXFor(
//       BigInt(marketId),
//       account,
//       minOutWei,
//       amountWei
//     )

//     return await tx.wait()
//   }, [signer, isCorrectNetwork, contract, pdxToken, account, approvePDX])

//   const sellYesForPDX = useCallback(async (
//     marketId: number,
//     tokenAmount: string,
//     minPDXOut: string
//   ) => {
//     if (!signer || !isCorrectNetwork) throw new Error('Wallet not connected or wrong network')

//     const contractWithSigner = contract!.connect(signer) as any
//     const tokenAmountWei = ethers.parseEther(tokenAmount)
//     const minOutWei = ethers.parseEther(minPDXOut)

//     const tx = await contractWithSigner.sellYesForPDX(
//       BigInt(marketId),
//       tokenAmountWei,
//       minOutWei
//     )

//     return await tx.wait()
//   }, [signer, isCorrectNetwork, contract])

//   const sellNoForPDX = useCallback(async (
//     marketId: number,
//     tokenAmount: string,
//     minPDXOut: string
//   ) => {
//     if (!signer || !isCorrectNetwork) throw new Error('Wallet not connected or wrong network')

//     const contractWithSigner = contract!.connect(signer) as any
//     const tokenAmountWei = ethers.parseEther(tokenAmount)
//     const minOutWei = ethers.parseEther(minPDXOut)

//     const tx = await contractWithSigner.sellNoForPDX(
//       BigInt(marketId),
//       tokenAmountWei,
//       minOutWei
//     )

//     return await tx.wait()
//   }, [signer, isCorrectNetwork, contract])

//   // ==================== ORDER MANAGEMENT ====================

//   const createStopLossOrder = useCallback(async (
//     marketId: number,
//     isYes: boolean,
//     tokenAmount: string,
//     stopLossPrice: number
//   ): Promise<number> => {
//     if (!signer || !isCorrectNetwork) throw new Error('Wallet not connected or wrong network')

//     const contractWithSigner = contract!.connect(signer) as any
//     const tokenAmountWei = ethers.parseEther(tokenAmount)

//     const tx = await contractWithSigner.createStopLossOrder(
//       BigInt(marketId),
//       isYes,
//       tokenAmountWei,
//       BigInt(stopLossPrice)
//     )

//     const receipt = await tx.wait()
    
//     // Extract order ID from event
//     const orderCreatedTopic = ethers.id('OrderCreated(uint256,address,uint256,uint8,bool,uint256,uint256)')
//     const event = receipt?.logs.find((log: any) => log.topics[0] === orderCreatedTopic)
    
//     if (event) {
//       const iface = new ethers.Interface(PDX_PREDICTION_MARKET_ABI)
//       const decodedEvent = iface.parseLog(event)
//       return Number(decodedEvent?.args.orderId)
//     }

//     throw new Error('Order creation event not found')
//   }, [signer, isCorrectNetwork, contract])

//   const createTakeProfitOrder = useCallback(async (
//     marketId: number,
//     isYes: boolean,
//     tokenAmount: string,
//     takeProfitPrice: number
//   ): Promise<number> => {
//     if (!signer || !isCorrectNetwork) throw new Error('Wallet not connected or wrong network')

//     const contractWithSigner = contract!.connect(signer) as any
//     const tokenAmountWei = ethers.parseEther(tokenAmount)

//     const tx = await contractWithSigner.createTakeProfitOrder(
//       BigInt(marketId),
//       isYes,
//       tokenAmountWei,
//       BigInt(takeProfitPrice)
//     )

//     const receipt = await tx.wait()
    
//     // Extract order ID from event
//     const orderCreatedTopic = ethers.id('OrderCreated(uint256,address,uint256,uint8,bool,uint256,uint256)')
//     const event = receipt?.logs.find((log: any) => log.topics[0] === orderCreatedTopic)
    
//     if (event) {
//       const iface = new ethers.Interface(PDX_PREDICTION_MARKET_ABI)
//       const decodedEvent = iface.parseLog(event)
//       return Number(decodedEvent?.args.orderId)
//     }

//     throw new Error('Order creation event not found')
//   }, [signer, isCorrectNetwork, contract])

//   const executeOrder = useCallback(async (orderId: number) => {
//     if (!signer || !isCorrectNetwork) throw new Error('Wallet not connected or wrong network')

//     const contractWithSigner = contract!.connect(signer) as any
//     const tx = await contractWithSigner.executeOrder(BigInt(orderId))
//     return await tx.wait()
//   }, [signer, isCorrectNetwork, contract])

//   const cancelOrder = useCallback(async (orderId: number) => {
//     if (!signer || !isCorrectNetwork) throw new Error('Wallet not connected or wrong network')

//     const contractWithSigner = contract!.connect(signer) as any
//     const tx = await contractWithSigner.cancelOrder(BigInt(orderId))
//     return await tx.wait()
//   }, [signer, isCorrectNetwork, contract])

//   const getUserOrders = useCallback(async (userAddress?: string): Promise<PDXOrderInfo[]> => {
//     if (!contract) throw new Error('Contract not available')
    
//     const targetAddress = userAddress || account
//     if (!targetAddress) throw new Error('No address provided')

//     try {
//       const orderIds = await (contract as any).getUserOrders(targetAddress)
//       const orders: PDXOrderInfo[] = []

//       for (const orderId of orderIds) {
//         const orderData = await (contract as any).orders(orderId)
        
//         orders.push({
//           orderId: Number(orderId),
//           user: orderData[1],
//           marketId: Number(orderData[2]),
//           isYes: orderData[3],
//           tokenAmount: ethers.formatEther(orderData[4]),
//           stopLossPrice: orderData[6] === 0 ? Number(orderData[5]) : 0,
//           takeProfitPrice: orderData[6] === 1 ? Number(orderData[5]) : 0,
//           isActive: orderData[7],
//           createdAt: Number(orderData[8])
//         })
//       }

//       return orders
//     } catch (error) {
//       console.error('❌ Error fetching user orders:', error)
//       return []
//     }
//   }, [contract, account])

//   const checkOrderTrigger = useCallback(async (orderId: number): Promise<{
//     triggered: boolean
//     currentPrice: number
//     triggerPrice: number
//   }> => {
//     if (!contract) throw new Error('Contract not available')

//     try {
//       const result = await (contract as any).checkOrderTrigger(BigInt(orderId))
//       return {
//         triggered: result[0],
//         currentPrice: Number(result[1]),
//         triggerPrice: Number(result[2])
//       }
//     } catch (error) {
//       console.error('❌ Error checking order trigger:', error)
//       throw error
//     }
//   }, [contract])

//   // ==================== RESOLUTION FUNCTIONS ====================

//   const requestResolution = useCallback(async (marketId: number, reason: string = '') => {
//     if (!signer || !isCorrectNetwork) throw new Error('Wallet not connected or wrong network')

//     const contractWithSigner = contract!.connect(signer) as any
//     const tx = await contractWithSigner.requestResolution(BigInt(marketId), reason)
//     return await tx.wait()
//   }, [signer, isCorrectNetwork, contract])

//   const claimRedemption = useCallback(async (marketId: number) => {
//     if (!signer || !isCorrectNetwork) throw new Error('Wallet not connected or wrong network')

//     const contractWithSigner = contract!.connect(signer) as any
//     const tx = await contractWithSigner.claimRedemption(BigInt(marketId))
//     return await tx.wait()
//   }, [signer, isCorrectNetwork, contract])

//   // ==================== USER POSITIONS ====================

//   const getUserPosition = useCallback(async (marketId: number, userAddress?: string): Promise<PDXUserPosition | null> => {
//     if (!contract) throw new Error('Contract not available')
    
//     const targetAddress = userAddress || account
//     if (!targetAddress) return null

//     try {
//       const market = await getMarket(marketId)
      
//       // Get token contracts
//       const yesTokenContract = new ethers.Contract(market.yesToken, ['function balanceOf(address) view returns (uint256)'], provider)
//       const noTokenContract = new ethers.Contract(market.noToken, ['function balanceOf(address) view returns (uint256)'], provider)

//       const yesBalance = await yesTokenContract.balanceOf(targetAddress)
//       const noBalance = await noTokenContract.balanceOf(targetAddress)

//       // Get investment data
//       const investmentData = await (contract as any).userInvestments(BigInt(marketId), targetAddress)

//       return {
//         market,
//         yesBalance: ethers.formatEther(yesBalance),
//         noBalance: ethers.formatEther(noBalance),
//         totalInvested: ethers.formatEther(investmentData[0]),
//         pdxInvested: ethers.formatEther(investmentData[0])
//       }
//     } catch (error) {
//       console.error('❌ Error fetching user position:', error)
//       return null
//     }
//   }, [contract, account, provider, getMarket])

//   return {
//     // Core functions
//     createMarket,
//     getMarket,
    
//     // PDX Token functions
//     approvePDX,
//     getPDXBalance,
//     checkPDXAllowance,
//     pdxBalance,
//     pdxAllowance,
    
//     // Trading functions
//     getBuyYesOutput,
//     getBuyNoOutput,
//     buyYesWithPDX,
//     buyNoWithPDX,
//     sellYesForPDX,
//     sellNoForPDX,
    
//     // Order management
//     createStopLossOrder,
//     createTakeProfitOrder,
//     executeOrder,
//     cancelOrder,
//     getUserOrders,
//     checkOrderTrigger,
    
//     // Resolution
//     requestResolution,
//     claimRedemption,
    
//     // User positions
//     getUserPosition,
    
//     // State
//     isLoading,
//     contract,
//     pdxToken,
//     contractAddress: PDX_PREDICTION_MARKET_ADDRESS,
//     pdxTokenAddress: PDX_TOKEN_ADDRESS,
//     isContractReady,
    
//     // Constants
//     MarketStatus,
//     Outcome,
//   }
// }