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
  showNetworkSelector: boolean
  setShowNetworkSelector: (show: boolean) => void
  currentNetwork: string | null
  networkError: string | null
}

const Web3Context = createContext<Web3ContextType | undefined>(undefined)

const BSC_TESTNET_RPC = "https://bsc-testnet.publicnode.com"
const BSC_TESTNET_CHAIN_ID = 97

const BSC_TESTNET_CONFIG = {
  chainId: "0x61",
  chainName: "BNB Smart Chain Testnet",
  rpcUrls: ["https://bsc-testnet.publicnode.com"],
  nativeCurrency: {
    name: "tBNB",
    symbol: "tBNB",
    decimals: 18,
  },
  blockExplorerUrls: ["https://testnet.bscscan.com"],
}

interface NetworkConfig {
  id: string
  name: string
  chainId: string
  chainIdDecimal: number
  rpcUrl: string
  currency: string
  explorer: string
  icon: string
  isRecommended: boolean
}

const SUPPORTED_NETWORKS = {
  BSC_TESTNET: {
    id: "bsc-testnet",
    name: "BNB Smart Chain Testnet",
    chainId: "0x61",
    chainIdDecimal: 97,
    rpcUrl: "https://bsc-testnet.publicnode.com",
    currency: "tBNB",
    explorer: "https://testnet.bscscan.com",
    icon: "🟡",
    isRecommended: true
  },
  BSC_MAINNET: {
    id: "bsc-mainnet",
    name: "BNB Smart Chain Mainnet",
    chainId: "0x38",
    chainIdDecimal: 56,
    rpcUrl: "https://bsc-dataseed.binance.org/",
    currency: "BNB",
    explorer: "https://bscscan.com",
    icon: "🟡",
    isRecommended: false
  },
  ETHEREUM_MAINNET: {
    id: "ethereum-mainnet",
    name: "Ethereum Mainnet",
    chainId: "0x1",
    chainIdDecimal: 1,
    rpcUrl: "https://mainnet.infura.io/v3/",
    currency: "ETH",
    explorer: "https://etherscan.io",
    icon: "🔷",
    isRecommended: false
  },
  POLYGON_MAINNET: {
    id: "polygon-mainnet",
    name: "Polygon Mainnet",
    chainId: "0x89",
    chainIdDecimal: 137,
    rpcUrl: "https://polygon-rpc.com/",
    currency: "MATIC",
    explorer: "https://polygonscan.com",
    icon: "🟣",
    isRecommended: false
  }
} as const

const MOBILE_WALLETS = {
  METAMASK: {
    name: "MetaMask",
    android: "https://metamask.app.link/dapp/",
    ios: "https://metamask.app.link/dapp/",
    package: {
      android: "io.metamask",
      ios: "id1438144202"
    },
    icon: "🔷"
  },
  TRUSTWALLET: {
    name: "Trust Wallet",
    android: "https://link.trustwallet.com/open_url?url=",
    ios: "https://link.trustwallet.com/open_url?url=",
    package: {
      android: "com.wallet.crypto.trustapp",
      ios: "id1288339409"
    },
    icon: "🔶"
  },
  BINANCE: {
    name: "Binance Wallet",
    android: "bnc://app.binance.com/mp/app?appId=",
    ios: "bnc://app.binance.com/mp/app?appId=",
    package: {
      android: "com.binance.dev",
      ios: "id1436799971"
    },
    icon: "🟡"
  },
  SAFEPAL: {
    name: "SafePal",
    android: "safepal-wc://wc?uri=",
    ios: "safepal-wc://wc?uri=",
    package: {
      android: "io.safepal.wallet",
      ios: "id1548297139"
    },
    icon: "🟣"
  }
} as const

// Set your local development IP and port here for deep linking in mobile
const LOCAL_DEV_IP_PORT = "www.gopredix.xyz";

export function Web3Provider({ children }: { children: ReactNode }) {
  const web3 = useWeb3()
  const [isMobile, setIsMobile] = useState(false)
  const [detectedWallet, setDetectedWallet] = useState<string | null>(null)
  const [showWalletSelector, setShowWalletSelector] = useState(false)
  const [showNetworkSelector, setShowNetworkSelector] = useState(false)
  const [currentNetwork, setCurrentNetwork] = useState<string | null>(null)
  const [networkError, setNetworkError] = useState<string | null>(null)
  const [hasCleanedUrl, setHasCleanedUrl] = useState(false)

  // Clean URL query parameters immediately on mount
  useEffect(() => {
    if (typeof window === "undefined" || hasCleanedUrl) return;
    const url = new URL(window.location.href);
    const hasDeepLinkParams = url.searchParams.has('fromDeepLink') || url.searchParams.has('wallet');
    if (hasDeepLinkParams) {
      console.log("🧹 Cleaning deep link parameters immediately...");
      url.searchParams.delete('fromDeepLink');
      url.searchParams.delete('wallet');
      window.history.replaceState({}, '', url.toString());
      setHasCleanedUrl(true);
    }
  }, [hasCleanedUrl])

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    );
    setIsMobile(mobile);

    if (mobile) {
      detectInstalledWallet();
    }
  }, [])

  useEffect(() => {
    if (typeof window !== "undefined" && window.ethereum) {
      const handleChainChanged = (chainId: string) => {
        console.log("🔄 Chain changed:", chainId)
        checkNetworkStatus(chainId)
        window.location.reload()
      }
      const handleAccountsChanged = (accounts: string[]) => {
        console.log("👤 Accounts changed:", accounts)
        if (accounts.length === 0) {
          web3.disconnectWallet()
        } else {
          window.location.reload()
        }
      }
      window.ethereum.on('chainChanged', handleChainChanged)
      window.ethereum.on('accountsChanged', handleAccountsChanged)
      if (web3.account) checkCurrentNetwork()
      return () => {
        if (window.ethereum?.removeListener) {
          window.ethereum.removeListener('chainChanged', handleChainChanged)
          window.ethereum.removeListener('accountsChanged', handleAccountsChanged)
        }
      }
    }
  }, [web3.account])

  const checkCurrentNetwork = async () => {
    if (typeof window === "undefined" || !window.ethereum) return
    try {
      const provider = getProvider()
      const chainId = await provider.request({ method: "eth_chainId" })
      checkNetworkStatus(chainId)
    } catch (error) {
      console.error("❌ Failed to check current network:", error)
    }
  }

  const checkNetworkStatus = (chainId: string) => {
    const network = Object.values(SUPPORTED_NETWORKS).find(net => net.chainId === chainId)
    setCurrentNetwork(network?.name || "Unknown Network")
    if (chainId === BSC_TESTNET_CONFIG.chainId) {
      setNetworkError(null)
    } else {
      setNetworkError(`Please switch to BNB Smart Chain Testnet`)
    }
  }

  const detectInstalledWallet = () => {
    if (typeof window === "undefined") return
    const userAgent = navigator.userAgent.toLowerCase()
    if (userAgent.includes('metamask')) {
      setDetectedWallet('METAMASK')
      console.log("🦊 MetaMask browser detected")
    } else if (userAgent.includes('trust')) {
      setDetectedWallet('TRUSTWALLET')
      console.log("🔷 Trust Wallet detected")
    } else if (userAgent.includes('binance')) {
      setDetectedWallet('BINANCE')
      console.log("🟡 Binance Wallet detected")
    } else if (userAgent.includes('safepal')) {
      setDetectedWallet('SAFEPAL')
      console.log("🟣 SafePal detected")
    }
  }

  // Deep link connection using local IP for dev
  const connectWithDeepLink = async (wallet?: string) => {
    try {
      if (typeof window === "undefined") throw new Error("Window not available")
      const targetWallet = wallet || detectedWallet || 'METAMASK'
      const walletConfig = MOBILE_WALLETS[targetWallet as keyof typeof MOBILE_WALLETS]
      if (!walletConfig) throw new Error(`Wallet ${targetWallet} not supported`)

      // Use your local dev IP and port here
      const targetUrl = `http://${LOCAL_DEV_IP_PORT}`
      // No query params or encoding for MetaMask deep link 
      let deepLinkUrl = ''
      if (/iPhone|iPad|iPod/i.test(navigator.userAgent)) {
        deepLinkUrl = `${walletConfig.ios}${targetUrl}`
      } else {
        deepLinkUrl = `${walletConfig.android}${targetUrl}`
      }
      console.log(`🔗 Opening ${walletConfig.name} with URL:`, deepLinkUrl)
      window.location.href = deepLinkUrl
    } catch (error) {
      console.error("❌ Deep link connection failed:", error)
      throw error
    }
  }

  const enhancedConnectWallet = async () => {
    try {
      if (isMobile && window.ethereum) {
        console.log("📱 Detected in-app wallet browser, connecting directly...")
        await web3.connectWallet()
        if (web3.account) await checkCurrentNetwork()
        return
      }
      if (isMobile && !window.ethereum) {
        console.log("📱 Mobile device, no provider - showing wallet selector...")
        setShowWalletSelector(true)
        return
      }
      console.log("💻 Desktop connection...")
      await web3.connectWallet()
      if (web3.account) await checkCurrentNetwork()
    } catch (error) {
      console.error("❌ Enhanced connection failed:", error)
    }
  }

  const enhancedSwitchNetwork = async () => {
    setShowNetworkSelector(true)
  }

  const enhancedDisconnectWallet = () => {
    setCurrentNetwork(null)
    setNetworkError(null)
    web3.disconnectWallet()
  }

  const contextValue: Web3ContextType = {
    ...web3,
    provider: web3.provider || new ethers.JsonRpcProvider(BSC_TESTNET_RPC),
    connectWallet: enhancedConnectWallet,
    disconnectWallet: enhancedDisconnectWallet,
    switchNetwork: enhancedSwitchNetwork,
    isMobile,
    detectedWallet,
    connectWithDeepLink,
    showWalletSelector,
    setShowWalletSelector,
    showNetworkSelector,
    setShowNetworkSelector,
    currentNetwork,
    networkError,
    isCorrectNetwork: !networkError && web3.account !== null
  }

  return (
    <Web3Context.Provider value={contextValue}>
      {children}
      <ConnectionStatus />
    </Web3Context.Provider>
  )
}

export function useWeb3Context() {
  const context = useContext(Web3Context)
  if (!context) throw new Error("useWeb3Context must be used within Web3Provider")
  return context
}

export function ConnectionStatus() {
  const { isConnecting, account, error, isMobile, networkError } = useWeb3Context()
  if (isConnecting) {
    return (
      <div className="fixed top-4 left-1/2 transform -translate-x-1/2 bg-blue-500 text-white px-4 py-2 rounded-lg z-50 flex items-center gap-2">
        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
        🔄 Connecting to wallet...
      </div>
    )
  }
  if (error && isMobile) {
    return (
      <div className="fixed top-4 left-1/2 transform -translate-x-1/2 bg-red-500 text-white px-4 py-2 rounded-lg z-50">
        ❌ {error}. Please try again.
      </div>
    )
  }
  if (networkError) {
    return (
      <div className="fixed top-4 left-1/2 transform -translate-x-1/2 bg-orange-500 text-white px-4 py-2 rounded-lg z-50">
        ⚠️ {networkError}
      </div>
    )
  }
  return null
}

export function MobileWalletSelector() {
  const { isMobile, connectWithDeepLink, setShowWalletSelector, showWalletSelector } = useWeb3Context()
  if (!showWalletSelector || !isMobile) return null
  const wallets = Object.entries(MOBILE_WALLETS).map(([key, wallet]) => ({ id: key, ...wallet }))
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-cyan-900 rounded-2xl p-6 max-w-md w-full border border-cyan-400">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-white">Choose Your Wallet</h3>
          <button 
            onClick={() => setShowWalletSelector(false)}
            className="text-white hover:text-cyan-300 text-xl transition-colors"
          >
            ✕
          </button>
        </div>
        <p className="text-cyan-200 mb-4 text-center">
          Select your preferred wallet to connect:
        </p>
        <div className="space-y-3">
          {wallets.map(wallet => (
            <button
              key={wallet.id}
              onClick={() => {
                connectWithDeepLink(wallet.id)
                setShowWalletSelector(false)
              }}
              className="w-full flex items-center gap-4 p-4 border border-cyan-400 rounded-xl hover:bg-cyan-800 transition-all duration-200 text-left group"
            >
              <span className="text-2xl">{wallet.icon}</span>
              <div className="flex flex-col">
                <div className="font-medium text-cyan-100 group-hover:text-white">{wallet.name}</div>
                <div className="text-sm text-cyan-300 group-hover:text-cyan-100">Tap to open</div>
              </div>
            </button>
          ))}
        </div>
        <div className="mt-4 text-center">
          <button 
            onClick={() => setShowWalletSelector(false)}
            className="text-cyan-300 hover:text-cyan-100 text-sm transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

export function NetworkSelector() {
  const { showNetworkSelector, setShowNetworkSelector, isCorrectNetwork, account, currentNetwork } = useWeb3Context()
  if (!showNetworkSelector) return null
  const networks = Object.values(SUPPORTED_NETWORKS)

  const handleNetworkSwitch = async (network: NetworkConfig) => {
    try {
      console.log(`🔄 Switching to ${network.name}...`)
      const provider = getProvider()
      try {
        await provider.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: network.chainId }],
        })
        console.log(`✅ Successfully switched to ${network.name}`)
        setShowNetworkSelector(false)
      } catch (switchError: any) {
        if (switchError.code === 4902) {
          console.log(`📝 Adding ${network.name} to wallet...`)
          const networkConfig = {
            chainId: network.chainId,
            chainName: network.name,
            rpcUrls: [network.rpcUrl],
            nativeCurrency: {
              name: network.currency,
              symbol: network.currency,
              decimals: 18,
            },
            blockExplorerUrls: [network.explorer],
          }
          await provider.request({
            method: "wallet_addEthereumChain",
            params: [networkConfig],
          })
          console.log(`✅ Successfully added ${network.name}`)
          setShowNetworkSelector(false)
        } else if (switchError.code === 4001) {
          console.log("❌ User rejected network switch")
        } else {
          throw switchError
        }
      }
    } catch (error: any) {
      console.error(`❌ Failed to switch to ${network.name}:`, error)
      alert(`Failed to switch network: ${error.message}`)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-cyan-900 rounded-2xl p-6 max-w-md w-full border border-cyan-400">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-white">Select Network</h3>
          <button 
            onClick={() => setShowNetworkSelector(false)}
            className="text-white hover:text-cyan-300 text-xl transition-colors"
          >
            ✕
          </button>
        </div>
        <div className="mb-4 p-3 bg-cyan-800 rounded-lg border border-cyan-600">
          <p className="text-cyan-200 text-sm">
            {isCorrectNetwork 
              ? "✅ You're on the correct network" 
              : "⚠️ Please switch to BNB Smart Chain Testnet"
            }
          </p>
          {currentNetwork && (
            <p className="text-cyan-300 text-xs mt-1">
              Current: {currentNetwork}
            </p>
          )}
          {account && (
            <p className="text-cyan-300 text-xs mt-1">
              Connected: {account.slice(0, 6)}...{account.slice(-4)}
            </p>
          )}
        </div>
        <p className="text-cyan-200 mb-4 text-center">
          Choose your preferred network:
        </p>
        <div className="space-y-3 max-h-60 overflow-y-auto">
          {networks.map(network => (
            <button
              key={network.id}
              onClick={() => handleNetworkSwitch(network)}
              className="w-full flex items-center gap-4 p-4 border border-cyan-400 rounded-xl hover:bg-cyan-800 transition-all duration-200 text-left group"
            >
              <span className="text-2xl">{network.icon}</span>
              <div className="flex flex-col flex-1">
                <div className="font-medium text-cyan-100 group-hover:text-white">{network.name}</div>
                <div className="text-sm text-cyan-300 group-hover:text-cyan-100">
                  Chain ID: {network.chainIdDecimal}
                </div>
                <div className="text-xs text-cyan-400 group-hover:text-cyan-300">{network.currency}</div>
              </div>
              {network.isRecommended && (
                <span className="ml-auto text-xs bg-green-500 text-white px-2 py-1 rounded-full">
                  Recommended
                </span>
              )}
            </button>
          ))}
        </div>
        <div className="mt-4 text-center">
          <button 
            onClick={() => setShowNetworkSelector(false)}
            className="text-cyan-300 hover:text-cyan-100 text-sm transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

// Helper functions
export const connectWalletWithNetworkCheck = async (): Promise<{
  success: boolean
  account?: string
  error?: string
}> => {
  try {
    if (typeof window === "undefined") {
      return { success: false, error: "Window not available" }
    }
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    )
    if (isMobile && !window.ethereum) {
      return { 
        success: false, 
        error: "Please open this page in your wallet's browser" 
      }
    }
    const provider = getProvider()
    console.log("🔍 Requesting accounts...")
    const accounts = await provider.request({
      method: "eth_requestAccounts",
    })
    if (!accounts || accounts.length === 0) {
      return { success: false, error: "No accounts found" }
    }
    const account = accounts[0]
    console.log("✅ Connected account:", account)
    const chainId = await provider.request({ method: "eth_chainId" })
    console.log("🌐 Current chain ID:", chainId)
    const isCorrectNetwork = chainId === BSC_TESTNET_CONFIG.chainId
    if (!isCorrectNetwork) {
      console.log("🔄 Wrong network detected")
      return { 
        success: true, 
        account,
        error: "WRONG_NETWORK"
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

export const switchToBSCTestnet = async (): Promise<boolean> => {
  try {
    if (typeof window === "undefined" || !window.ethereum) {
      throw new Error("Wallet not available")
    }
    const provider = getProvider()
    console.log("🔄 Attempting to switch to BNB Smart Chain Testnet...")
    try {
      await provider.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: BSC_TESTNET_CONFIG.chainId }],
      })
      console.log("✅ Successfully switched to BNB Smart Chain Testnet")
      return true
    } catch (switchError: any) {
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
    console.log("🔄 Wrong network, prompting switch...")
    const result = await switchToBSCTestnet()
    return result
  } catch (error) {
    console.error("❌ Network check failed:", error)
    return false
  }
}

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

export function useWallet() {
  const { account, connectWallet, disconnectWallet, isCorrectNetwork, switchNetwork } = useWeb3Context()
  return {
    account,
    isConnected: !!account,
    isCorrectNetwork,
    connect: connectWallet,
    disconnect: disconnectWallet,
    switchNetwork,
    balance: null,
  }
}

export const getAccounts = async (): Promise<string[]> => {
  if (typeof window === "undefined" || !window.ethereum) {
    console.warn("⚠️ Wallet not available")
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

export const getProvider = () => {
  if (typeof window === "undefined") {
    throw new Error("Window object not available (SSR)")
  }
  if (!window.ethereum) {
    throw new Error("No wallet provider found")
  }
  let provider = window.ethereum as any
  if (provider.providers && Array.isArray(provider.providers)) {
    const metamaskProvider = provider.providers.find(
      (p: any) => p.isMetaMask
    )
    provider = metamaskProvider || provider.providers[0]
  }
  return provider
}

export const getOrCreateProvider = async (): Promise<ethers.BrowserProvider | ethers.JsonRpcProvider> => {
  try {
    if (typeof window === "undefined" || !window.ethereum) {
      console.log("📡 Using read-only RPC provider")
      return new ethers.JsonRpcProvider(BSC_TESTNET_RPC)
    }
    const ethereumProvider = getProvider()
    const browserProvider = new ethers.BrowserProvider(ethereumProvider)
    console.log("✅ Created BrowserProvider from wallet")
    return browserProvider
  } catch (error) {
    console.warn("⚠️ Failed to create BrowserProvider, using RPC:", error)
    return new ethers.JsonRpcProvider(BSC_TESTNET_RPC)
  }
}

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

declare global {
  interface Window {
    ethereum?: any
  }
}
