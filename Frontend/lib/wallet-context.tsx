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

// ✅ UPDATED: Official BSC Testnet RPC URL
const BSC_TESTNET_RPC = "https://bsc-testnet.publicnode.com"
const BSC_TESTNET_CHAIN_ID = 97

// ✅ UPDATED: Official BSC Testnet configuration
const BSC_TESTNET_CONFIG = {
  chainId: "0x61", // 97 in hex
  chainName: "BNB Smart Chain Testnet",
  rpcUrls: ["https://bsc-testnet.publicnode.com"],
  nativeCurrency: {
    name: "tBNB",
    symbol: "tBNB",
    decimals: 18,
  },
  blockExplorerUrls: ["https://testnet.bscscan.com"],
}

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

// ✅ UPDATED: Enhanced connectWallet function with automatic network checking
export const connectWalletWithNetworkCheck = async (): Promise<{
  success: boolean
  account?: string
  error?: string
}> => {
  try {
    if (typeof window === "undefined" || !window.ethereum) {
      return { success: false, error: "MetaMask not installed" }
    }

    const provider = getProvider()
    
    // 1. Request accounts first
    console.log("🔍 Requesting accounts...")
    const accounts = await provider.request({
      method: "eth_requestAccounts",
    })

    if (!accounts || accounts.length === 0) {
      return { success: false, error: "No accounts found" }
    }

    const account = accounts[0]
    console.log("✅ Connected account:", account)

    // 2. Check current network
    const chainId = await provider.request({ method: "eth_chainId" })
    console.log("🌐 Current chain ID:", chainId)

    const isCorrectNetwork = chainId === BSC_TESTNET_CONFIG.chainId

    if (!isCorrectNetwork) {
      console.log("🔄 Wrong network detected, prompting to switch...")
      
      // 3. If wrong network, prompt user to switch
      const switchResult = await switchToBSCTestnet()
      
      if (!switchResult) {
        return { 
          success: false, 
          error: "Please switch to BNB Smart Chain Testnet to continue" 
        }
      }
    }

    // 4. Double check network after potential switch
    const finalChainId = await provider.request({ method: "eth_chainId" })
    const finalIsCorrectNetwork = finalChainId === BSC_TESTNET_CONFIG.chainId

    if (!finalIsCorrectNetwork) {
      return { 
        success: false, 
        error: "Please switch to BNB Smart Chain Testnet to continue" 
      }
    }

    console.log("🎉 Wallet connected successfully on BNB Smart Chain Testnet")
    return { success: true, account }

  } catch (error: any) {
    console.error("❌ Connection failed:", error)
    
    if (error.code === 4001) {
      return { success: false, error: "Connection rejected by user" }
    } else if (error.code === -32002) {
      return { success: false, error: "Connection request already pending" }
    }
    
    return { success: false, error: error?.message || "Failed to connect wallet" }
  }
}

// ✅ UPDATED: Enhanced network switching with official configuration
export const switchToBSCTestnet = async (): Promise<boolean> => {
  try {
    if (typeof window === "undefined" || !window.ethereum) {
      throw new Error("MetaMask not available")
    }

    const provider = getProvider()

    console.log("🔄 Attempting to switch to BNB Smart Chain Testnet...")
    
    try {
      // First try to switch
      await provider.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: BSC_TESTNET_CONFIG.chainId }],
      })

      console.log("✅ Successfully switched to BNB Smart Chain Testnet")
      return true
    } catch (switchError: any) {
      // If chain is not added, add it with official configuration
      if (switchError.code === 4902) {
        console.log("📝 Adding BNB Smart Chain Testnet to wallet...")
        
        try {
          await provider.request({
            method: "wallet_addEthereumChain",
            params: [BSC_TESTNET_CONFIG],
          })
          
          console.log("✅ Successfully added BNB Smart Chain Testnet")
          return true
        } catch (addError: any) {
          console.error("❌ Failed to add network:", addError)
          
          if (addError.code === 4001) {
            throw new Error("Network addition rejected by user")
          }
          
          throw new Error(`Failed to add network: ${addError.message}`)
        }
      } else if (switchError.code === 4001) {
        throw new Error("Network switch rejected by user")
      } else {
        throw new Error(`Failed to switch network: ${switchError.message}`)
      }
    }
  } catch (error: any) {
    console.error("❌ Network switch failed:", error)
    throw error
  }
}

// ✅ NEW: Function to manually check and prompt network switch
export const ensureCorrectNetwork = async (): Promise<boolean> => {
  try {
    if (typeof window === "undefined" || !window.ethereum) {
      return false
    }

    const provider = getProvider()
    const chainId = await provider.request({ method: "eth_chainId" })
    
    console.log("🔍 Checking network...", { currentChainId: chainId, requiredChainId: BSC_TESTNET_CONFIG.chainId })
    
    if (chainId === BSC_TESTNET_CONFIG.chainId) {
      console.log("✅ Already on BNB Smart Chain Testnet")
      return true
    }

    // If wrong network, prompt to switch
    console.log("🔄 Wrong network, prompting switch...")
    const result = await switchToBSCTestnet()
    return result
    
  } catch (error) {
    console.error("❌ Network check failed:", error)
    return false
  }
}

// ✅ NEW: Function to get current network info
export const getCurrentNetwork = async (): Promise<{
  chainId: string
  isCorrectNetwork: boolean
  networkName?: string
}> => {
  try {
    if (typeof window === "undefined" || !window.ethereum) {
      return { chainId: "", isCorrectNetwork: false }
    }

    const provider = getProvider()
    const chainId = await provider.request({ method: "eth_chainId" })
    
    return {
      chainId,
      isCorrectNetwork: chainId === BSC_TESTNET_CONFIG.chainId,
      networkName: chainId === BSC_TESTNET_CONFIG.chainId ? "BNB Smart Chain Testnet" : "Unknown Network"
    }
  } catch (error) {
    console.error("❌ Failed to get network info:", error)
    return { chainId: "", isCorrectNetwork: false }
  }
}

// Backward compatibility - if you still use useWallet somewhere
export function useWallet() {
  const { account, connectWallet, disconnectWallet, isCorrectNetwork } = useWeb3Context()
  return {
    account,
    isConnected: !!account,
    isCorrectNetwork,
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
    const provider = getProvider()

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

// ✅ UPDATED: Helper to check if on correct network
export const checkNetwork = async (provider: ethers.BrowserProvider): Promise<boolean> => {
  try {
    const network = await provider.getNetwork()
    const isCorrect = Number(network.chainId) === BSC_TESTNET_CHAIN_ID

    console.log("🌐 Network check:", {
      chainId: network.chainId.toString(),
      name: network.name,
      isCorrect,
      requiredChainId: BSC_TESTNET_CHAIN_ID
    })

    return isCorrect
  } catch (error) {
    console.error("❌ Failed to check network:", error)
    return false
  }
}

// Declare ethereum type globally
declare global {
  interface Window {
    ethereum?: any
  }
}