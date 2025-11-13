"use client";

import { createContext, useContext, ReactNode, useEffect, useState } from "react";
import { useWeb3 } from "@/hooks/use-web3";
import { ethers } from "ethers";
import { 
  useAccount, 
  useConnect, 
  useDisconnect, 
  useChainId,
  useConfig 
} from 'wagmi';

interface Web3ContextType {
  provider: ethers.BrowserProvider | null;
  signer: ethers.Signer | null;
  account: string | null;
  chainId: number | null;
  isConnecting: boolean;
  error: string | null;
  connectWallet: () => Promise<void>;
  disconnectWallet: () => void;
  isCorrectNetwork: boolean;
  switchNetwork: () => Promise<void>;
  isInitialized: boolean;
  // RainbowKit integration
  isConnected: boolean;
  openConnectModal?: () => void;
}

const Web3Context = createContext<Web3ContextType | undefined>(undefined);

export function Web3Provider({ children }: { children: ReactNode }) {
  // Existing web3 hook
  const web3 = useWeb3();
  
  // RainbowKit hooks
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const chainId = useChainId();
  const { connectAsync, connectors, status: connectStatus } = useConnect();

  // State to sync between legacy and RainbowKit
  const [rainbowKitAccount, setRainbowKitAccount] = useState<string | null>(null);
  const [isRainbowKitConnecting, setIsRainbowKitConnecting] = useState(false);

  // Sync account between legacy and RainbowKit
  useEffect(() => {
    if (isConnected && address) {
      setRainbowKitAccount(address);
      // If RainbowKit is connected but legacy system isn't, sync the state
      if (!web3.account) {
        // You might want to trigger legacy connection here if needed
        console.log('RainbowKit connected:', address);
      }
    } else {
      setRainbowKitAccount(null);
    }
  }, [isConnected, address, web3.account]);

  // Enhanced connectWallet that works with both systems
  const connectWallet = async () => {
    // This will be overridden by the Header component with RainbowKit's modal
    // For backward compatibility, we'll try the legacy method first
    try {
      setIsRainbowKitConnecting(true);
      await web3.connectWallet();
    } catch (error) {
      console.error('Legacy connection failed:', error);
      // Fallback to RainbowKit if available
      if (typeof window !== 'undefined' && (window as any).rainbowKitConnect) {
        (window as any).rainbowKitConnect();
      }
    } finally {
      setIsRainbowKitConnecting(false);
    }
  };

  // Enhanced disconnect that works with both systems
  const disconnectWallet = () => {
    // Disconnect from both systems
    web3.disconnectWallet();
    disconnect();
    setRainbowKitAccount(null);
  };

  // Determine which account to use (RainbowKit takes precedence)
  const finalAccount = rainbowKitAccount || web3.account;
  const finalChainId = chainId || web3.chainId;
  const finalIsConnecting = web3.isConnecting || isRainbowKitConnecting || connectStatus === 'pending';

  const contextValue: Web3ContextType = {
    ...web3,
    // Override with RainbowKit values when available
    account: finalAccount,
    chainId: finalChainId,
    isConnecting: finalIsConnecting,
    connectWallet,
    disconnectWallet,
    // RainbowKit specific
    isConnected: isConnected || !!web3.account,
  };

  return (
    <Web3Context.Provider value={contextValue}>
      {children}
    </Web3Context.Provider>
  );
}

export function useWeb3Context() {
  const context = useContext(Web3Context);
  if (!context) {
    throw new Error("useWeb3Context must be used within Web3Provider");
  }
  return context;
}

// Backward compatibility - if you still use useWallet somewhere
export function useWallet() {
  const { account, connectWallet, disconnectWallet, isConnected } = useWeb3Context();
  return {
    account,
    isConnected: isConnected || !!account,
    connect: connectWallet,
    disconnect: disconnectWallet,
    balance: null, // If needed, calculate from provider
  };
}

// Helper function for getting accounts (updated to work with both)
export const getAccounts = async (): Promise<string[]> => {
  if (typeof window === "undefined") return [];

  try {
    // Try RainbowKit first if available
    if ((window as any).ethereum) {
      let provider = (window as any).ethereum;
      if (provider.providers && Array.isArray(provider.providers)) {
        const metamaskProvider = provider.providers.find(
          (p: any) => p.isMetaMask
        );
        provider = metamaskProvider || provider.providers[0];
      }
      const accounts = (await provider.request({
        method: "eth_requestAccounts",
      })) as string[];
      return accounts;
    }
    
    return [];
  } catch (error) {
    console.error("Error getting accounts:", error);
    return [];
  }
};

// Helper for getting Ethereum provider (updated)
export const getProvider = () => {
  if (typeof window === "undefined" || !(window as any).ethereum) {
    throw new Error("Ethereum provider not found");
  }

  let provider = (window as any).ethereum;
  if (provider.providers && Array.isArray(provider.providers)) {
    const metamaskProvider = provider.providers.find(
      (p: any) => p.isMetaMask
    );
    provider = metamaskProvider || provider.providers[0];
  }

  return provider;
};

// Legacy provider creation for backward compatibility
export const createLegacyProvider = () => {
  if (typeof window !== "undefined" && (window as any).ethereum) {
    return new ethers.BrowserProvider(getProvider());
  }
  return null;
};