import { useState, useCallback, useEffect } from 'react'
import { ethers } from 'ethers'
import { useWeb3Context } from '@/lib/wallet-context'
import { usePredictionMarketBNB } from './use-predection-market'
import { usePredictionMarketPDX } from './use-prediction-market-pdx'

// Types
interface OrderInfo {
  orderId: string
  user: string
  marketId: string
  isYes: boolean
  tokenAmount: string
  stopLossPrice: string
  takeProfitPrice: string
  isActive: boolean
  orderType: 'StopLoss' | 'TakeProfit'
}

interface OrderTriggerStatus {
  shouldExecute: boolean
  currentPrice: string
  triggerPrice: string
}

interface CreateOrderParams {
  marketId: number
  isYes: boolean
  tokenAmount: string
  triggerPrice: number
}

interface UseStopLossTakeProfitReturn {
  // State
  loading: boolean
  error: string | null
  userOrders: OrderInfo[]
  activeOrders: OrderInfo[]
  
  // Actions
  createStopLossOrder: (params: CreateOrderParams) => Promise<{ success: boolean; orderId?: string; txHash?: string; error?: string }>
  createTakeProfitOrder: (params: CreateOrderParams) => Promise<{ success: boolean; orderId?: string; txHash?: string; error?: string }>
  executeOrder: (orderId: string) => Promise<{ success: boolean; txHash?: string; error?: string }>
  cancelOrder: (orderId: string) => Promise<{ success: boolean; txHash?: string; error?: string }>
  
  // Queries
  getOrderInfo: (orderId: string) => Promise<OrderInfo | null>
  checkOrderTrigger: (orderId: string) => Promise<OrderTriggerStatus | null>
  getUserOrders: (userAddress: string) => Promise<OrderInfo[]>
  getActiveOrders: (userAddress: string) => Promise<OrderInfo[]>
  
  // Utilities
  refreshOrders: () => Promise<void>
  clearError: () => void
}

// ==================== BNB STOP LOSS / TAKE PROFIT ====================

export const useStopLossTakeProfitBNB = (userAddress?: string): UseStopLossTakeProfitReturn => {
  const [loading, setLoading] = useState(false)
  const [userOrders, setUserOrders] = useState<OrderInfo[]>([])
  const [activeOrders, setActiveOrders] = useState<OrderInfo[]>([])
  const [error, setError] = useState<string | null>(null)

  const bnbHook = usePredictionMarketBNB()

  // Clear error
  const clearError = useCallback(() => {
    setError(null)
  }, [])

  // Create Stop Loss Order
  const createStopLossOrder = useCallback(async (params: CreateOrderParams) => {
    setLoading(true)
    setError(null)

    try {
      const receipt = await bnbHook.createStopLossOrder(
        params.marketId,
        params.isYes,
        params.tokenAmount,
        params.triggerPrice
      )

      setLoading(false)
      return { success: true, txHash: receipt?.transactionHash || 'success' }
    } catch (err: any) {
      const errorMessage = err?.reason || err?.message || 'Failed to create stop loss order'
      setError(errorMessage)
      setLoading(false)
      return { success: false, error: errorMessage }
    }
  }, [bnbHook])

  // Create Take Profit Order
  const createTakeProfitOrder = useCallback(async (params: CreateOrderParams) => {
    setLoading(true)
    setError(null)

    try {
      const receipt = await bnbHook.createTakeProfitOrder(
        params.marketId,
        params.isYes,
        params.tokenAmount,
        params.triggerPrice
      )

      setLoading(false)
      return { success: true, txHash: receipt?.transactionHash || 'success' }
    } catch (err: any) {
      const errorMessage = err?.reason || err?.message || 'Failed to create take profit order'
      setError(errorMessage)
      setLoading(false)
      return { success: false, error: errorMessage }
    }
  }, [bnbHook])

  // Execute Order
  const executeOrder = useCallback(async (orderId: string) => {
    setLoading(true)
    setError(null)

    try {
      const orderId_num = parseInt(orderId)
      const receipt = await bnbHook.executeOrder(orderId_num)

      setLoading(false)
      return { success: true, txHash: receipt?.transactionHash || 'success' }
    } catch (err: any) {
      const errorMessage = err?.reason || err?.message || 'Failed to execute order'
      setError(errorMessage)
      setLoading(false)
      return { success: false, error: errorMessage }
    }
  }, [bnbHook])

  // Cancel Order
  const cancelOrder = useCallback(async (orderId: string) => {
    setLoading(true)
    setError(null)

    try {
      const orderId_num = parseInt(orderId)
      const receipt = await bnbHook.cancelOrder(orderId_num)

      setLoading(false)
      return { success: true, txHash: receipt?.transactionHash || 'success' }
    } catch (err: any) {
      const errorMessage = err?.reason || err?.message || 'Failed to cancel order'
      setError(errorMessage)
      setLoading(false)
      return { success: false, error: errorMessage }
    }
  }, [bnbHook])

  // Get Order Info
  const getOrderInfo = useCallback(async (orderId: string): Promise<OrderInfo | null> => {
    try {
      const orderId_num = parseInt(orderId)
      const info = await bnbHook.getOrderInfo(orderId_num)

      const orderType = info.stopLossPrice && parseFloat(info.stopLossPrice.toString()) > 0 ? 'StopLoss' : 'TakeProfit'

      return {
        orderId,
        user: info.user,
        marketId: info.marketId.toString(),
        isYes: info.isYes,
        tokenAmount: info.tokenAmount,
        stopLossPrice: info.stopLossPrice.toString(),
        takeProfitPrice: info.takeProfitPrice.toString(),
        isActive: info.isActive,
        orderType
      }
    } catch (err: any) {
      console.error('Error getting BNB order info:', err)
      return null
    }
  }, [bnbHook])

  // Check Order Trigger
  const checkOrderTrigger = useCallback(async (orderId: string): Promise<OrderTriggerStatus | null> => {
    try {
      const orderId_num = parseInt(orderId)
      const result = await bnbHook.checkOrderTrigger(orderId_num)

      return {
        shouldExecute: result.triggered,
        currentPrice: result.currentPrice.toString(),
        triggerPrice: result.triggerPrice.toString()
      }
    } catch (err: any) {
      console.error('Error checking BNB order trigger:', err)
      return null
    }
  }, [bnbHook])

  // Get User Orders
  const getUserOrders = useCallback(async (userAddress: string): Promise<OrderInfo[]> => {
    try {
      const orderIds = await bnbHook.getUserOrders(userAddress)
      
      const orders: OrderInfo[] = []
      for (const orderId of orderIds) {
        const orderInfo = await getOrderInfo(orderId.toString())
        if (orderInfo) {
          orders.push(orderInfo)
        }
      }

      return orders
    } catch (err: any) {
      console.error('Error getting BNB user orders:', err)
      return []
    }
  }, [bnbHook, getOrderInfo])

  // Get Active Orders
  const getActiveOrders = useCallback(async (userAddress: string): Promise<OrderInfo[]> => {
    try {
      const allOrders = await getUserOrders(userAddress)
      return allOrders.filter(order => order.isActive)
    } catch (err: any) {
      console.error('Error getting BNB active orders:', err)
      return []
    }
  }, [getUserOrders])

  // Refresh Orders
  const refreshOrders = useCallback(async () => {
    if (!userAddress) return

    try {
      setLoading(true)
      const [allOrders, active] = await Promise.all([
        getUserOrders(userAddress),
        getActiveOrders(userAddress)
      ])

      setUserOrders(allOrders)
      setActiveOrders(active)
      setLoading(false)
    } catch (err: any) {
      console.error('Error refreshing BNB orders:', err)
      setLoading(false)
    }
  }, [userAddress, getUserOrders, getActiveOrders])

  // Auto-refresh orders when user address changes
  useEffect(() => {
    if (userAddress) {
      refreshOrders()
    }
  }, [userAddress, refreshOrders])

  return {
    // State
    loading,
    error,
    userOrders,
    activeOrders,
    
    // Actions
    createStopLossOrder,
    createTakeProfitOrder,
    executeOrder,
    cancelOrder,
    
    // Queries
    getOrderInfo,
    checkOrderTrigger,
    getUserOrders,
    getActiveOrders,
    
    // Utilities
    refreshOrders,
    clearError
  }
}

// ==================== PDX STOP LOSS / TAKE PROFIT ====================

export const useStopLossTakeProfitPDX = (userAddress?: string): UseStopLossTakeProfitReturn => {
  const [loading, setLoading] = useState(false)
  const [userOrders, setUserOrders] = useState<OrderInfo[]>([])
  const [activeOrders, setActiveOrders] = useState<OrderInfo[]>([])
  const [error, setError] = useState<string | null>(null)

  const pdxHook = usePredictionMarketPDX()

  // Clear error
  const clearError = useCallback(() => {
    setError(null)
  }, [])

  // Create Stop Loss Order
  const createStopLossOrder = useCallback(async (params: CreateOrderParams) => {
    setLoading(true)
    setError(null)

    try {
      const receipt = await pdxHook.createStopLossOrder(
        params.marketId,
        params.triggerPrice,
        params.tokenAmount
      )

      setLoading(false)
      return { success: true, txHash: receipt?.transactionHash || 'success' }
    } catch (err: any) {
      const errorMessage = err?.reason || err?.message || 'Failed to create PDX stop loss order'
      setError(errorMessage)
      setLoading(false)
      return { success: false, error: errorMessage }
    }
  }, [pdxHook])

  // Create Take Profit Order
  const createTakeProfitOrder = useCallback(async (params: CreateOrderParams) => {
    setLoading(true)
    setError(null)

    try {
      const receipt = await pdxHook.createTakeProfitOrder(
        params.marketId,
        params.triggerPrice,
        params.tokenAmount
      )

      setLoading(false)
      return { success: true, txHash: receipt?.transactionHash || 'success' }
    } catch (err: any) {
      const errorMessage = err?.reason || err?.message || 'Failed to create PDX take profit order'
      setError(errorMessage)
      setLoading(false)
      return { success: false, error: errorMessage }
    }
  }, [pdxHook])

  // Execute Order
  const executeOrder = useCallback(async (orderId: string) => {
    setLoading(true)
    setError(null)

    try {
      const orderId_num = parseInt(orderId)
      const receipt = await pdxHook.executeOrder(orderId_num)

      setLoading(false)
      return { success: true, txHash: receipt?.transactionHash || 'success' }
    } catch (err: any) {
      const errorMessage = err?.reason || err?.message || 'Failed to execute PDX order'
      setError(errorMessage)
      setLoading(false)
      return { success: false, error: errorMessage }
    }
  }, [pdxHook])

  // Cancel Order
  const cancelOrder = useCallback(async (orderId: string) => {
    setLoading(true)
    setError(null)

    try {
      const orderId_num = parseInt(orderId)
      const receipt = await pdxHook.cancelOrder(orderId_num)

      setLoading(false)
      return { success: true, txHash: receipt?.transactionHash || 'success' }
    } catch (err: any) {
      const errorMessage = err?.reason || err?.message || 'Failed to cancel PDX order'
      setError(errorMessage)
      setLoading(false)
      return { success: false, error: errorMessage }
    }
  }, [pdxHook])

  // Get Order Info
  const getOrderInfo = useCallback(async (orderId: string): Promise<OrderInfo | null> => {
    try {
      const orderId_num = parseInt(orderId)
      // PDX hook might not have getOrderInfo, so we'll return a placeholder
      console.warn('PDX getOrderInfo not yet implemented')
      return null
    } catch (err: any) {
      console.error('Error getting PDX order info:', err)
      return null
    }
  }, [pdxHook])

  // Check Order Trigger
  const checkOrderTrigger = useCallback(async (orderId: string): Promise<OrderTriggerStatus | null> => {
    try {
      const orderId_num = parseInt(orderId)
      const triggered = await pdxHook.checkOrderTrigger(orderId_num)

      return {
        shouldExecute: triggered,
        currentPrice: '0',
        triggerPrice: '0'
      }
    } catch (err: any) {
      console.error('Error checking PDX order trigger:', err)
      return null
    }
  }, [pdxHook])

  // Get User Orders
  const getUserOrders = useCallback(async (userAddress: string): Promise<OrderInfo[]> => {
    try {
      const orderIds = await pdxHook.getUserOrders(userAddress)
      
      const orders: OrderInfo[] = []
      for (const orderId of orderIds) {
        const orderInfo = await getOrderInfo(orderId.toString())
        if (orderInfo) {
          orders.push(orderInfo)
        }
      }

      return orders
    } catch (err: any) {
      console.error('Error getting PDX user orders:', err)
      return []
    }
  }, [pdxHook, getOrderInfo])

  // Get Active Orders
  const getActiveOrders = useCallback(async (userAddress: string): Promise<OrderInfo[]> => {
    try {
      const allOrders = await getUserOrders(userAddress)
      return allOrders.filter(order => order.isActive)
    } catch (err: any) {
      console.error('Error getting PDX active orders:', err)
      return []
    }
  }, [getUserOrders])

  // Refresh Orders
  const refreshOrders = useCallback(async () => {
    if (!userAddress) return

    try {
      setLoading(true)
      const [allOrders, active] = await Promise.all([
        getUserOrders(userAddress),
        getActiveOrders(userAddress)
      ])

      setUserOrders(allOrders)
      setActiveOrders(active)
      setLoading(false)
    } catch (err: any) {
      console.error('Error refreshing PDX orders:', err)
      setLoading(false)
    }
  }, [userAddress, getUserOrders, getActiveOrders])

  // Auto-refresh orders when user address changes
  useEffect(() => {
    if (userAddress) {
      refreshOrders()
    }
  }, [userAddress, refreshOrders])

  return {
    // State
    loading,
    error,
    userOrders,
    activeOrders,
    
    // Actions
    createStopLossOrder,
    createTakeProfitOrder,
    executeOrder,
    cancelOrder,
    
    // Queries
    getOrderInfo,
    checkOrderTrigger,
    getUserOrders,
    getActiveOrders,
    
    // Utilities
    refreshOrders,
    clearError
  }
}

// ==================== UNIFIED HOOK (AUTO-DETECT TOKEN) ====================

export const useStopLossTakeProfit = (paymentToken: "BNB" | "PDX", userAddress?: string): UseStopLossTakeProfitReturn => {
  const bnbHook = useStopLossTakeProfitBNB(userAddress)
  const pdxHook = useStopLossTakeProfitPDX(userAddress)

  return paymentToken === "BNB" ? bnbHook : pdxHook
}

// ==================== UTILITY FUNCTIONS ====================

export const formatPrice = (price: string): string => {
  const priceNum = Number(price)
  return (priceNum / 100).toFixed(2) + '%'
}

export const formatMultiplier = (multiplier: string): string => {
  const multNum = Number(multiplier)
  if (multNum >= 1000000) return '100x+'
  
  const integerPart = Math.floor(multNum / 10000)
  const fractionalPart = Math.floor((multNum % 10000) / 1000)
  
  if (fractionalPart === 0) {
    return `${integerPart}x`
  } else {
    return `${integerPart}.${fractionalPart}x`
  }
}

export const formatTokenAmount = (amount: string): string => {
  const amountNum = parseFloat(amount)
  if (amountNum >= 1000) {
    return (amountNum / 1000).toFixed(2) + 'K'
  }
  return amountNum.toFixed(4)
}