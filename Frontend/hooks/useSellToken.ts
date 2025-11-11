import { useState, useCallback } from 'react';
import { ethers } from 'ethers';
import { useWeb3Context } from '@/lib/wallet-context';
import contractABI from '@/contracts/abi.json';

const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS as string;

interface SellTokensParams {
  marketId: number;
  tokenAmount: string; // Amount in ether format (e.g., "1.5")
  minBNBOut: string; // Minimum BNB to receive in ether format
  isYes: boolean; // true for YES tokens, false for NO tokens
}

interface SellEstimate {
  bnbOut: string;
  fee: string;
  bnbOutWei: bigint;
  feeWei: bigint;
}

export function useSellTokens() {
  const { signer, account } = useWeb3Context();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  /**
   * Sell YES or NO tokens for BNB
   */
  const sellTokens = useCallback(
    async ({ marketId, tokenAmount, minBNBOut, isYes }: SellTokensParams) => {
      if (!signer || !account) {
        throw new Error('Wallet not connected');
      }

      try {
        setIsLoading(true);
        setError(null);
        setIsSuccess(false);
        setTxHash(null);

        const contract = new ethers.Contract(CONTRACT_ADDRESS, contractABI, signer);

        const tokenAmountWei = ethers.parseEther(tokenAmount);
        const minBNBOutWei = ethers.parseEther(minBNBOut);

        const functionName = isYes ? 'sellYesForBNB' : 'sellNoForBNB';

        const tx = await contract[functionName](marketId, tokenAmountWei, minBNBOutWei);
        setTxHash(tx.hash);

        const receipt = await tx.wait();
        
        if (receipt.status === 1) {
          setIsSuccess(true);
        } else {
          throw new Error('Transaction failed');
        }

        return receipt;
      } catch (err: any) {
        const errorMessage = err?.reason || err?.message || 'Transaction failed';
        setError(new Error(errorMessage));
        console.error('Error selling tokens:', err);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [signer, account]
  );

  return {
    sellTokens,
    isLoading,
    isSuccess,
    error,
    txHash,
  };
}

/**
 * Hook to estimate sell output for tokens
 */
export function useSellEstimate(marketId: number, tokenAmount: string, isYes: boolean) {
  const { provider } = useWeb3Context();
  const [estimate, setEstimate] = useState<SellEstimate | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchEstimate = useCallback(
    async () => {
      if (!provider || !tokenAmount || parseFloat(tokenAmount) <= 0) {
        setEstimate(null);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        const contract = new ethers.Contract(CONTRACT_ADDRESS, contractABI, provider);

        const tokenAmountWei = ethers.parseEther(tokenAmount);

        const functionName = isYes ? 'getSellYesOutput' : 'getSellNoOutput';
        const result = await contract[functionName](marketId, tokenAmountWei);

        const [bnbOut, fee] = result;

        setEstimate({
          bnbOut: ethers.formatEther(bnbOut),
          fee: ethers.formatEther(fee),
          bnbOutWei: bnbOut,
          feeWei: fee,
        });
      } catch (err: any) {
        const errorMessage = err?.reason || err?.message || 'Failed to fetch estimate';
        setError(new Error(errorMessage));
        console.error('Error fetching sell estimate:', err);
      } finally {
        setIsLoading(false);
      }
    },
    [provider, marketId, tokenAmount, isYes]
  );

  return {
    estimate,
    isLoading,
    error,
    fetchEstimate,
  };
}

/**
 * Hook to get user's token balances
 */
export function useTokenBalance(marketId: number) {
  const { provider, account } = useWeb3Context();
  const [yesBalance, setYesBalance] = useState<string>('0');
  const [noBalance, setNoBalance] = useState<string>('0');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchBalances = useCallback(
    async () => {
      if (!provider || !account || marketId === undefined) {
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        const contract = new ethers.Contract(CONTRACT_ADDRESS, contractABI, provider);

        // Get market info to get token addresses
        const marketInfo = await contract.getMarket(marketId);
        const [creator, question, category, endTime, status, outcome, yesPool, noPool, totalBacking] = marketInfo;

        // Get YES token address
        const market = await contract.markets(marketId);
        const yesTokenAddress = market.yesToken;
        const noTokenAddress = market.noToken;

        // Create token contracts
        const yesTokenContract = new ethers.Contract(
          yesTokenAddress,
          [
            'function balanceOf(address) view returns (uint256)',
          ],
          provider
        );

        const noTokenContract = new ethers.Contract(
          noTokenAddress,
          [
            'function balanceOf(address) view returns (uint256)',
          ],
          provider
        );

        const yesBalanceWei = await yesTokenContract.balanceOf(account);
        const noBalanceWei = await noTokenContract.balanceOf(account);

        setYesBalance(ethers.formatEther(yesBalanceWei));
        setNoBalance(ethers.formatEther(noBalanceWei));
      } catch (err: any) {
        const errorMessage = err?.reason || err?.message || 'Failed to fetch balances';
        setError(new Error(errorMessage));
        console.error('Error fetching token balances:', err);
      } finally {
        setIsLoading(false);
      }
    },
    [provider, account, marketId]
  );

  return {
    yesBalance,
    noBalance,
    isLoading,
    error,
    fetchBalances,
  };
}