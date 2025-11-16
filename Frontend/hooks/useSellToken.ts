import { useState, useCallback } from 'react'
import { ethers } from 'ethers'
import { useWeb3Context } from '@/lib/wallet-context'
import { usePredictionMarketBNB } from './use-predection-market'
import { usePredictionMarketPDX } from './use-prediction-market-pdx'

interface SellTokensParams {
  marketId: number
  tokenAmount: string // Amount in ether format (e.g., "1.5")
  minTokenOut: string // Minimum tokens to receive in ether format
  isYes: boolean // true for YES tokens, false for NO tokens
}

interface SellEstimate {
  tokenOut: string
  fee: string
  tokenOutWei: bigint
  feeWei: bigint
}

// ==================== BNB SELL TOKENS ====================

export function useSellTokensBNB() {
  const { signer, account } = useWeb3Context()
  const { sellYesForBNB, sellNoForBNB } = usePredictionMarketBNB()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [txHash, setTxHash] = useState<string | null>(null)
  const [isSuccess, setIsSuccess] = useState(false)

  /**
   * Sell YES or NO tokens for BNB
   */
  const sellTokens = useCallback(
    async ({ marketId, tokenAmount, minTokenOut, isYes }: SellTokensParams) => {
      if (!signer || !account) {
        throw new Error('Wallet not connected')
      }

      try {
        setIsLoading(true)
        setError(null)
        setIsSuccess(false)
        setTxHash(null)

        let receipt

        if (isYes) {
          receipt = await sellYesForBNB(marketId, tokenAmount, minTokenOut)
        } else {
          receipt = await sellNoForBNB(marketId, tokenAmount, minTokenOut)
        }

        if (receipt) {
          setTxHash(receipt.transactionHash || 'success')
          setIsSuccess(true)
        } else {
          throw new Error('Transaction failed')
        }

        return receipt
      } catch (err: any) {
        const errorMessage = err?.reason || err?.message || 'Transaction failed'
        setError(new Error(errorMessage))
        console.error('Error selling BNB tokens:', err)
        throw err
      } finally {
        setIsLoading(false)
      }
    },
    [signer, account, sellYesForBNB, sellNoForBNB]
  )

  return {
    sellTokens,
    isLoading,
    isSuccess,
    error,
    txHash,
  }
}

/**
 * Hook to estimate sell output for BNB tokens
 */
export function useSellEstimateBNB(marketId: number, tokenAmount: string, isYes: boolean) {
  const { provider } = useWeb3Context()
  const { getSwapMultiplier } = usePredictionMarketBNB()
  const [estimate, setEstimate] = useState<SellEstimate | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const fetchEstimate = useCallback(
    async () => {
      if (!provider || !tokenAmount || parseFloat(tokenAmount) <= 0) {
        setEstimate(null)
        return
      }

      try {
        setIsLoading(true)
        setError(null)

        // Use the hook function to calculate swap multiplier
        const result = await getSwapMultiplier(marketId, tokenAmount, isYes)

        setEstimate({
          tokenOut: result.amountOut,
          fee: result.fee,
          tokenOutWei: ethers.parseEther(result.amountOut),
          feeWei: ethers.parseEther(result.fee),
        })
      } catch (err: any) {
        const errorMessage = err?.reason || err?.message || 'Failed to fetch estimate'
        setError(new Error(errorMessage))
        console.error('Error fetching BNB sell estimate:', err)
      } finally {
        setIsLoading(false)
      }
    },
    [provider, marketId, tokenAmount, isYes, getSwapMultiplier]
  )

  return {
    estimate,
    isLoading,
    error,
    fetchEstimate,
  }
}

/**
 * Hook to get user's BNB token balances
 */
export function useTokenBalanceBNB(marketId: number) {
  const { provider, account } = useWeb3Context()
  const [yesBalance, setYesBalance] = useState<string>('0')
  const [noBalance, setNoBalance] = useState<string>('0')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const fetchBalances = useCallback(
    async () => {
      if (!provider || !account || marketId === undefined) {
        return
      }

      try {
        setIsLoading(true)
        setError(null)

        // Get market to retrieve token addresses
        const PREDICTION_MARKET_ADDRESS = process.env.NEXT_PUBLIC_PREDICTION_MARKET_ADDRESS
        if (!PREDICTION_MARKET_ADDRESS) {
          throw new Error('Contract address not configured')
        }

        const contract = new ethers.Contract(
          PREDICTION_MARKET_ADDRESS,
          [
            'function markets(uint256) view returns (address creator, string memory question, string memory category, uint256 endTime, uint8 status, uint8 outcome, address yesToken, address noToken, uint256 yesPool, uint256 noPool, uint256 lpTotalSupply, uint256 totalBacking, uint256 platformFees, uint256 resolutionRequestedAt, address resolutionRequester, string memory resolutionReason, uint256 resolutionConfidence, uint256 disputeDeadline, address disputer, string memory disputeReason)'
          ],
          provider
        )

        const market = await contract.markets(BigInt(marketId))
        const yesTokenAddress = market[6]
        const noTokenAddress = market[7]

        // Create token contracts (ERC20 ABI)
        const ERC20_ABI = [
          'function balanceOf(address account) view returns (uint256)'
        ]

        const yesTokenContract = new ethers.Contract(yesTokenAddress, ERC20_ABI, provider)
        const noTokenContract = new ethers.Contract(noTokenAddress, ERC20_ABI, provider)

        const yesBalanceWei = await yesTokenContract.balanceOf(account)
        const noBalanceWei = await noTokenContract.balanceOf(account)

        setYesBalance(ethers.formatEther(yesBalanceWei))
        setNoBalance(ethers.formatEther(noBalanceWei))
      } catch (err: any) {
        const errorMessage = err?.reason || err?.message || 'Failed to fetch balances'
        setError(new Error(errorMessage))
        console.error('Error fetching BNB token balances:', err)
      } finally {
        setIsLoading(false)
      }
    },
    [provider, account, marketId]
  )

  return {
    yesBalance,
    noBalance,
    isLoading,
    error,
    fetchBalances,
  }
}

// ==================== PDX SELL TOKENS ====================

export function useSellTokensPDX() {
  const { signer, account } = useWeb3Context()
  const { sellYesForPDX, sellNoForPDX } = usePredictionMarketPDX()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [txHash, setTxHash] = useState<string | null>(null)
  const [isSuccess, setIsSuccess] = useState(false)

  /**
   * Sell YES or NO tokens for PDX
   */
  const sellTokens = useCallback(
    async ({ marketId, tokenAmount, minTokenOut, isYes }: SellTokensParams) => {
      if (!signer || !account) {
        throw new Error('Wallet not connected')
      }

      try {
        setIsLoading(true)
        setError(null)
        setIsSuccess(false)
        setTxHash(null)

        let receipt

        if (isYes) {
          receipt = await sellYesForPDX(marketId, tokenAmount, minTokenOut)
        } else {
          receipt = await sellNoForPDX(marketId, tokenAmount, minTokenOut)
        }

        if (receipt) {
          setTxHash(receipt.transactionHash || 'success')
          setIsSuccess(true)
        } else {
          throw new Error('Transaction failed')
        }

        return receipt
      } catch (err: any) {
        const errorMessage = err?.reason || err?.message || 'Transaction failed'
        setError(new Error(errorMessage))
        console.error('Error selling PDX tokens:', err)
        throw err
      } finally {
        setIsLoading(false)
      }
    },
    [signer, account, sellYesForPDX, sellNoForPDX]
  )

  return {
    sellTokens,
    isLoading,
    isSuccess,
    error,
    txHash,
  }
}

/**
 * Hook to estimate sell output for PDX tokens
 */
export function useSellEstimatePDX(marketId: number, tokenAmount: string, isYes: boolean) {
  const { provider } = useWeb3Context()
  const [estimate, setEstimate] = useState<SellEstimate | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const fetchEstimate = useCallback(
    async () => {
      if (!provider || !tokenAmount || parseFloat(tokenAmount) <= 0) {
        setEstimate(null)
        return
      }

      try {
        setIsLoading(true)
        setError(null)

        // For PDX, you would need to implement similar swap calculation
        // For now, we'll use placeholder until PDX helper view functions are ready
        const dummyResult = {
          amountOut: tokenAmount,
          fee: (parseFloat(tokenAmount) * 0.01).toFixed(4)
        }

        setEstimate({
          tokenOut: dummyResult.amountOut,
          fee: dummyResult.fee,
          tokenOutWei: ethers.parseEther(dummyResult.amountOut),
          feeWei: ethers.parseEther(dummyResult.fee),
        })
      } catch (err: any) {
        const errorMessage = err?.reason || err?.message || 'Failed to fetch estimate'
        setError(new Error(errorMessage))
        console.error('Error fetching PDX sell estimate:', err)
      } finally {
        setIsLoading(false)
      }
    },
    [provider, marketId, tokenAmount, isYes]
  )

  return {
    estimate,
    isLoading,
    error,
    fetchEstimate,
  }
}

/**
 * Hook to get user's PDX token balances
 */
export function useTokenBalancePDX(marketId: number) {
  const { provider, account } = useWeb3Context()
  const [yesBalance, setYesBalance] = useState<string>('0')
  const [noBalance, setNoBalance] = useState<string>('0')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const fetchBalances = useCallback(
    async () => {
      if (!provider || !account || marketId === undefined) {
        return
      }

      try {
        setIsLoading(true)
        setError(null)

        // Get market to retrieve token addresses from PDX adapter
        const DUAL_TOKEN_ADAPTER_ADDRESS = process.env.NEXT_PUBLIC_DUAL_TOKEN_ADAPTER_ADDRESS
        if (!DUAL_TOKEN_ADAPTER_ADDRESS) {
          throw new Error('Contract address not configured')
        }

        const contract = new ethers.Contract(
          DUAL_TOKEN_ADAPTER_ADDRESS,
          [
            'function pdxMarkets(uint256) view returns (address creator, string memory question, string memory category, uint256 endTime, uint8 status, uint8 outcome, address yesToken, address noToken, uint256 yesPool, uint256 noPool, uint256 totalBacking)'
          ],
          provider
        )

        const market = await contract.pdxMarkets(BigInt(marketId))
        const yesTokenAddress = market[6]
        const noTokenAddress = market[7]

        // Create token contracts (ERC20 ABI)
        const ERC20_ABI = [
          'function balanceOf(address account) view returns (uint256)'
        ]

        const yesTokenContract = new ethers.Contract(yesTokenAddress, ERC20_ABI, provider)
        const noTokenContract = new ethers.Contract(noTokenAddress, ERC20_ABI, provider)

        const yesBalanceWei = await yesTokenContract.balanceOf(account)
        const noBalanceWei = await noTokenContract.balanceOf(account)

        setYesBalance(ethers.formatEther(yesBalanceWei))
        setNoBalance(ethers.formatEther(noBalanceWei))
      } catch (err: any) {
        const errorMessage = err?.reason || err?.message || 'Failed to fetch balances'
        setError(new Error(errorMessage))
        console.error('Error fetching PDX token balances:', err)
      } finally {
        setIsLoading(false)
      }
    },
    [provider, account, marketId]
  )

  return {
    yesBalance,
    noBalance,
    isLoading,
    error,
    fetchBalances,
  }
}

// ==================== UNIFIED HOOK (AUTO-DETECT TOKEN) ====================

/**
 * Unified sell tokens hook that automatically uses BNB or PDX based on token
 */
export function useSellTokens(paymentToken: "BNB" | "PDX") {
  const bnbHook = useSellTokensBNB()
  const pdxHook = useSellTokensPDX()

  return paymentToken === "BNB" ? bnbHook : pdxHook
}

/**
 * Unified sell estimate hook that automatically uses BNB or PDX based on token
 */
export function useSellEstimate(
  paymentToken: "BNB" | "PDX",
  marketId: number,
  tokenAmount: string,
  isYes: boolean
) {
  const bnbEstimate = useSellEstimateBNB(marketId, tokenAmount, isYes)
  const pdxEstimate = useSellEstimatePDX(marketId, tokenAmount, isYes)

  return paymentToken === "BNB" ? bnbEstimate : pdxEstimate
}

/**
 * Unified token balance hook that automatically uses BNB or PDX based on token
 */
export function useTokenBalance(paymentToken: "BNB" | "PDX", marketId: number) {
  const bnbBalance = useTokenBalanceBNB(marketId)
  const pdxBalance = useTokenBalancePDX(marketId)

  return paymentToken === "BNB" ? bnbBalance : pdxBalance
}