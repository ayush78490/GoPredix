"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { ChevronDown, Bell } from "lucide-react"
import Link from "next/link"
import { useWeb3Context } from "@/lib/wallet-context"
import MyImage from '@/public/logo.png'
import { ConnectButton } from '@rainbow-me/rainbowkit'

// Global function to open RainbowKit modal
declare global {
  interface Window {
    rainbowKitConnect: () => void;
  }
}

export default function Header() {
  const { account, disconnectWallet, connectWallet } = useWeb3Context()
  const [isRainbowKitAvailable, setIsRainbowKitAvailable] = useState(false)

  useEffect(() => {
    // Check if RainbowKit is available
    setIsRainbowKitAvailable(typeof window !== 'undefined' && !!(window as any).rainbowKitConnect)
  }, [])

  const displayAddress = account ? `${account.slice(0, 6)}...${account.slice(-4)}` : "Connect Wallet"

  const handleLegacyConnect = async () => {
    try {
      await connectWallet()
    } catch (error) {
      console.error('Connection failed:', error)
    }
  }

  return (
    <header className="w-full py-5">
      <div className="max-w-7xl mx-auto px-2">
        <div className="flex items-center justify-between bg-[#16131e]/10 rounded-full px-6 py-4 shadow-sm border border-[#23222f]">
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
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-white mr-8 text-2xl px-0 py-2 rounded-2xl"
                >
                  GOPREDIX
                </Button>
              </nav>
            </Link>
          </div>
          
          {/* Right: Portfolio/Wallet */}
          <div className="flex items-center gap-3">
            <Link href="/profile">
              <Button
                size="sm" 
                className="text-white bg-transparent hover:text-black rounded-full px-5"
              >
                Portfolio
              </Button>
            </Link>
            
            {account ? (
              // Connected state - works with both systems
              <div className="flex items-center gap-2">
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="rounded-full px-5 bg-[#271f40] text-white border-none cursor-default" 
                  disabled
                >
                  {displayAddress}
                </Button>
                <Button 
                  size="sm" 
                  variant="secondary" 
                  className="rounded-full px-5" 
                  onClick={disconnectWallet}
                >
                  Disconnect
                </Button>
              </div>
            ) : (
              // Not connected state - use RainbowKit if available, else fallback
              <>
                {isRainbowKitAvailable ? (
                  <ConnectButton.Custom>
                    {({
                      account,
                      chain,
                      openAccountModal,
                      openChainModal,
                      openConnectModal,
                      authenticationStatus,
                      mounted,
                    }) => {
                      // Store the connect function globally for legacy system access
                      if (typeof window !== 'undefined') {
                        window.rainbowKitConnect = openConnectModal;
                      }

                      const ready = mounted && authenticationStatus !== 'loading';
                      
                      if (!ready) {
                        return (
                          <Button
                            size="sm"
                            className="rounded-full px-7 py-2 font-semibold text-black bg-[#ECFEFF]/70 hover:bg-[#ECFEFF] transition"
                            disabled
                          >
                            Loading...
                          </Button>
                        );
                      }

                      return (
                        <Button
                          size="sm"
                          className="rounded-full px-7 py-2 font-semibold text-black bg-[#ECFEFF]/70 hover:bg-[#ECFEFF] transition"
                          onClick={openConnectModal}
                        >
                          Login
                        </Button>
                      );
                    }}
                  </ConnectButton.Custom>
                ) : (
                  // Fallback to legacy connection
                  <Button
                    size="sm"
                    className="rounded-full px-7 py-2 font-semibold text-black bg-[#ECFEFF]/70 hover:bg-[#ECFEFF] transition"
                    onClick={handleLegacyConnect}
                  >
                    Login
                  </Button>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}