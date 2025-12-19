"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { ChevronDown, Bell, Wifi, WifiOff, AlertCircle, Menu, X } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"
import { useWeb3Context, MobileWalletSelector } from "@/lib/wallet-context"
import { CustomConnectButton } from "./custom-connect-button"
import { useAccount, useDisconnect } from "wagmi"
import MyImage from '@/public/logo.png'

export default function Header() {
  const [isOpen, setIsOpen] = useState(false)
  const [showNetworkAlert, setShowNetworkAlert] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const pathname = usePathname()

  const {
    account,
    disconnectWallet,
    isMobile,
    showWalletSelector,
    setShowWalletSelector,
    switchNetwork,
    isCorrectNetwork,
    currentNetwork,
    networkError
  } = useWeb3Context()

  // Use wagmi hooks for account and disconnect
  const { address: wagmiAddress, isConnected } = useAccount()
  const { disconnect } = useDisconnect()

  // Use wagmi address if available, otherwise use custom context address
  const displayAccount = wagmiAddress || account
  const displayAddress = displayAccount ? `${displayAccount.slice(0, 6)}...${displayAccount.slice(-4)}` : "Connect Wallet"

  // Show network alert when there's a network error
  useEffect(() => {
    if (networkError && displayAccount) {
      setShowNetworkAlert(true)
      const timer = setTimeout(() => {
        setShowNetworkAlert(false)
      }, 5000)
      return () => clearTimeout(timer)
    } else {
      setShowNetworkAlert(false)
    }
  }, [networkError, displayAccount])

  // Close mobile menu when clicking outside
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [mobileMenuOpen])

  const handleDisconnect = () => {
    if (isConnected) {
      disconnect() // wagmi disconnect
    }
    disconnectWallet() // custom context disconnect
    setMobileMenuOpen(false)
  }

  const handleSwitchNetwork = () => {
    switchNetwork()
  }

  return (
    <>
      <header className="w-full py-3 md:py-5 fixed top-0 left-0 right-0 z-50">
        <div className="max-w-7xl mx-auto px-3 md:px-2">
          {/* Network Alert Banner */}
          {showNetworkAlert && networkError && (
            <div className="mb-2 md:mb-4 p-2 md:p-3 bg-red-500/90 border border-red-400 rounded-lg flex items-center justify-between animate-in fade-in slide-in-from-top-2 duration-300">
              <div className="flex items-center gap-2">
                <AlertCircle size={16} className="text-white md:w-5 md:h-5" />
                <span className="text-white text-xs md:text-sm font-medium">{networkError}</span>
              </div>
              <Button
                size="sm"
                onClick={handleSwitchNetwork}
                className="bg-white text-red-600 hover:bg-gray-100 rounded-full px-3 md:px-4 py-1 text-xs md:text-sm font-semibold transition-all"
              >
                Switch
              </Button>
            </div>
          )}

          <div className="relative flex items-center justify-between bg-black/50 rounded-full px-4 md:px-6 py-3 md:py-4 shadow-sm border border-cyan-300 backdrop-blur-sm">
            {/* Left: Logo and nav */}
            <div className="flex items-center gap-3 md:gap-8">
              <Link href="/" className="flex items-center gap-2 md:gap-3 hover:opacity-80 transition">
                <div className="w-6 h-6 md:w-8 md:h-8 rounded-xl overflow-hidden flex items-center justify-center">
                  <img
                    src={MyImage.src || "/logo.png"}
                    alt="Project Logo"
                    className="w-5 h-5 md:w-6 md:h-6 object-contain scale-[1.5]"
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
              {/* Mobile: Show GOPREDIX text */}
              <Link href="/" className="md:hidden">
                <span className="text-white text-lg font-semibold">GOPREDIX</span>
              </Link>
            </div>

            {/* Center: Navigation Buttons */}
            <div className="hidden md:flex items-center gap-1 absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2">
              {[
                { href: "/markets", label: "Markets" },
                { href: "/profile", label: "Portfolio" },
                { href: "/marketplace", label: "Marketplace" },
                { href: "/disputes", label: "Disputes" },
              ].map((link) => {
                const isActive = pathname.startsWith(link.href)

                return (
                  <Link key={link.href} href={link.href} className="relative group">
                    <Button
                      variant="ghost"
                      size="sm"
                      className={cn(
                        "bg-transparent rounded-full px-5 transition-colors relative z-10 hover:bg-white/10",
                        isActive ? "text-cyan-300" : "text-white hover:text-cyan-100"
                      )}
                    >
                      {link.label}
                    </Button>
                    {isActive && (
                      <motion.div
                        layoutId="navbar-underline"
                        className="absolute bottom-1 left-4 right-4 h-0.5 bg-cyan-300 rounded-full"
                        initial={{ opacity: 0, scaleX: 0.5 }}
                        animate={{ opacity: 1, scaleX: 1 }}
                        transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                      />
                    )}
                  </Link>
                )
              })}
            </div>

            {/* Right: Wallet */}
            <div className="hidden md:flex items-center gap-3">
              {displayAccount ? (
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
                <CustomConnectButton />
              )}
            </div>

            {/* Mobile: Hamburger Menu + Connect Button */}
            <div className="flex md:hidden items-center gap-2">
              {!displayAccount && (
                <CustomConnectButton size="sm" />
              )}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="text-white p-2 hover:bg-white/10 rounded-full transition-colors"
                aria-label="Toggle menu"
              >
                {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Mobile Menu Sidebar */}
      <div
        className={`fixed top-0 right-0 h-full w-64 bg-gradient-to-b from-[#0a0118] to-[#1a0a2e] border-l border-cyan-400/30 z-50 transform transition-transform duration-300 ease-in-out md:hidden ${mobileMenuOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
      >
        <div className="flex flex-col h-full p-6 pt-20">
          {/* Close button */}
          <button
            onClick={() => setMobileMenuOpen(false)}
            className="absolute top-4 right-4 text-white p-2 hover:bg-white/10 rounded-full transition-colors"
          >
            <X size={24} />
          </button>

          {/* Menu Items */}
          <nav className="flex flex-col gap-4">
            {displayAccount && (
              <div className="mb-4 p-4 bg-white/5 rounded-lg border border-cyan-400/20">
                <p className="text-cyan-300 text-xs mb-2">Connected</p>
                <p className="text-white font-mono text-sm">{displayAddress}</p>
              </div>
            )}

            <Link
              href="/markets"
              onClick={() => setMobileMenuOpen(false)}
              className="text-white hover:text-cyan-300 transition-colors py-3 px-4 hover:bg-white/5 rounded-lg"
            >
              Markets
            </Link>

            <Link
              href="/profile"
              onClick={() => setMobileMenuOpen(false)}
              className="text-white hover:text-cyan-300 transition-colors py-3 px-4 hover:bg-white/5 rounded-lg"
            >
              Portfolio
            </Link>

            <Link
              href="/marketplace"
              onClick={() => setMobileMenuOpen(false)}
              className="text-white hover:text-cyan-300 transition-colors py-3 px-4 hover:bg-white/5 rounded-lg"
            >
              Marketplace
            </Link>

            <Link
              href="/disputes"
              onClick={() => setMobileMenuOpen(false)}
              className="text-white hover:text-cyan-300 transition-colors py-3 px-4 hover:bg-white/5 rounded-lg"
            >
              Disputes
            </Link>

            <Link
              href="/leaderboard"
              onClick={() => setMobileMenuOpen(false)}
              className="text-white hover:text-cyan-300 transition-colors py-3 px-4 hover:bg-white/5 rounded-lg"
            >
              Leaderboard
            </Link>

            <Link
              href="/how-to-trade"
              onClick={() => setMobileMenuOpen(false)}
              className="text-white hover:text-cyan-300 transition-colors py-3 px-4 hover:bg-white/5 rounded-lg"
            >
              How to Trade
            </Link>

            {displayAccount && (
              <>
                <div className="border-t border-cyan-400/20 my-2"></div>
                <button
                  onClick={handleDisconnect}
                  className="text-red-400 hover:text-red-300 transition-colors py-3 px-4 hover:bg-red-500/10 rounded-lg text-left"
                >
                  Disconnect Wallet
                </button>
              </>
            )}
          </nav>
        </div>
      </div>

      {/* Mobile Wallet Selector Modal */}
      <MobileWalletSelector />
    </>
  )
}