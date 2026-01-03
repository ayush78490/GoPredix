import { useState, useEffect } from 'react'
import { ethers } from 'ethers'
import { Card } from '@/components/ui/card'
import { ExternalLink, TrendingUp, TrendingDown, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import BNB_MARKET_ABI from '@/contracts/Bazar.json'
import PDX_MARKET_ABI from '@/contracts/PDXbazar.json'

interface Trade {
    trader: string
    isBuy: boolean
    isYes: boolean
    amount: bigint
    tokenAmount: bigint
    timestamp: bigint
}

interface RecentTradesProps {
    marketId: number
    paymentToken: 'BNB' | 'PDX'
}

const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL || 'https://data-seed-prebsc-1-s1.binance.org:8545'
const BNB_MARKET_ADDRESS = process.env.NEXT_PUBLIC_PREDICTION_MARKET_ADDRESS!
const PDX_MARKET_ADDRESS = process.env.NEXT_PUBLIC_PDX_MARKET_ADDRESS!

export default function RecentTrades({ marketId, paymentToken }: RecentTradesProps) {
    const [trades, setTrades] = useState<Trade[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        const fetchTrades = async () => {
            setIsLoading(true)
            setError(null)

            try {
                const provider = new ethers.JsonRpcProvider(RPC_URL)
                const contractAddress = paymentToken === 'BNB' ? BNB_MARKET_ADDRESS : PDX_MARKET_ADDRESS
                const contractABI = paymentToken === 'BNB' ? BNB_MARKET_ABI : PDX_MARKET_ABI
                const contract = new ethers.Contract(contractAddress, contractABI, provider)

                // Call the smart contract function to get recent trades
                const recentTrades = await contract.getRecentTrades(marketId, 20)

                setTrades(recentTrades)
            } catch (err: any) {
                console.error('Error fetching trades:', err)
                setError('Failed to load recent trades')
            } finally {
                setIsLoading(false)
            }
        }

        fetchTrades()
    }, [marketId, paymentToken])

    const formatAddress = (address: string) => {
        return `${address.slice(0, 6)}...${address.slice(-4)}`
    }

    const formatTimeAgo = (timestamp: bigint) => {
        const now = Math.floor(Date.now() / 1000)
        const diff = now - Number(timestamp)

        if (diff < 60) return 'Just now'
        if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
        if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
        return `${Math.floor(diff / 86400)}d ago`
    }

    const getTradeType = (trade: Trade): 'BUY_YES' | 'BUY_NO' | 'SELL_YES' | 'SELL_NO' => {
        if (trade.isBuy && trade.isYes) return 'BUY_YES'
        if (trade.isBuy && !trade.isYes) return 'BUY_NO'
        if (!trade.isBuy && trade.isYes) return 'SELL_YES'
        return 'SELL_NO'
    }

    const getTradeColor = (type: string) => {
        if (type === 'BUY_YES' || type === 'SELL_NO') return 'text-green-400'
        return 'text-red-400'
    }

    const getTradeIcon = (type: string) => {
        if (type.startsWith('BUY')) {
            return <TrendingUp className="w-4 h-4" />
        }
        return <TrendingDown className="w-4 h-4" />
    }

    const getTradeLabel = (type: string) => {
        switch (type) {
            case 'BUY_YES': return 'Buy YES'
            case 'BUY_NO': return 'Buy NO'
            case 'SELL_YES': return 'Sell YES'
            case 'SELL_NO': return 'Sell NO'
            default: return type
        }
    }

    if (isLoading) {
        return (
            <Card className="p-6 backdrop-blur-sm bg-card/80">
                <h3 className="text-lg font-semibold mb-4">Recent Trades</h3>
                <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                    <span className="ml-2 text-muted-foreground">Loading trades...</span>
                </div>
            </Card>
        )
    }

    if (error) {
        return (
            <Card className="p-6 backdrop-blur-sm bg-card/80">
                <h3 className="text-lg font-semibold mb-4">Recent Trades</h3>
                <div className="text-center py-8">
                    <p className="text-muted-foreground text-sm">{error}</p>
                </div>
            </Card>
        )
    }

    if (trades.length === 0) {
        return (
            <Card className="p-6 backdrop-blur-sm bg-card/80">
                <h3 className="text-lg font-semibold mb-4">Recent Trades</h3>
                <div className="text-center py-8 text-muted-foreground">
                    <p>No trades yet. Be the first to trade!</p>
                </div>
            </Card>
        )
    }

    return (
        <Card className="p-6 backdrop-blur-sm bg-card/80">
            <h3 className="text-lg font-semibold mb-4">Recent Trades</h3>

            <div className="space-y-3">
                {trades.map((trade, index) => {
                    const tradeType = getTradeType(trade)
                    // Generate a unique key using trader address, timestamp, and index
                    const tradeKey = `${trade.trader}-${trade.timestamp.toString()}-${index}`

                    return (
                        <div
                            key={tradeKey}
                            className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                        >
                            <div className="flex items-center gap-3 flex-1">
                                <div className={getTradeColor(tradeType)}>
                                    {getTradeIcon(tradeType)}
                                </div>

                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <span className={`font-medium text-sm ${getTradeColor(tradeType)}`}>
                                            {getTradeLabel(tradeType)}
                                        </span>
                                        <span className="text-xs text-muted-foreground">
                                            {formatTimeAgo(trade.timestamp)}
                                        </span>
                                    </div>

                                    <div className="flex items-center gap-2 mt-1">
                                        <span className="text-xs text-muted-foreground">
                                            {formatAddress(trade.trader)}
                                        </span>
                                        <span className="text-xs font-medium">
                                            {parseFloat(ethers.formatEther(trade.amount)).toFixed(4)} {paymentToken}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )
                })}
            </div>
        </Card>
    )
}
