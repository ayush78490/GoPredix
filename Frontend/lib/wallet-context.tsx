"use client"

import { createContext, useContext, ReactNode } from "react"
import { useWeb3 } from "@/hooks/use-web3"
import { ethers } from "ethers"

interface Web3ContextType {
  provider: ethers.BrowserProvider | ethers.JsonRpcProvider | null
  signer: ethers.Signer | null
  account: string | null
  chainId: number | null
  isConnecting: boolean
  error: string | null
  connectWallet: () => Promise<void>
  disconnectWallet: () => void
  isCorrectNetwork: boolean
  switchNetwork: () => Promise<void>
  isInitialized: boolean
}

const Web3Context = createContext<Web3ContextType | undefined>(undefined)

// ✅ FIXED: Add fallback RPC provider
const BSC_TESTNET_RPC = "https://data-seed-prebsc-1-s1.binance.org:8545"
const BSC_TESTNET_CHAIN_ID = 97

export function Web3Provider({ children }: { children: ReactNode }) {
  const web3 = useWeb3()

  // ✅ FIXED: Ensure provider is always initialized (fallback to RPC)
  const contextValue: Web3ContextType = {
    ...web3,
    provider: web3.provider || new ethers.JsonRpcProvider(BSC_TESTNET_RPC),
  }

  return (
    <Web3Context.Provider value={contextValue}>
      {children}
    </Web3Context.Provider>
  )
}

export function useWeb3Context() {
  const context = useContext(Web3Context)
  if (!context) {
    throw new Error("useWeb3Context must be used within Web3Provider")
  }
  return context
}

// Backward compatibility - if you still use useWallet somewhere
export function useWallet() {
  const { account, connectWallet, disconnectWallet } = useWeb3Context()
  return {
    account,
    isConnected: !!account,
    connect: connectWallet,
    disconnect: disconnectWallet,
    balance: null,
  }
}

// ✅ FIXED: Helper function for getting accounts - better error handling
export const getAccounts = async (): Promise<string[]> => {
  if (typeof window === "undefined" || !window.ethereum) {
    console.warn("⚠️ MetaMask not available")
    return []
  }

  try {
    let provider = window.ethereum as any

    // Handle multiple providers
    if (provider.providers && Array.isArray(provider.providers)) {
      const metamaskProvider = provider.providers.find(
        (p: any) => p.isMetaMask
      )
      provider = metamaskProvider || provider.providers[0]
    }

    if (!provider) {
      console.warn("⚠️ No Ethereum provider found")
      return []
    }

    console.log("🔍 Requesting accounts from provider...")
    const accounts = (await provider.request({
      method: "eth_requestAccounts",
    })) as string[]

    console.log(`✅ Got ${accounts.length} accounts:`, accounts[0])
    return accounts
  } catch (error: any) {
    console.error("❌ Error getting accounts:", error?.message || error)
    return []
  }
}

// ✅ FIXED: Helper for getting Ethereum provider - with fallback
export const getProvider = () => {
  if (typeof window === "undefined") {
    throw new Error("Window object not available (SSR)")
  }

  if (!window.ethereum) {
    console.warn("⚠️ MetaMask not found - using read-only RPC provider")
    return new ethers.JsonRpcProvider(BSC_TESTNET_RPC)
  }

  let provider = window.ethereum as any

  // Handle multiple providers (MetaMask might be one of several)
  if (provider.providers && Array.isArray(provider.providers)) {
    const metamaskProvider = provider.providers.find(
      (p: any) => p.isMetaMask
    )
    provider = metamaskProvider || provider.providers[0]
  }

  if (!provider) {
    console.warn("⚠️ No suitable provider found - using RPC")
    return new ethers.JsonRpcProvider(BSC_TESTNET_RPC)
  }

  return provider
}

// ✅ NEW: Helper to get or create provider
export const getOrCreateProvider = async (): Promise<ethers.BrowserProvider | ethers.JsonRpcProvider> => {
  try {
    if (typeof window === "undefined" || !window.ethereum) {
      console.log("📡 Using read-only RPC provider")
      return new ethers.JsonRpcProvider(BSC_TESTNET_RPC)
    }

    const ethereumProvider = getProvider()
    const browserProvider = new ethers.BrowserProvider(ethereumProvider)

    console.log("✅ Created BrowserProvider from MetaMask")
    return browserProvider
  } catch (error) {
    console.warn("⚠️ Failed to create BrowserProvider, using RPC:", error)
    return new ethers.JsonRpcProvider(BSC_TESTNET_RPC)
  }
}

// ✅ NEW: Helper to get signer (if wallet connected)
export const getSigner = async (provider: ethers.BrowserProvider | ethers.JsonRpcProvider): Promise<ethers.Signer | null> => {
  try {
    if (provider instanceof ethers.JsonRpcProvider) {
      console.log("ℹ️ Read-only provider - no signer available")
      return null
    }

    const signer = await provider.getSigner()
    const address = await signer.getAddress()
    console.log("✅ Got signer for address:", address)
    return signer
  } catch (error) {
    console.warn("⚠️ Failed to get signer:", error)
    return null
  }
}

// ✅ NEW: Helper to check if on correct network
export const checkNetwork = async (provider: ethers.BrowserProvider): Promise<boolean> => {
  try {
    const network = await provider.getNetwork()
    const isCorrect = Number(network.chainId) === BSC_TESTNET_CHAIN_ID

    console.log("🌐 Network check:", {
      chainId: network.chainId.toString(),
      name: network.name,
      isCorrect,
    })

    return isCorrect
  } catch (error) {
    console.error("❌ Failed to check network:", error)
    return false
  }
}

// ✅ NEW: Helper to switch network
export const switchToBSCTestnet = async (): Promise<boolean> => {
  try {
    if (typeof window === "undefined" || !window.ethereum) {
      throw new Error("MetaMask not available")
    }

    const provider = getProvider()

    await provider.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: "0x61" }], // 0x61 = 97 in hex
    })

    console.log("✅ Switched to BSC Testnet")
    return true
  } catch (error: any) {
    if (error.code === 4902) {
      // Chain not added yet
      console.log("📝 Adding BSC Testnet to wallet...")
      try {
        const provider = getProvider()
        await provider.request({
          method: "wallet_addEthereumChain",
          params: [
            {
              chainId: "0x61",
              chainName: "BSC Testnet",
              rpcUrls: [BSC_TESTNET_RPC],
              nativeCurrency: {
                name: "BNB",
                symbol: "BNB",
                decimals: 18,
              },
              blockExplorerUrls: ["https://testnet.bscscan.com"],
            },
          ],
        })
        console.log("✅ Added BSC Testnet")
        return true
      } catch (addError) {
        console.error("❌ Failed to add network:", addError)
        return false
      }
    } else {
      console.error("❌ Failed to switch network:", error?.message)
      return false
    }
  }
}

// Declare ethereum type globally
declare global {
  interface Window {
    ethereum?: any
  }
}