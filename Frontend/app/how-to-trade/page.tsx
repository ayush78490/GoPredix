// app/how-to-trade/page.tsx
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
  Sparkles,
  Play,
  Target,
  Calculator,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  DollarSign,
  PieChart
} from "lucide-react"
import Link from "next/link"
import LightRays from "@/components/LightRays"

export default function HowToTradePage() {
  const [activeTab, setActiveTab] = useState("basics")

  const tradingSteps = [
    {
      icon: <Wallet className="h-6 w-6" />,
      title: "Connect Wallet",
      description: "Connect your Web3 wallet to BNB Smart Chain Testnet",
      details: "Ensure you're on the correct network and have some test BNB for trading."
    },
    {
      icon: <BarChart3 className="h-6 w-6" />,
      title: "Choose a Market",
      description: "Browse active prediction markets",
      details: "Look for questions you have insights about. Check trading volume and liquidity."
    },
    {
      icon: <Target className="h-6 w-6" />,
      title: "Analyze Probabilities",
      description: "Study market prices and implied probabilities",
      details: "YES price = probability of yes outcome. NO price = probability of no outcome."
    },
    {
      icon: <Calculator className="h-6 w-6" />,
      title: "Calculate Potential",
      description: "Use the trade calculator to estimate returns",
      details: "Input your trade amount to see expected payout based on current prices."
    },
    {
      icon: <TrendingUp className="h-6 w-6" />,
      title: "Execute Trade",
      description: "Buy YES or NO positions",
      details: "Set appropriate slippage tolerance and confirm the transaction."
    },
    {
      icon: <Clock className="h-6 w-6" />,
      title: "Monitor & Manage",
      description: "Track your positions and market developments",
      details: "You can exit early by swapping positions or wait for resolution."
    }
  ]

  const tradingStrategies = [
    {
      title: "Information Trading",
      description: "Trade based on unique insights or research",
      icon: <Brain className="h-6 w-6" />,
      tips: [
        "Follow news and developments closely",
        "Use your specialized knowledge",
        "Act before information becomes widespread"
      ]
    },
    {
      title: "Market Making",
      description: "Provide liquidity and earn from spreads",
      icon: <PieChart className="h-6 w-6" />,
      tips: [
        "Create balanced initial liquidity",
        "Monitor market depth",
        "Adjust positions as probabilities shift"
      ]
    },
    {
      title: "Arbitrage",
      description: "Exploit price differences across markets",
      icon: <Zap className="h-6 w-6" />,
      tips: [
        "Look for mispriced probabilities",
        "Quick execution is crucial",
        "Consider transaction costs"
      ]
    },
    {
      title: "Hedging",
      description: "Protect against specific outcomes",
      icon: <Shield className="h-6 w-6" />,
      tips: [
        "Use prediction markets as insurance",
        "Balance your exposure",
        "Consider correlation with other assets"
      ]
    }
  ]

  const riskManagement = [
    {
      aspect: "Position Sizing",
      description: "How much to risk per trade",
      recommendation: "1-5% of total portfolio per market",
      icon: <Calculator className="h-5 w-5" />
    },
    {
      aspect: "Diversification",
      description: "Spread risk across multiple markets",
      recommendation: "Trade 5-10 different markets",
      icon: <PieChart className="h-5 w-5" />
    },
    {
      aspect: "Slippage Tolerance",
      description: "Acceptable price movement during trade",
      recommendation: "2-5% for most markets",
      icon: <AlertTriangle className="h-5 w-5" />
    },
    {
      aspect: "Stop-Loss Strategy",
      description: "When to exit losing positions",
      recommendation: "Consider swapping rather than holding to zero",
      icon: <Target className="h-5 w-5" />
    }
  ]

  const commonScenarios = [
    {
      situation: "Early Confidence",
      action: "Buy YES early when you're confident",
      outcome: "Higher multiplier if correct",
      risk: "Longer holding period, more uncertainty",
      icon: <CheckCircle2 className="h-5 w-5 text-green-500" />
    },
    {
      situation: "Late Information",
      action: "Trade closer to resolution with new info",
      outcome: "Lower risk, more certain outcome",
      risk: "Smaller potential returns",
      icon: <Clock className="h-5 w-5 text-blue-500" />
    },
    {
      situation: "Market Overreaction",
      action: "Fade extreme price movements",
      outcome: "Profit from market correction",
      risk: "Timing the market is difficult",
      icon: <TrendingUp className="h-5 w-5 text-orange-500" />
    },
    {
      situation: "Portfolio Hedge",
      action: "Use NO positions as insurance",
      outcome: "Protect against adverse events",
      risk: "Cost of protection reduces overall returns",
      icon: <Shield className="h-5 w-5 text-purple-500" />
    }
  ]

  const advancedConcepts = [
    {
      term: "Implied Probability",
      definition: "Market's assessment of outcome likelihood derived from token prices",
      formula: "Probability = Token Price × 100%",
      example: "YES at 0.70 = 70% implied probability"
    },
    {
      term: "Expected Value",
      definition: "Average outcome considering all possibilities and their probabilities",
      formula: "EV = (Probability × Profit) - ((1-Probability) × Loss)",
      example: "Crucial for long-term profitability"
    },
    {
      term: "Kelly Criterion",
      definition: "Optimal bet sizing formula for maximizing long-term growth",
      formula: "f* = (p × b - q) / b",
      example: "Where p=win prob, q=loss prob, b=odds"
    },
    {
      term: "Market Efficiency",
      definition: "How quickly prices reflect available information",
      formula: "Look for persistent mispricings",
      example: "Inefficient markets offer more opportunities"
    }
  ]

  return (
    <div className="relative min-h-screen">
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
          className="w-full h-full"
        />
        
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-background/90 via-background/80 to-background/90" />
        
        {/* Subtle Grid Pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(99,102,241,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(99,102,241,0.05)_1px,transparent_1px)] bg-[size:64px_64px] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_50%,black,transparent)]" />
      </div>

      {/* Content */}
      <div className="relative z-10 container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center mb-4">
            <div className="relative">
              <TrendingUp className="h-8 w-8 text-primary mr-3" />
              <Sparkles className="h-4 w-4 text-yellow-400 absolute -top-1 -right-1" />
            </div>
            <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-b from-foreground to-foreground/70 bg-clip-text text-transparent">
              How to Trade Prediction Markets
            </h1>
          </div>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Master the art of prediction market trading. Learn strategies, risk management, and advanced concepts to maximize your returns.
          </p>
        </div>

        {/* Breadcrumb */}
        <div className="flex items-center text-sm text-muted-foreground mb-8">
          <Link href="/" className="hover:text-foreground transition-colors flex items-center">
            <Home className="h-4 w-4 mr-1" />
            Home
          </Link>
          <ArrowRight className="h-4 w-4 mx-2" />
          <span className="text-foreground">How to Trade</span>
        </div>

        {/* Main Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-12">
          <TabsList className="grid w-full grid-cols-4 bg-background/50 backdrop-blur-sm border">
            <TabsTrigger value="basics" className="data-[state=active]:bg-primary/20">
              Trading Basics
            </TabsTrigger>
            <TabsTrigger value="strategies" className="data-[state=active]:bg-primary/20">
              Strategies
            </TabsTrigger>
            <TabsTrigger value="risk" className="data-[state=active]:bg-primary/20">
              Risk Management
            </TabsTrigger>
            <TabsTrigger value="advanced" className="data-[state=active]:bg-primary/20">
              Advanced
            </TabsTrigger>
          </TabsList>

          {/* Trading Basics Tab */}
          <TabsContent value="basics" className="space-y-8 mt-6">
            {/* Step-by-Step Guide */}
            <Card className="bg-background/50 backdrop-blur-sm border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Play className="h-5 w-5" />
                  Step-by-Step Trading Process
                </CardTitle>
                <CardDescription>
                  Follow these 6 steps to execute successful trades
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {tradingSteps.map((step, index) => (
                    <div key={index} className="flex flex-col items-center text-center p-6 border rounded-lg bg-card/50 backdrop-blur-sm hover:bg-card/70 transition-colors group">
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4 border border-primary/20 group-hover:border-primary/40 transition-colors">
                        {step.icon}
                      </div>
                      <Badge variant="secondary" className="mb-2">Step {index + 1}</Badge>
                      <h3 className="font-semibold mb-2">{step.title}</h3>
                      <p className="text-sm text-muted-foreground mb-3">{step.description}</p>
                      <p className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">{step.details}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Quick Start Guide */}
            <div className="grid gap-6 md:grid-cols-2">
              <Card className="bg-background/50 backdrop-blur-sm border-border/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                    Do's
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span className="text-sm">Research markets thoroughly before trading</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span className="text-sm">Start with small positions to learn</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span className="text-sm">Use appropriate slippage tolerance (2-5%)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span className="text-sm">Diversify across multiple markets</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span className="text-sm">Monitor your open positions regularly</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>

              <Card className="bg-background/50 backdrop-blur-sm border-border/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <XCircle className="h-5 w-5 text-red-500" />
                    Don'ts
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    <li className="flex items-start gap-2">
                      <XCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                      <span className="text-sm">Don't risk more than you can afford to lose</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <XCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                      <span className="text-sm">Avoid trading markets you don't understand</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <XCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                      <span className="text-sm">Don't chase losses with larger bets</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <XCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                      <span className="text-sm">Avoid emotional trading decisions</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <XCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                      <span className="text-sm">Don't ignore transaction costs and fees</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Strategies Tab */}
          <TabsContent value="strategies" className="space-y-8 mt-6">
            {/* Trading Strategies */}
            <Card className="bg-background/50 backdrop-blur-sm border-border/50">
              <CardHeader>
                <CardTitle>Proven Trading Strategies</CardTitle>
                <CardDescription>
                  Different approaches for different market conditions and risk profiles
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-6 md:grid-cols-2">
                  {tradingStrategies.map((strategy, index) => (
                    <div key={index} className="p-6 border rounded-lg bg-card/30 backdrop-blur-sm hover:bg-card/50 transition-colors">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20">
                          {strategy.icon}
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg mb-2">{strategy.title}</h3>
                          <p className="text-sm text-muted-foreground mb-4">{strategy.description}</p>
                          <div className="space-y-2">
                            {strategy.tips.map((tip, tipIndex) => (
                              <div key={tipIndex} className="flex items-center gap-2 text-sm">
                                <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                                {tip}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Common Scenarios */}
            <Card className="bg-background/50 backdrop-blur-sm border-border/50">
              <CardHeader>
                <CardTitle>Common Trading Scenarios</CardTitle>
                <CardDescription>
                  How to approach different market situations
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {commonScenarios.map((scenario, index) => (
                    <div key={index} className="p-4 border rounded-lg bg-card/30 backdrop-blur-sm hover:bg-card/50 transition-colors">
                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 rounded-full bg-muted/50 flex items-center justify-center border">
                          {scenario.icon}
                        </div>
                        <div className="flex-1 grid md:grid-cols-3 gap-4">
                          <div>
                            <h4 className="font-semibold text-sm mb-1">Situation</h4>
                            <p className="text-sm">{scenario.situation}</p>
                          </div>
                          <div>
                            <h4 className="font-semibold text-sm mb-1">Action</h4>
                            <p className="text-sm">{scenario.action}</p>
                          </div>
                          <div>
                            <h4 className="font-semibold text-sm mb-1">Outcome/Risk</h4>
                            <p className="text-sm">
                              <span className="text-green-600">✓ {scenario.outcome}</span>
                              <br />
                              <span className="text-red-600">⚠️ {scenario.risk}</span>
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Risk Management Tab */}
          <TabsContent value="risk" className="space-y-8 mt-6">
            {/* Risk Management Framework */}
            <Card className="bg-background/50 backdrop-blur-sm border-border/50">
              <CardHeader>
                <CardTitle>Risk Management Framework</CardTitle>
                <CardDescription>
                  Essential practices to protect your capital and ensure long-term success
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-6 md:grid-cols-2">
                  {riskManagement.map((item, index) => (
                    <div key={index} className="p-6 border rounded-lg bg-card/30 backdrop-blur-sm hover:bg-card/50 transition-colors">
                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20">
                          {item.icon}
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg mb-2">{item.aspect}</h3>
                          <p className="text-sm text-muted-foreground mb-3">{item.description}</p>
                          <div className="p-3 bg-muted/30 rounded-lg border">
                            <p className="text-sm font-medium">Recommendation:</p>
                            <p className="text-sm">{item.recommendation}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Risk Calculator Example */}
            <Card className="bg-background/50 backdrop-blur-sm border-border/50">
              <CardHeader>
                <CardTitle>Position Sizing Calculator</CardTitle>
                <CardDescription>
                  Calculate appropriate position sizes based on your risk tolerance
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-4">
                    <div className="p-4 bg-muted/30 rounded-lg border">
                      <h4 className="font-semibold mb-2">Conservative (1% risk)</h4>
                      <p className="text-sm">Portfolio: $1,000 → Max position: $10</p>
                      <p className="text-xs text-muted-foreground">Ideal for beginners</p>
                    </div>
                    <div className="p-4 bg-muted/30 rounded-lg border">
                      <h4 className="font-semibold mb-2">Moderate (2-3% risk)</h4>
                      <p className="text-sm">Portfolio: $1,000 → Max position: $20-30</p>
                      <p className="text-xs text-muted-foreground">Balanced approach</p>
                    </div>
                    <div className="p-4 bg-muted/30 rounded-lg border">
                      <h4 className="font-semibold mb-2">Aggressive (5% risk)</h4>
                      <p className="text-sm">Portfolio: $1,000 → Max position: $50</p>
                      <p className="text-xs text-muted-foreground">Experienced traders only</p>
                    </div>
                  </div>
                  <div className="p-6 bg-primary/5 rounded-lg border border-primary/20">
                    <h4 className="font-semibold mb-3">Quick Calculation</h4>
                    <div className="space-y-3 text-sm">
                      <p><strong>Your Portfolio:</strong> $1,000</p>
                      <p><strong>Risk per Trade:</strong> 2%</p>
                      <p><strong>Max Position Size:</strong> $20</p>
                      <p><strong>Number of Markets:</strong> 5-10</p>
                      <p><strong>Average Position:</strong> $2-4</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Advanced Tab */}
          <TabsContent value="advanced" className="space-y-8 mt-6">
            {/* Advanced Concepts */}
            <Card className="bg-background/50 backdrop-blur-sm border-border/50">
              <CardHeader>
                <CardTitle>Advanced Trading Concepts</CardTitle>
                <CardDescription>
                  Mathematical foundations and sophisticated strategies for experienced traders
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {advancedConcepts.map((concept, index) => (
                    <div key={index} className="p-6 border rounded-lg bg-card/30 backdrop-blur-sm hover:bg-card/50 transition-colors">
                      <h3 className="font-semibold text-lg mb-3 text-primary">{concept.term}</h3>
                      <p className="text-sm text-muted-foreground mb-3">{concept.definition}</p>
                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="p-3 bg-muted/30 rounded-lg border">
                          <p className="text-sm font-medium mb-1">Formula/Approach</p>
                          <code className="text-xs bg-muted/50 p-2 rounded block">{concept.formula}</code>
                        </div>
                        <div className="p-3 bg-muted/30 rounded-lg border">
                          <p className="text-sm font-medium mb-1">Example</p>
                          <p className="text-sm">{concept.example}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Pro Tips */}
            <Card className="bg-background/50 backdrop-blur-sm border-border/50">
              <CardHeader>
                <CardTitle>Professional Trading Tips</CardTitle>
                <CardDescription>
                  Insights from experienced prediction market traders
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-4">
                    <div className="p-4 border rounded-lg bg-card/30">
                      <h4 className="font-semibold mb-2">Market Selection</h4>
                      <ul className="text-sm space-y-1">
                        <li>• Focus on markets with clear resolution criteria</li>
                        <li>• Avoid ambiguous or subjective questions</li>
                        <li>• Prefer markets with good liquidity</li>
                      </ul>
                    </div>
                    <div className="p-4 border rounded-lg bg-card/30">
                      <h4 className="font-semibold mb-2">Timing Strategies</h4>
                      <ul className="text-sm space-y-1">
                        <li>• Enter early for maximum upside</li>
                        <li>• Use limit orders for better prices</li>
                        <li>• Monitor resolution timelines closely</li>
                      </ul>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="p-4 border rounded-lg bg-card/30">
                      <h4 className="font-semibold mb-2">Portfolio Management</h4>
                      <ul className="text-sm space-y-1">
                        <li>• Rebalance positions as probabilities shift</li>
                        <li>• Take profits on winning positions</li>
                        <li>• Cut losses on clearly wrong positions</li>
                      </ul>
                    </div>
                    <div className="p-4 border rounded-lg bg-card/30">
                      <h4 className="font-semibold mb-2">Psychological Factors</h4>
                      <ul className="text-sm space-y-1">
                        <li>• Avoid confirmation bias</li>
                        <li>• Don't fall in love with your positions</li>
                        <li>• Keep a trading journal</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Call to Action */}
        <Card className="text-center bg-background/50 backdrop-blur-sm border-border/50">
          <CardContent className="pt-6">
            <h3 className="text-2xl font-bold mb-4">Ready to Apply These Strategies?</h3>
            <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
              Put your trading knowledge into practice. Start with small positions and gradually apply these concepts as you gain experience.
            </p>
            <div className="flex gap-4 justify-center flex-wrap">
              <Button size="lg" className="gap-2 bg-primary/90 hover:bg-primary backdrop-blur-sm" asChild>
                <Link href="/markets">
                  <TrendingUp className="h-4 w-4" />
                  Start Trading
                </Link>
              </Button>
              <Button variant="outline" size="lg" className="gap-2 backdrop-blur-sm" asChild>
                <Link href="/howitworks">
                  <BookOpen className="h-4 w-4" />
                  Learn Platform Basics
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