"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/cardPDX"
import { Alert, AlertDescription } from "@/components/ui/alertPDX"
import { Copy, Check, ExternalLink, Droplets, Clock, Wallet, Shield, Coins } from "lucide-react"
import Header from "@/components/header"
import Footer from "@/components/footer"
import LightRays from "@/components/LightRays"

export default function FaucetPage() {
  const [address, setAddress] = useState("")
  const [copied, setCopied] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [transactionHash, setTransactionHash] = useState("")
  const [error, setError] = useState("")

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleRequestTokens = async () => {
    if (!address) {
      setError("Please enter your wallet address")
      return
    }

    if (!address.match(/^0x[a-fA-F0-9]{40}$/)) {
      setError("Please enter a valid wallet address")
      return
    }

    setIsLoading(true)
    setError("")
    setTransactionHash("")

    try {
      // Simulate API call to faucet
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      // Mock successful transaction
      const mockTxHash = "0x" + Math.random().toString(16).substr(2, 64)
      setTransactionHash(mockTxHash)
      
      // In real implementation, you would call your faucet API here
      console.log("Requesting tokens for address:", address)
      
    } catch (err) {
      setError("Failed to request tokens. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const faucetStats = [
    { label: "PDX per Request", value: "100 PDX" },
    { label: "Cooldown Period", value: "24 hours" },
    { label: "Available Today", value: "10,000 PDX" },
    { label: "Total Distributed", value: "1.2M PDX" }
  ]

  const features = [
    {
      icon: <Shield className="w-8 h-8" />,
      title: "Secure",
      description: "Completely secure token distribution with no private keys required"
    },
    {
      icon: <Clock className="w-8 h-8" />,
      title: "Fast",
      description: "Instant token delivery directly to your wallet within seconds"
    },
    {
      icon: <Coins className="w-8 h-8" />,
      title: "Free",
      description: "Get free PDX tokens to start trading on prediction markets"
    }
  ]

  return (
    <main className="min-h-screen bg-background relative overflow-hidden">
      {/* Light background animation */}
      <div className="fixed inset-0 z-0">
        <LightRays
          raysOrigin="top-center"
          raysColor="#6366f1"
          raysSpeed={1.5}
          lightSpread={0.8}
          rayLength={1.2}
          followMouse={true}
          noiseAmount={0.1}
          distortion={0.05}
        />
      </div>

      {/* Content */}
      <div className="relative z-10 bg-black/80 min-h-screen">
        <Header />

        <div className="max-w-4xl mx-auto px-4 py-8">
          {/* Header Section */}
          <div className="text-center mb-12">
            <div className="flex justify-center items-center mb-4">
              <div className="p-3 bg-primary/20 rounded-full">
                <Droplets className="w-12 h-12 text-primary" />
              </div>
            </div>
            <h1 className="text-4xl font-bold text-white mb-4">PDX Faucet</h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Get free PDX tokens to start trading on prediction markets. Perfect for testing and getting started with decentralized predictions.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Faucet Card */}
            <div className="lg:col-span-2">
              <Card className="backdrop-blur-sm bg-card/80 border-border">
                <CardHeader>
                  <CardTitle className="text-2xl flex items-center gap-2">
                    <Wallet className="w-6 h-6" />
                    Request PDX Tokens
                  </CardTitle>
                  <CardDescription>
                    Enter your wallet address to receive 100 PDX tokens. You can request once every 24 hours.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Wallet Input */}
                  <div className="space-y-2">
                    <label htmlFor="address" className="text-sm font-medium">
                      Your Wallet Address
                    </label>
                    <Input
                      id="address"
                      placeholder="0x..."
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      className="bg-black/20 border-border"
                    />
                  </div>

                  {/* Error Message */}
                  {error && (
                    <Alert variant="destructive">
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}

                  {/* Success Message */}
                  {transactionHash && (
                    <Alert className="bg-green-500/10 border-green-500/50">
                      <AlertDescription className="text-green-400">
                        <div className="flex items-center justify-between">
                          <span>100 PDX sent successfully!</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleCopy(transactionHash)}
                            className="text-green-400 hover:text-green-300"
                          >
                            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                          </Button>
                        </div>
                        <div className="mt-2 flex items-center gap-2 text-sm">
                          <ExternalLink className="w-3 h-3" />
                          <a 
                            href={`https://explorer.example.com/tx/${transactionHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:underline"
                          >
                            View on Explorer
                          </a>
                        </div>
                      </AlertDescription>
                    </Alert>
                  )}

                  {/* Request Button */}
                  <Button
                    onClick={handleRequestTokens}
                    disabled={isLoading || !address}
                    className="w-full bg-white/30 text-primary-foreground hover:bg-primary/90"
                    size="lg"
                  >
                    {isLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <Droplets className="w-5 h-5 mr-2" />
                        Get 100 PDX
                      </>
                    )}
                  </Button>

                  {/* Faucet Stats */}
                  <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border">
                    {faucetStats.map((stat, index) => (
                      <div key={index} className="text-center">
                        <div className="text-2xl font-bold text-primary">{stat.value}</div>
                        <div className="text-sm text-muted-foreground">{stat.label}</div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* How it Works */}
              <Card className="backdrop-blur-sm bg-card/80 border-border">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="w-5 h-5" />
                    How it Works
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-6 h-6 bg-primary rounded-full flex items-center justify-center text-xs font-bold">
                      1
                    </div>
                    <div>
                      <div className="font-medium">Connect Your Wallet</div>
                      <div className="text-sm text-muted-foreground">
                        Make sure you're connected to the correct network
                      </div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-6 h-6 bg-primary rounded-full flex items-center justify-center text-xs font-bold">
                      2
                    </div>
                    <div>
                      <div className="font-medium">Enter Address</div>
                      <div className="text-sm text-muted-foreground">
                        Paste your wallet address in the input field
                      </div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-6 h-6 bg-primary rounded-full flex items-center justify-center text-xs font-bold">
                      3
                    </div>
                    <div>
                      <div className="font-medium">Receive Tokens</div>
                      <div className="text-sm text-muted-foreground">
                        Get 100 PDX instantly to start trading
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Features */}
              <Card className="backdrop-blur-sm bg-card/80 border-border">
                <CardHeader>
                  <CardTitle>Why Use PDX Faucet?</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {features.map((feature, index) => (
                    <div key={index} className="flex items-start gap-3">
                      <div className="flex-shrink-0 text-primary">
                        {feature.icon}
                      </div>
                      <div>
                        <div className="font-medium">{feature.title}</div>
                        <div className="text-sm text-muted-foreground">
                          {feature.description}
                        </div>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Important Notes */}
              <Card className="backdrop-blur-sm bg-card/80 border-border border-yellow-500/50">
                <CardHeader>
                  <CardTitle className="text-yellow-500">Important Notes</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm text-yellow-400/80">
                  <div>• Faucet has a 24-hour cooldown period</div>
                  <div>• Tokens are for testing purposes only</div>
                  <div>• No real monetary value</div>
                  <div>• Use responsibly</div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Additional Info Section */}
          <div className="mt-12 text-center">
            <Card className="backdrop-blur-sm bg-card/80 border-border">
              <CardContent className="pt-6">
                <h3 className="text-lg font-semibold mb-2">Need More PDX?</h3>
                <p className="text-muted-foreground mb-4">
                  Participate in prediction markets to earn more PDX tokens through successful trades and market creation.
                </p>
                <div className="flex flex-wrap justify-center gap-4">
                  <Button variant="outline" className="backdrop-blur-sm bg-card/80">
                    View Markets
                  </Button>
                  <Button variant="outline" className="backdrop-blur-sm bg-card/80">
                    Create Market
                  </Button>
                  <Button variant="outline" className="backdrop-blur-sm bg-card/80">
                    Documentation
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <Footer />
      </div>
    </main>
  )
}