import { useState, useCallback, useEffect } from 'react';
import { ethers, BrowserProvider, Contract, formatEther, parseEther } from 'ethers';
import contractABI from '@/contracts/abi.json';

// Types
interface OrderInfo {
  orderId: string;
  user: string;
  marketId: string;
  isYes: boolean;
  tokenAmount: string;
  stopLossPrice: string;
  takeProfitPrice: string;
  isActive: boolean;
  orderType: 'StopLoss' | 'TakeProfit';
}

interface OrderTriggerStatus {
  shouldExecute: boolean;
  currentPrice: string;
  triggerPrice: string;
}

interface CreateOrderParams {
  marketId: string;
  isYes: boolean;
  tokenAmount: string;
  triggerPrice: string;
}

interface MarketPrices {
  yesMultiplier: string;
  noMultiplier: string;
  yesPrice: string;
  noPrice: string;
}

interface UseStopLossTakeProfitReturn {
  // State
  loading: boolean;
  error: string | null;
  userOrders: OrderInfo[];
  activeOrders: OrderInfo[];
  
  // Actions
  createStopLossOrder: (params: CreateOrderParams) => Promise<{ success: boolean; orderId?: string; txHash?: string; error?: string }>;
  createTakeProfitOrder: (params: CreateOrderParams) => Promise<{ success: boolean; orderId?: string; txHash?: string; error?: string }>;
  executeOrder: (orderId: string) => Promise<{ success: boolean; txHash?: string; error?: string }>;
  cancelOrder: (orderId: string) => Promise<{ success: boolean; txHash?: string; error?: string }>;
  
  // Queries
  getOrderInfo: (orderId: string) => Promise<OrderInfo | null>;
  checkOrderTrigger: (orderId: string) => Promise<OrderTriggerStatus | null>;
  getUserOrders: (userAddress: string) => Promise<OrderInfo[]>;
  getActiveOrders: (userAddress: string) => Promise<OrderInfo[]>;
  getMarketPrices: (marketId: string) => Promise<MarketPrices | null>;
  
  // Utilities
  refreshOrders: () => Promise<void>;
  clearError: () => void;
}

export const useStopLossTakeProfit = (
  provider?: BrowserProvider,
  userAddress?: string
): UseStopLossTakeProfitReturn => {
  const [loading, setLoading] = useState(false);
  const [userOrders, setUserOrders] = useState<OrderInfo[]>([]);
  const [activeOrders, setActiveOrders] = useState<OrderInfo[]>([]);
  const [error, setError] = useState<string | null>(null);

  const contractAddress = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;

  // Get contract instance
  const getContract = useCallback(async (needsSigner = false) => {
    if (!contractAddress) throw new Error('Contract address not configured');
    if (!provider) throw new Error('Provider not available');
    
    if (needsSigner) {
      const signer = await provider.getSigner();
      return new Contract(contractAddress, contractABI, signer);
    }
    
    return new Contract(contractAddress, contractABI, provider);
  }, [contractAddress, provider]);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Create Stop Loss Order
  const createStopLossOrder = useCallback(async (params: CreateOrderParams) => {
    setLoading(true);
    setError(null);

    try {
      const contract = await getContract(true);
      
      // Convert values to proper format
      const tokenAmount = parseEther(params.tokenAmount);
      const stopLossPrice = BigInt(params.triggerPrice);

      const tx = await contract.createStopLossOrder(
        params.marketId,
        params.isYes,
        tokenAmount,
        stopLossPrice
      );

      const receipt = await tx.wait();
      
      // Extract orderId from event
      const event = receipt.logs?.find((log: any) => {
        try {
          const parsedLog = contract.interface.parseLog(log);
          return parsedLog?.name === 'OrderCreated';
        } catch {
          return false;
        }
      });

      let orderId: string | undefined;
      if (event) {
        const parsedLog = contract.interface.parseLog(event);
        orderId = parsedLog?.args?.orderId?.toString();
      }

      setLoading(false);
      return { success: true, orderId, txHash: receipt.hash };
    } catch (err: any) {
      const errorMessage = err.reason || err.message || 'Failed to create stop loss order';
      setError(errorMessage);
      setLoading(false);
      return { success: false, error: errorMessage };
    }
  }, [getContract]);

  // Create Take Profit Order
  const createTakeProfitOrder = useCallback(async (params: CreateOrderParams) => {
    setLoading(true);
    setError(null);

    try {
      const contract = await getContract(true);
      
      const tokenAmount = parseEther(params.tokenAmount);
      const takeProfitPrice = BigInt(params.triggerPrice);

      const tx = await contract.createTakeProfitOrder(
        params.marketId,
        params.isYes,
        tokenAmount,
        takeProfitPrice
      );

      const receipt = await tx.wait();
      
      // Extract orderId from event
      const event = receipt.logs?.find((log: any) => {
        try {
          const parsedLog = contract.interface.parseLog(log);
          return parsedLog?.name === 'OrderCreated';
        } catch {
          return false;
        }
      });

      let orderId: string | undefined;
      if (event) {
        const parsedLog = contract.interface.parseLog(event);
        orderId = parsedLog?.args?.orderId?.toString();
      }

      setLoading(false);
      return { success: true, orderId, txHash: receipt.hash };
    } catch (err: any) {
      const errorMessage = err.reason || err.message || 'Failed to create take profit order';
      setError(errorMessage);
      setLoading(false);
      return { success: false, error: errorMessage };
    }
  }, [getContract]);

  // Execute Order
  const executeOrder = useCallback(async (orderId: string) => {
    setLoading(true);
    setError(null);

    try {
      const contract = await getContract(true);
      const tx = await contract.executeOrder(orderId);
      const receipt = await tx.wait();

      setLoading(false);
      return { success: true, txHash: receipt.hash };
    } catch (err: any) {
      const errorMessage = err.reason || err.message || 'Failed to execute order';
      setError(errorMessage);
      setLoading(false);
      return { success: false, error: errorMessage };
    }
  }, [getContract]);

  // Cancel Order
  const cancelOrder = useCallback(async (orderId: string) => {
    setLoading(true);
    setError(null);

    try {
      const contract = await getContract(true);
      const tx = await contract.cancelOrder(orderId);
      const receipt = await tx.wait();

      setLoading(false);
      return { success: true, txHash: receipt.hash };
    } catch (err: any) {
      const errorMessage = err.reason || err.message || 'Failed to cancel order';
      setError(errorMessage);
      setLoading(false);
      return { success: false, error: errorMessage };
    }
  }, [getContract]);

  // Get Order Info
  const getOrderInfo = useCallback(async (orderId: string): Promise<OrderInfo | null> => {
    try {
      const contract = await getContract(false);
      const info = await contract.getOrderInfo(orderId);

      const orderType = BigInt(info.stopLossPrice) > BigInt(0) ? 'StopLoss' : 'TakeProfit';

      return {
        orderId,
        user: info.user,
        marketId: info.marketId.toString(),
        isYes: info.isYes,
        tokenAmount: formatEther(info.tokenAmount),
        stopLossPrice: info.stopLossPrice.toString(),
        takeProfitPrice: info.takeProfitPrice.toString(),
        isActive: info.isActive,
        orderType
      };
    } catch (err: any) {
      console.error('Error getting order info:', err);
      return null;
    }
  }, [getContract]);

  // Check Order Trigger
  const checkOrderTrigger = useCallback(async (orderId: string): Promise<OrderTriggerStatus | null> => {
    try {
      const contract = await getContract(false);
      const result = await contract.checkOrderTrigger(orderId);

      return {
        shouldExecute: result.shouldExecute,
        currentPrice: result.currentPrice.toString(),
        triggerPrice: result.triggerPrice.toString()
      };
    } catch (err: any) {
      console.error('Error checking order trigger:', err);
      return null;
    }
  }, [getContract]);

  // Get User Orders
  const getUserOrders = useCallback(async (userAddress: string): Promise<OrderInfo[]> => {
    try {
      const contract = await getContract(false);
      const orderIds = await contract.getUserOrders(userAddress);
      
      const orders: OrderInfo[] = [];
      for (const orderId of orderIds) {
        const orderInfo = await getOrderInfo(orderId.toString());
        if (orderInfo) {
          orders.push(orderInfo);
        }
      }

      return orders;
    } catch (err: any) {
      console.error('Error getting user orders:', err);
      return [];
    }
  }, [getContract, getOrderInfo]);

  // Get Active Orders
  const getActiveOrders = useCallback(async (userAddress: string): Promise<OrderInfo[]> => {
    try {
      const contract = await getContract(false);
      const orderIds = await contract.getActiveOrders(userAddress);
      
      const orders: OrderInfo[] = [];
      for (const orderId of orderIds) {
        const orderInfo = await getOrderInfo(orderId.toString());
        if (orderInfo) {
          orders.push(orderInfo);
        }
      }

      return orders;
    } catch (err: any) {
      console.error('Error getting active orders:', err);
      return [];
    }
  }, [getContract, getOrderInfo]);

  // Get Market Prices
  const getMarketPrices = useCallback(async (marketId: string): Promise<MarketPrices | null> => {
    try {
      const contract = await getContract(false);
      const result = await contract.getCurrentMultipliers(marketId);

      return {
        yesMultiplier: result[0].toString(),
        noMultiplier: result[1].toString(),
        yesPrice: result[2].toString(),
        noPrice: result[3].toString()
      };
    } catch (err: any) {
      console.error('Error getting market prices:', err);
      return null;
    }
  }, [getContract]);

  // Refresh Orders
  const refreshOrders = useCallback(async () => {
    if (!userAddress) return;

    try {
      setLoading(true);
      const [allOrders, active] = await Promise.all([
        getUserOrders(userAddress),
        getActiveOrders(userAddress)
      ]);

      setUserOrders(allOrders);
      setActiveOrders(active);
      setLoading(false);
    } catch (err: any) {
      console.error('Error refreshing orders:', err);
      setLoading(false);
    }
  }, [userAddress, getUserOrders, getActiveOrders]);

  // Auto-refresh orders when user address changes
  useEffect(() => {
    if (userAddress && provider) {
      refreshOrders();
    }
  }, [userAddress, provider, refreshOrders]);

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
    getMarketPrices,
    
    // Utilities
    refreshOrders,
    clearError
  };
};

// Utility functions for formatting
export const formatPrice = (price: string): string => {
  const priceNum = Number(price);
  return (priceNum / 100).toFixed(2) + '%';
};

export const formatMultiplier = (multiplier: string): string => {
  const multNum = Number(multiplier);
  if (multNum >= 1000000) return '100x+';
  
  const integerPart = Math.floor(multNum / 10000);
  const fractionalPart = Math.floor((multNum % 10000) / 1000);
  
  if (fractionalPart === 0) {
    return `${integerPart}x`;
  } else {
    return `${integerPart}.${fractionalPart}x`;
  }
};

export const formatTokenAmount = (amount: string): string => {
  const amountNum = parseFloat(amount);
  if (amountNum >= 1000) {
    return (amountNum / 1000).toFixed(2) + 'K';
  }
  return amountNum.toFixed(4);
};