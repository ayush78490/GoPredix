"use client"

import { useState, useEffect, useCallback } from "react"
import Header from "@/components/header"
import Footer from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Trophy, Medal, ArrowLeft, Wallet, Loader2, TrendingUp, Users, BarChart3, ExternalLink } from "lucide-react"
import { useRouter } from "next/navigation"
import LightRays from "@/components/LightRays"
import TwitterProfileDisplay from "@/components/twitter-profile-display"
import { UserProfile } from "@/lib/supabase"

interface UserStats {
  address: string
  totalInvestment: string
  bnbInvestment: string
  pdxInvestment: string
  totalVolume: number
  totalPositions: number
}

interface Market {
  id: number
  creator: string
  question: string
  category: string
  endTime: number
  status: number
  yesPool: string
  noPool: string
  paymentToken: "BNB" | "PDX"
}

interface LeaderboardData {
  userStats: UserStats[]
  profiles: { [address: string]: UserProfile }
  markets: Market[]
  totalTraders: number
  activeMarkets: number
}

export default function Leaderboard() {
  const router = useRouter()

  const [data, setData] = useState<LeaderboardData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Main data fetching - single API call
  const fetchLeaderboardData = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/leaderboard')

      if (!response.ok) {
        throw new Error(`Failed to fetch leaderboard data: ${response.statusText}`)
      }

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch leaderboard data')
      }

      setData(result.data)
    } catch (err: any) {
      console.error("❌ Error fetching leaderboard data:", err)
      setError(err.message || 'Failed to load leaderboard data')
      setData(null)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchLeaderboardData()
  }, [fetchLeaderboardData])

  const refreshData = useCallback(async () => {
    await fetchLeaderboardData()
  }, [fetchLeaderboardData])


  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

  const getRankColor = (rank: number) => {
    switch (rank) {
      case 0: return "text-yellow-500"
      case 1: return "text-gray-400"
      case 2: return "text-orange-600"
      default: return "text-blue-500"
    }
  }

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 0: return <Trophy className="w-5 h-5" />
      case 1: return <Medal className="w-5 h-5" />
      case 2: return <Medal className="w-5 h-5" />
      default: return <span className="text-sm font-bold">{rank + 1}</span>
    }
  }

  return (
    <main className="min-h-screen bg-background relative overflow-hidden">
      <div className="fixed inset-0 z-0">
        <LightRays
          raysOrigin="top-center"
          raysColor="#6366f1"
          raysSpeed={1.5}
          lightSpread={0.8}
          rayLength={1.2}
          followMouse={true}
          mouseInfluence={0.1}
          noiseAmount={0.1}
          distortion={0.05}
        />
      </div>

      <div className="relative z-10 bg-black/80">
        <Header />

        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 mt-[10vh]">
            <div className="flex items-center mb-4 md:mb-0">
              <Button
                variant="ghost"
                onClick={() => router.push("/")}
                className="mr-4 backdrop-blur-sm bg-card/80"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="text-3xl md:text-4xl font-bold mb-2">Investor Leaderboard</h1>
                <p className="text-muted-foreground backdrop-blur-sm bg-card/80 p-2 rounded-lg inline-block">
                  Top investors ranked by total investment
                </p>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={refreshData}
                disabled={isLoading}
                variant="outline"
                className="whitespace-nowrap backdrop-blur-sm bg-card/80"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Loading...
                  </>
                ) : (
                  "Refresh Data"
                )}
              </Button>
            </div>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg backdrop-blur-sm bg-card/80">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-red-800 font-semibold">Error Loading Data</h3>
                  <p className="text-red-700 text-sm mt-1">{error}</p>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <Card className="backdrop-blur-sm bg-card/80 hover:border-white/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total Traders</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center">
                  <Users className="w-8 h-8 text-primary mr-2" />
                  <div className="text-2xl font-bold">{data?.totalTraders || 0}</div>
                </div>
              </CardContent>
            </Card>
            <Card className="backdrop-blur-sm bg-card/80 hover:border-white/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Active Markets</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center">
                  <BarChart3 className="w-8 h-8 text-primary mr-2" />
                  <div className="text-2xl font-bold">{data?.activeMarkets || 0}</div>
                </div>
              </CardContent>
            </Card>
            <Card className="backdrop-blur-sm bg-card/80 hover:border-white/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total Investment</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center">
                  <TrendingUp className="w-8 h-8 text-primary mr-2" />
                  <div className="text-2xl font-bold text-blue-600">
                    ${data?.userStats.reduce((sum, user) => sum + parseFloat(user.totalInvestment), 0).toLocaleString() || 0}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4">
            {isLoading && !data ? (
              <Card className="backdrop-blur-sm bg-card/80">
                <CardContent className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-primary mr-3" />
                  <p className="text-lg">Loading leaderboard data from blockchain...</p>
                </CardContent>
              </Card>
            ) : !data || data.userStats.length === 0 ? (
              <Card className="backdrop-blur-sm bg-card/80">
                <CardContent className="text-center py-12">
                  <p className="text-muted-foreground">No traders found yet. Be the first to create a market!</p>
                </CardContent>
              </Card>
            ) : (
              data.userStats.map((user, index) => (
                <Card key={user.address} className="backdrop-blur-sm bg-card/80 hover:border-primary/50 transition-all">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-4">
                        <div className={`flex items-center justify-center w-10 h-10 rounded-full ${getRankColor(index)} bg-card/50 backdrop-blur-sm`}>
                          {getRankIcon(index)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            {data.profiles[user.address.toLowerCase()] ? (
                              <TwitterProfileDisplay
                                username={data.profiles[user.address.toLowerCase()].twitter_username}
                                name={data.profiles[user.address.toLowerCase()].twitter_name}
                                avatarUrl={data.profiles[user.address.toLowerCase()].twitter_avatar_url}
                              />
                            ) : (
                              <CardTitle className="text-sm font-mono">{formatAddress(user.address)}</CardTitle>
                            )}
                            <a
                              href={`https://testnet.bscscan.com/address/${user.address}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary hover:text-primary/80"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </a>
                          </div>
                          <CardDescription className="text-xs">
                            {user.totalPositions} Positions • ${parseFloat(user.totalInvestment).toFixed(2)} Total Investment
                          </CardDescription>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Badge variant="outline" className="backdrop-blur-sm bg-amber-500/10 text-amber-500 border-amber-500/50">
                          🔶 ${parseFloat(user.bnbInvestment).toFixed(2)} BNB
                        </Badge>
                        <Badge variant="outline" className="backdrop-blur-sm bg-purple-500/10 text-purple-500 border-purple-500/50">
                          💎 ${parseFloat(user.pdxInvestment).toFixed(2)} PDX
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      <div>
                        <p className="text-xs text-muted-foreground">Total Investment</p>
                        <p className="text-lg font-bold text-blue-600">${parseFloat(user.totalInvestment).toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Total Volume</p>
                        <p className="text-lg font-bold">${user.totalVolume.toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Positions</p>
                        <p className="text-lg font-bold">{user.totalPositions}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>

        <Footer />
      </div>
    </main>
  )
}