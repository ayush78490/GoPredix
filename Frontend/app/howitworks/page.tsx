// app/how-it-works/page.tsx
"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { 
  ArrowRight, 
  TrendingUp, 
  Users, 
  Shield, 
  Zap, 
  Brain, 
  Coins, 
  Clock,
  BarChart3,
  Wallet,
  Smartphone,
  BookOpen,
  Home,
  ArrowUpRight,
  Sparkles
} from "lucide-react"
import Link from "next/link"
import LightRays from "@/components/LightRays"

export default function HowItWorksPage() {
  const [activeTab, setActiveTab] = useState("trading")

  const steps = [
    {
      icon: <Wallet className="h-6 w-6" />,
      title: "Connect Your Wallet",
      description: "Connect your Web3 wallet to BNB Smart Chain Testnet to start trading prediction markets."
    },
    {
      icon: <BarChart3 className="h-6 w-6" />,
      title: "Browse Markets",
      description: "Explore various prediction markets across different categories like crypto, sports, politics, and more."
    },
    {
      icon: <TrendingUp className="h-6 w-6" />,
      title: "Analyze & Predict",
      description: "Use market data, probabilities, and AI insights to make informed predictions on outcomes."
    },
    {
      icon: <Coins className="h-6 w-6" />,
      title: "Trade Positions",
      description: "Buy YES or NO positions using BNB. Your payout depends on market outcome and trade timing."
    },
    {
      icon: <Clock className="h-6 w-6" />,
      title: "Wait for Resolution",
      description: "Markets resolve automatically using AI or through community disputes after the end time."
    },
    {
      icon: <Zap className="h-6 w-6" />,
      title: "Claim Rewards",
      description: "If your prediction is correct, redeem your positions for BNB rewards based on market odds."
    }
  ]

  const features = [
    {
      icon: <Brain className="h-8 w-8" />,
      title: "AI-Powered Resolution",
      description: "Advanced AI automatically resolves markets based on real-world data and events.",
      benefits: ["Eliminates manual resolution", "Reduces bias", "Fast and accurate"]
    },
    {
      icon: <Shield className="h-8 w-8" />,
      title: "Secure & Transparent",
      description: "Built on blockchain with smart contracts ensuring fair and transparent trading.",
      benefits: ["Immutable records", "Provably fair", "No central control"]
    },
    {
      icon: <Users className="h-8 w-8" />,
      title: "Community Driven",
      description: "Dispute system allows community to challenge AI resolutions when needed.",
      benefits: ["Collective intelligence", "Dispute mechanism", "Community governance"]
    }
  ]

  const tradingConcepts = [
    {
      term: "Market Question",
      definition: "A binary question about a future event with YES/NO outcomes."
    },
    {
      term: "YES/NO Positions",
      definition: "Tokens representing your belief in the outcome. Prices change based on market sentiment."
    },
    {
      term: "Probability & Odds",
      definition: "Current market-implied probability of each outcome, calculated from token prices."
    },
    {
      term: "Liquidity Pools",
      definition: "Smart contract pools that provide liquidity for trading and determine prices."
    },
    {
      term: "Multipliers",
      definition: "Potential return multipliers based on current prices and market probabilities."
    },
    {
      term: "Slippage",
      definition: "Price movement between trade submission and execution in volatile markets."
    }
  ]

  const resolutionProcess = [
    {
      phase: "Trading Period",
      description: "Market is open for trading until the specified end time.",
      duration: "Until end time",
      status: "Active"
    },
    {
      phase: "Resolution Request",
      description: "Anyone can request AI resolution after the market ends.",
      duration: "Anytime after end",
      status: "Pending"
    },
    {
      phase: "AI Resolution",
      description: "AI analyzes the outcome and resolves the market automatically.",
      duration: "Within 24 hours",
      status: "Processing"
    },
    {
      phase: "Dispute Window",
      description: "7-day period for community to dispute AI resolution if incorrect.",
      duration: "7 days",
      status: "Challengeable"
    },
    {
      phase: "Final Resolution",
      description: "Market is finalized and rewards can be claimed.",
      duration: "Permanent",
      status: "Final"
    }
  ]

  return (
    <div className="relative min-h-screen bg-black/80">
      {/* LightRays Background */}
      <div className="fixed inset-0 -z-10">
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
        
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-background/80 via-background/60 to-background/90" />
        
        {/* Subtle Grid Pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:64px_64px] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_50%,black,transparent)]" />
      </div>

      {/* Content */}
      <div className="relative z-10 container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center mb-4">
            <div className="relative">
              <BookOpen className="h-8 w-8 text-primary mr-3" />
              <Sparkles className="h-4 w-4 text-yellow-400 absolute -top-1 -right-1" />
            </div>
            <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-b from-foreground to-foreground/70 bg-clip-text text-transparent">
              How Prediction Markets Work
            </h1>
          </div>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Learn how to trade, earn, and participate in decentralized prediction markets 
            powered by AI resolution and blockchain technology.
          </p>
        </div>

        {/* Breadcrumb */}
        <div className="flex items-center text-sm text-muted-foreground mb-8">
          <Link href="/" className="hover:text-foreground transition-colors flex items-center">
            <Home className="h-4 w-4 mr-1" />
            Home
          </Link>
          <ArrowRight className="h-4 w-4 mx-2" />
          <span className="text-foreground">How It Works</span>
        </div>

        {/* Main Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-12">
          <TabsList className="grid w-full grid-cols-3 bg-background/50 backdrop-blur-sm border">
            <TabsTrigger value="trading" className="data-[state=active]:bg-primary/20">
              Trading Guide
            </TabsTrigger>
            <TabsTrigger value="resolution" className="data-[state=active]:bg-primary/20">
              AI Resolution
            </TabsTrigger>
            <TabsTrigger value="advanced" className="data-[state=active]:bg-primary/20">
              Advanced Concepts
            </TabsTrigger>
          </TabsList>

          {/* Trading Guide Tab */}
          <TabsContent value="trading" className="space-y-8 mt-6">
            {/* Step-by-Step Guide */}
            <Card className="bg-background/50 backdrop-blur-sm border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Getting Started: 6 Simple Steps
                </CardTitle>
                <CardDescription>
                  Follow these steps to start trading prediction markets
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {steps.map((step, index) => (
                    <div key={index} className="flex flex-col items-center text-center p-6 border rounded-lg bg-card/50 backdrop-blur-sm hover:bg-card/70 transition-colors">
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4 border border-primary/20">
                        {step.icon}
                      </div>
                      <Badge variant="secondary" className="mb-2">Step {index + 1}</Badge>
                      <h3 className="font-semibold mb-2">{step.title}</h3>
                      <p className="text-sm text-muted-foreground">{step.description}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Trading Concepts */}
            <Card className="bg-background/50 backdrop-blur-sm border-border/50">
              <CardHeader>
                <CardTitle>Key Trading Concepts</CardTitle>
                <CardDescription>
                  Understand the fundamental concepts behind prediction market trading
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2">
                  {tradingConcepts.map((concept, index) => (
                    <div key={index} className="p-4 border rounded-lg bg-card/30 backdrop-blur-sm hover:bg-card/50 transition-colors">
                      <h4 className="font-semibold mb-2 text-primary">{concept.term}</h4>
                      <p className="text-sm text-muted-foreground">{concept.definition}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Example Trade */}
            <Card className="bg-background/50 backdrop-blur-sm border-border/50">
              <CardHeader>
                <CardTitle>Example Trade Scenario</CardTitle>
                <CardDescription>
                  See how a typical trade works in practice
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid md:grid-cols-3 gap-4 text-center">
                    <div className="p-4 bg-green-50 dark:bg-green-950/50 rounded-lg border border-green-200 dark:border-green-800/50 backdrop-blur-sm">
                      <div className="text-2xl font-bold text-green-600">1 BNB</div>
                      <div className="text-sm text-muted-foreground">Investment</div>
                    </div>
                    <div className="p-4 bg-blue-50 dark:bg-blue-950/50 rounded-lg border border-blue-200 dark:border-blue-800/50 backdrop-blur-sm">
                      <div className="text-2xl font-bold text-blue-600">2.5x</div>
                      <div className="text-sm text-muted-foreground">Multiplier</div>
                    </div>
                    <div className="p-4 bg-purple-50 dark:bg-purple-950/50 rounded-lg border border-purple-200 dark:border-purple-800/50 backdrop-blur-sm">
                      <div className="text-2xl font-bold text-purple-600">2.5 BNB</div>
                      <div className="text-sm text-muted-foreground">Potential Payout</div>
                    </div>
                  </div>
                  <div className="p-4 bg-muted/50 rounded-lg backdrop-blur-sm border">
                    <p className="text-sm">
                      <strong>Scenario:</strong> You believe "BTC will reach $100K by end of year" and buy YES positions for 1 BNB when the market implies 40% probability. If correct, you receive 2.5 BNB (1 BNB × 2.5x multiplier).
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* AI Resolution Tab */}
          <TabsContent value="resolution" className="space-y-8 mt-6">
            {/* Features */}
            <div className="grid gap-6 md:grid-cols-3">
              {features.map((feature, index) => (
                <Card key={index} className="bg-background/50 backdrop-blur-sm border-border/50 hover:bg-background/70 transition-colors">
                  <CardHeader>
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4 border border-primary/20">
                      {feature.icon}
                    </div>
                    <CardTitle className="text-lg">{feature.title}</CardTitle>
                    <CardDescription>{feature.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {feature.benefits.map((benefit, idx) => (
                        <li key={idx} className="flex items-center gap-2 text-sm">
                          <div className="w-2 h-2 rounded-full bg-primary" />
                          {benefit}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Resolution Timeline */}
            <Card className="bg-background/50 backdrop-blur-sm border-border/50">
              <CardHeader>
                <CardTitle>Market Resolution Process</CardTitle>
                <CardDescription>
                  From trading period to final resolution - understand the complete lifecycle
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {resolutionProcess.map((phase, index) => (
                    <div key={index} className="flex items-start gap-4 p-4 border rounded-lg bg-card/30 backdrop-blur-sm hover:bg-card/50 transition-colors">
                      <div className="flex flex-col items-center">
                        <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold border border-primary/20">
                          {index + 1}
                        </div>
                        {index < resolutionProcess.length - 1 && (
                          <div className="w-0.5 h-8 bg-border/50 mt-2" />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold">{phase.phase}</h4>
                          <Badge variant="outline" className="bg-background/50">{phase.status}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">{phase.description}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          Duration: {phase.duration}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Dispute System */}
            <Card className="bg-background/50 backdrop-blur-sm border-border/50">
              <CardHeader>
                <CardTitle>Community Dispute System</CardTitle>
                <CardDescription>
                  Ensuring accuracy through collective intelligence
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-4">
                    <h4 className="font-semibold text-lg">When to Dispute</h4>
                    <ul className="space-y-2">
                      <li className="flex items-center gap-2">
                        <ArrowRight className="h-4 w-4 text-green-500" />
                        AI resolution is clearly incorrect
                      </li>
                      <li className="flex items-center gap-2">
                        <ArrowRight className="h-4 w-4 text-green-500" />
                        Ambiguous outcome not properly handled
                      </li>
                      <li className="flex items-center gap-2">
                        <ArrowRight className="h-4 w-4 text-green-500" />
                        New information changes the outcome
                      </li>
                    </ul>
                  </div>
                  <div className="space-y-4">
                    <h4 className="font-semibold text-lg">Dispute Process</h4>
                    <ul className="space-y-2">
                      <li className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-primary" />
                        Stake BNB to initiate dispute
                      </li>
                      <li className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-primary" />
                        Community votes on correct outcome
                      </li>
                      <li className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-primary" />
                        Successful disputes earn rewards
                      </li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Advanced Concepts Tab */}
          <TabsContent value="advanced" className="space-y-8 mt-6">
            {/* Risk Management */}
            <Card className="bg-background/50 backdrop-blur-sm border-border/50">
              <CardHeader>
                <CardTitle>Risk Management</CardTitle>
                <CardDescription>
                  Important considerations for successful trading
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-4">
                    <h4 className="font-semibold text-lg text-green-600">Best Practices</h4>
                    <ul className="space-y-3">
                      <li className="flex items-start gap-2">
                        <TrendingUp className="h-4 w-4 text-green-500 mt-0.5" />
                        <div>
                          <strong>Diversify investments</strong>
                          <p className="text-sm text-muted-foreground">Spread risk across multiple markets</p>
                        </div>
                      </li>
                      <li className="flex items-start gap-2">
                        <BarChart3 className="h-4 w-4 text-green-500 mt-0.5" />
                        <div>
                          <strong>Research thoroughly</strong>
                          <p className="text-sm text-muted-foreground">Understand the market question and context</p>
                        </div>
                      </li>
                      <li className="flex items-start gap-2">
                        <Coins className="h-4 w-4 text-green-500 mt-0.5" />
                        <div>
                          <strong>Manage position size</strong>
                          <p className="text-sm text-muted-foreground">Only risk what you can afford to lose</p>
                        </div>
                      </li>
                    </ul>
                  </div>
                  <div className="space-y-4">
                    <h4 className="font-semibold text-lg text-red-600">Risks to Consider</h4>
                    <ul className="space-y-3">
                      <li className="flex items-start gap-2">
                        <div className="w-2 h-2 rounded-full bg-red-500 mt-2" />
                        <div>
                          <strong>Market volatility</strong>
                          <p className="text-sm text-muted-foreground">Prices can change rapidly</p>
                        </div>
                      </li>
                      <li className="flex items-start gap-2">
                        <div className="w-2 h-2 rounded-full bg-red-500 mt-2" />
                        <div>
                          <strong>Liquidity risk</strong>
                          <p className="text-sm text-muted-foreground">Some markets may have low liquidity</p>
                        </div>
                      </li>
                      <li className="flex items-start gap-2">
                        <div className="w-2 h-2 rounded-full bg-red-500 mt-2" />
                        <div>
                          <strong>Resolution uncertainty</strong>
                          <p className="text-sm text-muted-foreground">Outcomes may be ambiguous</p>
                        </div>
                      </li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Technical Details */}
            <Card className="bg-background/50 backdrop-blur-sm border-border/50">
              <CardHeader>
                <CardTitle>Technical Architecture</CardTitle>
                <CardDescription>
                  How the platform works under the hood
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="grid md:grid-cols-3 gap-4 text-center">
                    <div className="p-4 border rounded-lg bg-card/30 backdrop-blur-sm">
                      <Smartphone className="h-8 w-8 mx-auto mb-2 text-blue-500" />
                      <h4 className="font-semibold">Frontend</h4>
                      <p className="text-sm text-muted-foreground">React-based trading interface</p>
                    </div>
                    <div className="p-4 border rounded-lg bg-card/30 backdrop-blur-sm">
                      <Zap className="h-8 w-8 mx-auto mb-2 text-green-500" />
                      <h4 className="font-semibold">Smart Contracts</h4>
                      <p className="text-sm text-muted-foreground">Solidity contracts on BSC Testnet</p>
                    </div>
                    <div className="p-4 border rounded-lg bg-card/30 backdrop-blur-sm">
                      <Brain className="h-8 w-8 mx-auto mb-2 text-purple-500" />
                      <h4 className="font-semibold">AI Resolution</h4>
                      <p className="text-sm text-muted-foreground">Perplexity AI integration</p>
                    </div>
                  </div>
                  
                  <div className="p-4 bg-muted/50 rounded-lg backdrop-blur-sm border">
                    <h4 className="font-semibold mb-2">Key Contracts</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Prediction Market:</span>
                        <code className="bg-background/50 px-2 py-1 rounded border">0x9d84...fAA</code>
                      </div>
                      <div className="flex justify-between">
                        <span>Helper Contract:</span>
                        <code className="bg-background/50 px-2 py-1 rounded border">0x00B4...2b5</code>
                      </div>
                      <div className="flex justify-between">
                        <span>Network:</span>
                        <span>BNB Smart Chain Testnet (97)</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* FAQ */}
            <Card className="bg-background/50 backdrop-blur-sm border-border/50">
              <CardHeader>
                <CardTitle>Frequently Asked Questions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="border-b border-border/50 pb-4">
                    <h4 className="font-semibold mb-2">What happens if I'm wrong?</h4>
                    <p className="text-sm text-muted-foreground">
                      If your prediction is incorrect, the BNB used to buy positions is lost. Only correct predictions are rewarded.
                    </p>
                  </div>
                  <div className="border-b border-border/50 pb-4">
                    <h4 className="font-semibold mb-2">Can I sell my positions early?</h4>
                    <p className="text-sm text-muted-foreground">
                      Yes! You can swap YES for NO tokens (or vice versa) at any time before market resolution based on current prices.
                    </p>
                  </div>
                  <div className="border-b border-border/50 pb-4">
                    <h4 className="font-semibold mb-2">How are prices determined?</h4>
                    <p className="text-sm text-muted-foreground">
                      Prices are determined algorithmically based on the ratio of tokens in the liquidity pool using a bonding curve model.
                    </p>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">Is this gambling?</h4>
                    <p className="text-sm text-muted-foreground">
                      No, prediction markets are tools for information aggregation and hedging. Successful trading requires research and analysis of real-world events.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Call to Action */}
        <Card className="text-center bg-background/50 backdrop-blur-sm border-border/50">
          <CardContent className="pt-6">
            <h3 className="text-2xl font-bold mb-4">Ready to Start Trading?</h3>
            <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
              Join the decentralized prediction market revolution. Test your knowledge, 
              hedge risks, and earn rewards on BNB Smart Chain Testnet.
            </p>
            <div className="flex gap-4 justify-center flex-wrap">
              <Button size="lg" className="gap-2 bg-primary/90 hover:bg-primary backdrop-blur-sm" asChild>
                <Link href="/markets">
                  <TrendingUp className="h-4 w-4" />
                  Explore Markets
                </Link>
              </Button>
              <Button variant="outline" size="lg" className="gap-2 backdrop-blur-sm" asChild>
                <Link href="/">
                  <Home className="h-4 w-4" />
                  Back to Home
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}