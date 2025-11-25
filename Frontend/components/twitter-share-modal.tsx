"use client"

import { X, Twitter, ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"

interface Market {
    id: number
    question: string
    category: string
    yesPool: string
    noPool: string
    paymentToken: "BNB" | "PDX"
}

interface TwitterShareModalProps {
    market: Market
    onClose: () => void
}

export default function TwitterShareModal({ market, onClose }: TwitterShareModalProps) {
    // Calculate current odds
    const calculatePrices = (yesPool: string, noPool: string) => {
        const yes = parseFloat(yesPool) || 0
        const no = parseFloat(noPool) || 0
        const total = yes + no

        if (total === 0) return { yesPrice: 50, noPrice: 50 }

        return {
            yesPrice: Math.round((yes / total) * 100),
            noPrice: Math.round((no / total) * 100)
        }
    }

    const prices = calculatePrices(market.yesPool, market.noPool)

    // Generate market slug
    const generateSlug = (question: string, id: number): string => {
        const baseSlug = question
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .substring(0, 60)
            .replace(/-$/, '')

        return `${baseSlug}-${market.paymentToken}-${id}` || `market-${market.paymentToken}-${id}`
    }

    const marketSlug = generateSlug(market.question, market.id)
    const marketUrl = `${typeof window !== 'undefined' ? window.location.origin : 'https://gopredix.com'}/markets/${marketSlug}`

    // Generate tweet text
    const tweetText = `🔮 Predict the future on @gopredix

${market.question}

📊 Current odds:
✅ YES: ${prices.yesPrice}%
❌ NO: ${prices.noPrice}%

💰 Trade now: ${marketUrl}

#PredictionMarket #Web3 #${market.category.replace(/\s+/g, '')}`

    // Twitter Web Intent URL
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}`

    const handleTweetNow = () => {
        window.open(twitterUrl, '_blank', 'noopener,noreferrer')
        onClose()
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/90 backdrop-blur-sm" onClick={onClose} />

            <Card className="relative w-full max-w-2xl p-6 max-h-[90vh] overflow-auto">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-2">
                        <Twitter className="h-6 w-6 text-blue-400" />
                        <h3 className="text-xl font-semibold">Share on X (Twitter)</h3>
                    </div>
                    <Button variant="ghost" size="icon" onClick={onClose}>
                        <X className="h-4 w-4" />
                    </Button>
                </div>

                {/* Market Preview */}
                <div className="mb-6 p-4 bg-muted/50 rounded-lg border">
                    <h4 className="font-semibold mb-2">Market Preview</h4>
                    <p className="text-sm mb-3">{market.question}</p>
                    <div className="flex items-center gap-4 text-sm">
                        <span className="px-2 py-1 bg-primary/10 text-primary rounded">
                            {market.category}
                        </span>
                        <span className="px-2 py-1 bg-blue-500/10 text-blue-400 rounded">
                            {market.paymentToken}
                        </span>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                        <div className="p-2 bg-green-500/10 rounded">
                            <span className="text-green-400 font-semibold">YES: {prices.yesPrice}%</span>
                        </div>
                        <div className="p-2 bg-red-500/10 rounded">
                            <span className="text-red-400 font-semibold">NO: {prices.noPrice}%</span>
                        </div>
                    </div>
                </div>

                {/* Tweet Preview */}
                <div className="mb-6">
                    <h4 className="font-semibold mb-2 flex items-center gap-2">
                        Tweet Preview
                        <span className="text-xs text-muted-foreground font-normal">
                            (You can edit on Twitter/X)
                        </span>
                    </h4>
                    <div className="p-4 bg-card border rounded-lg">
                        <pre className="whitespace-pre-wrap text-sm font-sans">{tweetText}</pre>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                        Character count: {tweetText.length}/280
                    </p>
                </div>

                {/* Market Link */}
                <div className="mb-6 p-3 bg-muted/30 rounded-lg">
                    <p className="text-xs text-muted-foreground mb-1">Market Link:</p>
                    <div className="flex items-center gap-2">
                        <code className="text-xs flex-1 truncate">{marketUrl}</code>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => window.open(marketUrl, '_blank')}
                        >
                            <ExternalLink className="h-3 w-3" />
                        </Button>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3">
                    <Button
                        onClick={handleTweetNow}
                        className="flex-1 bg-blue-500 hover:bg-blue-600 text-white gap-2"
                    >
                        <Twitter className="h-4 w-4" />
                        Tweet Now
                    </Button>
                    <Button
                        onClick={onClose}
                        variant="outline"
                        className="flex-1"
                    >
                        Cancel
                    </Button>
                </div>

                <p className="text-xs text-muted-foreground text-center mt-4">
                    Clicking "Tweet Now" will open Twitter/X in a new tab with pre-filled text that you can edit before posting.
                </p>
            </Card>
        </div>
    )
}
