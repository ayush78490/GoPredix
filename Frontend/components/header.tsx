"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { ChevronDown, Bell, Wifi, WifiOff, AlertCircle } from "lucide-react"
import Link from "next/link"
import { useWeb3Context, MobileWalletSelector, NetworkSelector } from "@/lib/wallet-context"
import MyImage from '@/public/logo.png'

export default function Header() {
  const [isOpen, setIsOpen] = useState(false)
  const [showNetworkAlert, setShowNetworkAlert] = useState(false)
  const [hasProvider, setHasProvider] = useState(false)
  
  const { 
    account, 
    connectWallet, 
    disconnectWallet, 
    isMobile,
    showWalletSelector,
    setShowWalletSelector,
    switchNetwork,
    isCorrectNetwork,
    currentNetwork,
    networkError
  } = useWeb3Context()

  const displayAddress = account ? `${account.slice(0, 6)}...${account.slice(-4)}` : "Connect Wallet"

  // ✅ FIX: Check for provider safely (avoid SSR issues)
  useEffect(() => {
    if (typeof window !== "undefined") {
      setHasProvider(!!window.ethereum)
    }
  }, [])

  // Show network alert when there's a network error
  useEffect(() => {
    if (networkError && account) {
      setShowNetworkAlert(true)
      // Auto-hide after 5 seconds
      const timer = setTimeout(() => {
        setShowNetworkAlert(false)
      }, 5000)
      return () => clearTimeout(timer)
    } else {
      setShowNetworkAlert(false)
    }
  }, [networkError, account])

  const handleConnect = async () => {
    console.log("🔘 Connect button clicked", { isMobile, hasProvider })
    await connectWallet()
  }

  const handleDisconnect = () => {
    console.log("🔌 Disconnecting wallet")
    disconnectWallet()
  }

  const handleSwitchNetwork = () => {
    console.log("🔄 Switch network clicked")
    switchNetwork()
  }

  // ✅ Better button text logic
  const getConnectButtonText = () => {
    if (isMobile && !hasProvider) {
      return "Choose Wallet"
    }
    if (isMobile && hasProvider) {
      return "Connect"
    }
    return "Login"
  }

  return (
    <>
      <header className="w-full py-5 fixed top-0 left-0 right-0 z-50">
        <div className="max-w-7xl mx-auto px-2">
          {/* Network Alert Banner */}
          {showNetworkAlert && networkError && (
            <div className="mb-4 p-3 bg-red-500/90 border border-red-400 rounded-lg flex items-center justify-between animate-in fade-in slide-in-from-top-2 duration-300">
              <div className="flex items-center gap-2">
                <AlertCircle size={20} className="text-white" />
                <span className="text-white text-sm font-medium">{networkError}</span>
              </div>
              <Button
                size="sm"
                onClick={handleSwitchNetwork}
                className="bg-white text-red-600 hover:bg-gray-100 rounded-full px-4 py-1 text-sm font-semibold transition-all"
              >
                Switch Network
              </Button>
            </div>
          )}

          <div className="flex items-center justify-between bg-black/50 rounded-full px-6 py-4 shadow-sm border border-cyan-300 backdrop-blur-sm">
            {/* Left: Logo and nav */}
            <div className="flex items-center gap-8">
              <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition">
                <div className="w-8 h-8 rounded-xl overflow-hidden flex items-center justify-center">
                  <img
                    src={MyImage.src || "/logo.png"}
                    alt="Project Logo"
                    className="w-6 h-6 object-contain scale-[1.5]"
                  />
                </div>
              </Link>
              <Link href="/">
                <nav className="hidden md:flex items-center gap-2">
                  <button
                    className="text-white mr-8 text-2xl px-0 py-2 rounded-2xl bg-transparent hover:text-cyan-300 transition-colors"
                  >
                    GOPREDIX
                  </button>
                </nav>
              </Link>
            </div>
            
            {/* Right: Network Status + Portfolio/Wallet */}
            <div className="flex items-center gap-3">
              {/* Network Status Indicator (Optional - Currently Commented) */}
              {account && (
                <div className="flex items-center gap-2">
                  {/* Uncomment if you want to show network status button */}
                  {/* <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleSwitchNetwork}
                    className={`flex items-center gap-2 rounded-full px-4 border transition-all ${
                      isCorrectNetwork 
                        ? "text-green-400 hover:text-green-300 border-green-400/50 hover:border-green-300/50" 
                        : "text-red-400 hover:text-red-300 border-red-400/50 hover:border-red-300/50 animate-pulse"
                    }`}
                  >
                    {isCorrectNetwork ? <Wifi size={16} /> : <WifiOff size={16} />}
                    <span className="hidden sm:inline">
                      {isCorrectNetwork ? "Correct Network" : "Wrong Network"}
                    </span>
                    <ChevronDown size={14} />
                  </Button> */}
                  
                  {/* Current Network Badge (Optional - Currently Commented) */}
                  {/* {currentNetwork && (
                    <div className="hidden md:block px-3 py-1 bg-cyan-900/50 border border-cyan-400/50 rounded-full">
                      <span className="text-cyan-200 text-xs">{currentNetwork}</span>
                    </div>
                  )} */}
                </div>
              )}
              
              <Link href="/profile">
                <Button
                  variant="ghost"
                  size="sm" 
                  className="text-white bg-transparent hover:bg-white/10 rounded-full px-5 transition-colors"
                >
                  Portfolio
                </Button>
              </Link>
              
              {account ? (
                <div className="flex items-center gap-2">
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="rounded-full px-5 bg-[#271f40] text-white border-cyan-400/50 hover:bg-[#322a50] transition-colors" 
                    disabled
                  >
                    {displayAddress}
                  </Button>
                  <Button 
                    size="sm" 
                    variant="secondary" 
                    className="rounded-full px-5 bg-white/10 text-white hover:bg-white/20 transition-colors" 
                    onClick={handleDisconnect}
                  >
                    Disconnect
                  </Button>
                </div>
              ) : (
                <Button
                  size="sm"
                  className="rounded-full px-7 py-2 font-semibold text-black bg-[#ECFEFF]/70 hover:bg-[#ECFEFF] transition-all duration-200 shadow-lg hover:shadow-cyan-500/25"
                  onClick={handleConnect}
                >
                  {getConnectButtonText()}
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Wallet Selector Modal */}
      <MobileWalletSelector />
      
      {/* Network Selector Modal */}
      <NetworkSelector />
    </>
  )
}
