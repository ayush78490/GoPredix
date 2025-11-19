"use client"

import { createContext, useContext, ReactNode, useState, useEffect } from "react"
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
  isMobile: boolean
  detectedWallet: string | null
  connectWithDeepLink: (wallet?: string) => Promise<void>
  showWalletSelector: boolean
  setShowWalletSelector: (show: boolean) => void
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

// ✅ NEW: Mobile wallet deep link configurations
const MOBILE_WALLETS = {
  METAMASK: {
    name: "MetaMask",
    android: "https://metamask.app.link/dapp/",
    ios: "https://metamask.app.link/dapp/",
    package: {
      android: "io.metamask",
      ios: "id1438144202"
    },
    icon: ""
  },
  TRUSTWALLET: {
    name: "Trust Wallet",
    android: "https://link.trustwallet.com/dapp/",
    ios: "https://link.trustwallet.com/dapp/",
    package: {
      android: "com.wallet.crypto.trustapp",
      ios: "id1288339409"
    },
    icon: ""
  },
  BINANCE: {
    name: "Binance Wallet",
    android: "bnc://app.binance.com/dapp/",
    ios: "bnc://app.binance.com/dapp/",
    package: {
      android: "com.binance.dev",
      ios: "id1436799971"
    },
    icon: ""
  },
  SAFEPAL: {
    name: "SafePal",
    android: "sfp://external/dapp?url=",
    ios: "safepal://dapp?url=",
    package: {
      android: "com.binance.dev",
      ios: "id1548297139"
    },
    icon: ""
  }
} as const

export function Web3Provider({ children }: { children: ReactNode }) {
  const web3 = useWeb3()
  const [isMobile, setIsMobile] = useState(false)
  const [detectedWallet, setDetectedWallet] = useState<string | null>(null)
  const [showWalletSelector, setShowWalletSelector] = useState(false)

  // ✅ NEW: Detect mobile device and installed wallets
  useEffect(() => {
    const detectDeviceAndWallets = () => {
      // Detect mobile device
      const mobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent
      )
      setIsMobile(mobile)

      if (mobile) {
        // Try to detect installed wallet apps
        detectInstalledWallet()
      }
    }

    detectDeviceAndWallets()
  }, [])

  // ✅ NEW: Detect installed mobile wallets
  const detectInstalledWallet = async () => {
    if (typeof window === "undefined") return

    const userAgent = navigator.userAgent.toLowerCase()
    
    // Check for MetaMask
    if (userAgent.includes('metamask')) {
      setDetectedWallet('METAMASK')
    } 
    // Check for Trust Wallet
    else if (userAgent.includes('trust')) {
      setDetectedWallet('TRUSTWALLET')
    }
    // Check for Binance Wallet
    else if (userAgent.includes('binance')) {
      setDetectedWallet('BINANCE')
    }
    // Check for SafePal
    else if (userAgent.includes('safepal')) {
      setDetectedWallet('SAFEPAL')
    }
    // Fallback: Check if MetaMask is installed via timeout method
    else {
      const metamaskDetected = await checkWalletInstalled('METAMASK')
      if (metamaskDetected) {
        setDetectedWallet('METAMASK')
      }
    }
  }

  // ✅ NEW: Check if specific wallet is installed
  const checkWalletInstalled = async (wallet: string): Promise<boolean> => {
    return new Promise((resolve) => {
      if (typeof window === "undefined") {
        resolve(false)
        return
      }

      const walletConfig = MOBILE_WALLETS[wallet as keyof typeof MOBILE_WALLETS]
      if (!walletConfig) {
        resolve(false)
        return
      }

      const iframe = document.createElement('iframe')
      iframe.src = `${walletConfig.android}://`
      iframe.style.display = 'none'
      
      document.body.appendChild(iframe)
      
      setTimeout(() => {
        document.body.removeChild(iframe)
        resolve(true)
      }, 2000)

      // If the iframe fails to load quickly, the app is probably not installed
      iframe.onerror = () => {
        document.body.removeChild(iframe)
        resolve(false)
      }
    })
  }

  // ✅ NEW: Connect with deep link for mobile wallets
  const connectWithDeepLink = async (wallet?: string) => {
    try {
      if (typeof window === "undefined") {
        throw new Error("Window not available")
      }

      const targetWallet = wallet || detectedWallet || 'METAMASK'
      const walletConfig = MOBILE_WALLETS[targetWallet as keyof typeof MOBILE_WALLETS]
      
      if (!walletConfig) {
        throw new Error(`Wallet ${targetWallet} not supported`)
      }

      const currentUrl = encodeURIComponent(window.location.href)
      let deepLinkUrl = ''

      // Determine the correct deep link based on platform
      if (/iPhone|iPad|iPod/i.test(navigator.userAgent)) {
        deepLinkUrl = `${walletConfig.ios}${currentUrl}`
      } else {
        deepLinkUrl = `${walletConfig.android}${currentUrl}`
      }

      console.log(`🔗 Opening ${walletConfig.name} via deep link:`, deepLinkUrl)

      // Try to open the deep link
      window.location.href = deepLinkUrl

      // Fallback: Open app store if deep link fails
      setTimeout(() => {
        if (document.hasFocus()) {
          // Deep link failed, redirect to app store
          const storeUrl = /iPhone|iPad|iPod/i.test(navigator.userAgent)
            ? `https://apps.apple.com/app/${walletConfig.package.ios}`
            : `https://play.google.com/store/apps/details?id=${walletConfig.package.android}`
          
          window.location.href = storeUrl
        }
      }, 500)

    } catch (error) {
      console.error("❌ Deep link connection failed:", error)
      throw error
    }
  }

  // ✅ NEW: Enhanced connectWallet that handles mobile deep linking
  const enhancedConnectWallet = async () => {
    // If mobile and no injected provider, show wallet selector
    if (isMobile && !window.ethereum) {
      console.log("📱 Mobile device detected, showing wallet selector...")
      setShowWalletSelector(true)
      return
    }

    // Use existing web3 connection for desktop or mobile with injected provider
    await web3.connectWallet()
  }

  const contextValue: Web3ContextType = {
    ...web3,
    provider: web3.provider || new ethers.JsonRpcProvider(BSC_TESTNET_RPC),
    connectWallet: enhancedConnectWallet,
    isMobile,
    detectedWallet,
    connectWithDeepLink,
    showWalletSelector,
    setShowWalletSelector,
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

// ✅ NEW: Mobile Wallet Selector Component
export function MobileWalletSelector() {
  const { 
    isMobile, 
    connectWithDeepLink, 
    setShowWalletSelector,
    showWalletSelector 
  } = useWeb3Context()

  if (!showWalletSelector || !isMobile) return null

  const wallets = Object.entries(MOBILE_WALLETS).map(([key, wallet]) => ({
    id: key,
    ...wallet
  }))

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-cyan-900 rounded-2xl p-6 max-w-md w-full">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Choose Your Wallet</h3>
          <button 
            onClick={() => setShowWalletSelector(false)}
            className="text-white hover:text-gray-700"
          >
            ✕
          </button>
        </div>
        
        <p className="text-white mb-4">
          Select your preferred wallet to connect:
        </p>
        
        <div className="space-y-3">
          {wallets.map((wallet) => (
            <button
              key={wallet.id}
              onClick={() => {
                connectWithDeepLink(wallet.id)
                setShowWalletSelector(false)
              }}
              className="w-full flex items-center gap-4 p-4 border border-cyan-300 rounded-xl hover:bg-gray-50 transition-colors text-left"
            >
              <span className="text-2xl">{wallet.icon}</span>
              <div className="flex flex-col items-center ">
                <div className="font-medium text-cyan-200 flex items-center justify-center">{wallet.name}</div>
                <div className="text-sm text-gray-500 items-center justify-center">Mobile App</div>
              </div>
            </button>
          ))}
        </div>

        <div className="mt-4 text-center">
          <button 
            onClick={() => setShowWalletSelector(false)}
            className="text-white hover:text-gray-700 text-sm"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

// ✅ NEW: Universal wallet connection function with mobile support
export const universalConnectWallet = async (options?: {
  wallet?: string
  mobileOnly?: boolean
}): Promise<{
  success: boolean
  account?: string
  error?: string
  method?: 'injected' | 'deep_link'
}> => {
  try {
    if (typeof window === "undefined") {
      return { success: false, error: "Window not available" }
    }

    const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    )

    // If mobile and no injected provider, use deep linking
    if (isMobileDevice && (!window.ethereum || options?.mobileOnly)) {
      console.log("📱 Mobile deep link connection...")
      
      const walletConfig = MOBILE_WALLETS[options?.wallet as keyof typeof MOBILE_WALLETS] || MOBILE_WALLETS.METAMASK
      const currentUrl = encodeURIComponent(window.location.href)
      
      let deepLinkUrl = ''
      if (/iPhone|iPad|iPod/i.test(navigator.userAgent)) {
        deepLinkUrl = `${walletConfig.ios}${currentUrl}`
      } else {
        deepLinkUrl = `${walletConfig.android}${currentUrl}`
      }

      console.log(`🔗 Opening ${walletConfig.name}:`, deepLinkUrl)
      window.location.href = deepLinkUrl

      return { 
        success: true, 
        method: 'deep_link',
        account: undefined 
      }
    }

    // Standard connection for desktop or mobile with injected provider
    console.log("💻 Standard connection...")
    return {
      ...await connectWalletWithNetworkCheck(),
      method: 'injected'
    }

  } catch (error: any) {
    console.error("❌ Universal connection failed:", error)
    return { 
      success: false, 
      error: error?.message || "Connection failed",
      method: 'injected'
    }
  }
}

// ✅ UPDATED: Enhanced connectWallet function with mobile detection
export const connectWalletWithNetworkCheck = async (): Promise<{
  success: boolean
  account?: string
  error?: string
}> => {
  try {
    if (typeof window === "undefined") {
      return { success: false, error: "Window not available" }
    }

    // Check if mobile and no provider - suggest deep linking
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    )

    if (isMobile && !window.ethereum) {
      return { 
        success: false, 
        error: "No wallet detected. Please use the mobile wallet browser or install a Web3 wallet." 
      }
    }

    const provider = getProvider()
    
    // Rest of the existing connection logic...
    console.log("🔍 Requesting accounts...")
    const accounts = await provider.request({
      method: "eth_requestAccounts",
    })

    if (!accounts || accounts.length === 0) {
      return { success: false, error: "No accounts found" }
    }

    const account = accounts[0]
    console.log("✅ Connected account:", account)

    // Network check logic...
    const chainId = await provider.request({ method: "eth_chainId" })
    console.log("🌐 Current chain ID:", chainId)

    const isCorrectNetwork = chainId === BSC_TESTNET_CONFIG.chainId

    if (!isCorrectNetwork) {
      console.log("🔄 Wrong network detected, prompting to switch...")
      
      const switchResult = await switchToBSCTestnet()
      
      if (!switchResult) {
        return { 
          success: false, 
          error: "Please switch to BNB Smart Chain Testnet to continue" 
        }
      }
    }

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