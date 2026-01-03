import { useState, useEffect } from 'react'
import { ethers } from 'ethers'
import { Card } from '@/components/ui/card'
import { ExternalLink, Loader2 } from 'lucide-react'
import BNB_MARKET_ABI from '@/contracts/Bazar.json'
import PDX_MARKET_ABI from '@/contracts/PDXbazar.json'

interface Trade {
    trader: string
    isBuy: boolean
    isYes: boolean
    amount: string
    tokenAmount: string
    timestamp: number
    txHash: string
}

interface RecentTradesProps {
    marketId: number
    paymentToken: 'BNB' | 'PDX'
}

const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL || 'https://bsc-testnet.publicnode.com'
const BNB_MARKET_ADDRESS = process.env.NEXT_PUBLIC_PREDICTION_MARKET_ADDRESS!
const PDX_MARKET_ADDRESS = process.env.NEXT_PUBLIC_PDX_MARKET_ADDRESS!
const BSCSCAN_BASE_URL = "https://testnet.bscscan.com/tx/"

export default function RecentTrades({ marketId, paymentToken }: RecentTradesProps) {
    const [trades, setTrades] = useState<Trade[]>([])
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        let isMounted = true

        const fetchTrades = async () => {
            if (!isMounted) return
            setIsLoading(true)

            try {
                const provider = new ethers.JsonRpcProvider(RPC_URL)
                const contractAddress = paymentToken === 'BNB' ? BNB_MARKET_ADDRESS : PDX_MARKET_ADDRESS
                const contractABI = paymentToken === 'BNB' ? BNB_MARKET_ABI : PDX_MARKET_ABI
                const contract = new ethers.Contract(contractAddress, contractABI, provider)

                // 1. Get trades from contract state (Fast and reliable visibility)
                const recentTrades = await contract.getRecentTrades(marketId, 20)

                const mappedTrades = recentTrades.map((t: any) => ({
                    trader: t.trader || t[0],
                    isBuy: t.isBuy !== undefined ? t.isBuy : t[1],
                    isYes: t.isYes !== undefined ? t.isYes : t[2],
                    amount: ethers.formatEther(t.amount || t[3]),
                    tokenAmount: ethers.formatEther(t.tokenAmount || t[4]),
                    timestamp: Number(t.timestamp || t[5]),
                    txHash: '' // Will try to find this below
                }))

                if (isMounted) {
                    setTrades(mappedTrades)
                    setIsLoading(false)
                }

                // 2. Attempt to find txHashes in background (Non-blocking)
                try {
                    const currentBlock = await provider.getBlockNumber()
                    const fromBlock = Math.max(0, currentBlock - 800) // Smaller range to be safer
                    const buyEventName = paymentToken === 'BNB' ? 'BuyWithBNB' : 'BuyWithPDX'
                    const sellEventName = paymentToken === 'BNB' ? 'SellForBNB' : 'SellForPDX'

                    // Sequential fetching with delay to avoid rate limits
                    const buyLogs = await contract.queryFilter(contract.filters[buyEventName](marketId), fromBlock, 'latest')

                    // Delay before next call to avoid batch rate limits
                    await new Promise(r => setTimeout(r, 800))

                    const sellLogs = await contract.queryFilter(contract.filters[sellEventName](marketId), fromBlock, 'latest')

                    const logs = [
                        ...(buyLogs as any[]).map(l => ({ ...l, isBuy: true })),
                        ...(sellLogs as any[]).map(l => ({ ...l, isBuy: false }))
                    ]

                    if (isMounted) {
                        setTrades(prev =>
                            prev.map(trade => {
                                const matchingLog = logs.find(log => {
                                    const args = (log as any).args
                                    if (!args) return false

                                    const logIsBuy = (log as any).isBuy ?? true
                                    const logMarketId = Number(args.marketId ?? args[0])
                                    const logTrader = (args.user ?? args[1]).toLowerCase()
                                    const logIsYes = args.buyYes ?? args.sellYes ?? args.isYes ?? args[2]

                                    // Identify amount: Buy uses index 3, Sell uses index 4
                                    const logAmountRaw = logIsBuy ? (args.amount ?? args[3]) : (args.bnbOut ?? args.pdxOut ?? args[4])
                                    const logAmount = ethers.formatEther(logAmountRaw || '0')

                                    return (
                                        logMarketId === marketId &&
                                        logTrader === trade.trader.toLowerCase() &&
                                        logIsBuy === trade.isBuy &&
                                        logIsYes === trade.isYes &&
                                        parseFloat(logAmount).toFixed(6) ===
                                        parseFloat(trade.amount).toFixed(6)
                                    )
                                })

                                return matchingLog
                                    ? { ...trade, txHash: matchingLog.transactionHash }
                                    : trade
                            })
                        )
                    }
                } catch (logErr) {
                    console.warn('Log fetching sync failed (likely rate limited)', logErr)
                }

            } catch (err) {
                console.error('Error fetching trades:', err)
            } finally {
                if (isMounted) setIsLoading(false)
            }
        }

        fetchTrades()
        const interval = setInterval(fetchTrades, 30000)
        return () => {
            isMounted = false
            clearInterval(interval)
        }
    }, [marketId, paymentToken])

    const formatAddress = (address: string) => {
        return `${address.slice(0, 6)}...${address.slice(-4)}`
    }

    const formatTimeAgo = (timestamp: number) => {
        if (!timestamp) return 'Recent'
        const now = Math.floor(Date.now() / 1000)
        const diff = now - timestamp

        if (diff < 60) return 'Just now'
        if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
        if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
        return `${Math.floor(diff / 86400)}d ago`
    }

    const getTradeLabel = (trade: Trade) => {
        const type = trade.isBuy ? 'Buy' : 'Sell'
        const side = trade.isYes ? 'YES' : 'NO'
        return `${type} ${side}`
    }

    const getTradeColor = (trade: Trade) => {
        if ((trade.isBuy && trade.isYes) || (!trade.isBuy && !trade.isYes)) return 'text-green-400'
        return 'text-red-400'
    }

    if (isLoading && trades.length === 0) {
        return (
            <Card className="p-6 backdrop-blur-sm bg-card/80 border-white/10">
                <h3 className="text-lg font-semibold mb-4 text-white">Recent Trades</h3>
                <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
            </Card>
        )
    }

    return (
        <Card className="p-6 backdrop-blur-sm bg-card/80 border-white/10">
            <h3 className="text-lg font-semibold mb-4 text-white">Recent Trades</h3>

            <div className="space-y-2">
                {trades.map((trade, index) => {
                    const txUrl = trade.txHash ? `${BSCSCAN_BASE_URL}${trade.txHash}` : null

                    const Content = (
                        <div className={`flex items-center justify-between p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-all border border-white/5 group ${txUrl ? 'cursor-pointer' : ''}`}>
                            <div className="flex flex-col gap-1">
                                <div className="flex items-center gap-2">
                                    <span className={`text-[10px] font-bold uppercase tracking-wider ${getTradeColor(trade)}`}>
                                        {getTradeLabel(trade)}
                                    </span>
                                    <span className="text-[10px] text-muted-foreground">
                                        {formatTimeAgo(trade.timestamp)}
                                    </span>
                                </div>
                                <span className="text-xs font-medium text-white/50">
                                    {formatAddress(trade.trader)}
                                </span>
                            </div>

                            <div className="flex flex-col items-end gap-1">
                                <span className="text-sm font-bold text-white italic">
                                    {parseFloat(trade.amount).toFixed(4)} {paymentToken}
                                </span>
                                {txUrl && (
                                    <span className="text-[9px] text-primary group-hover:text-white transition-colors uppercase flex items-center gap-1 font-bold">
                                        Explorer <ExternalLink className="w-2.5 h-2.5" />
                                    </span>
                                )}
                            </div>
                        </div>
                    )

                    return txUrl ? (
                        <a
                            key={`${trade.txHash || index}-${index}`}
                            href={txUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block no-underline outline-none"
                            onClick={() => {
                                console.log('Trade clicked:', {
                                    trader: trade.trader,
                                    amount: trade.amount,
                                    hash: trade.txHash,
                                    url: txUrl,
                                    type: getTradeLabel(trade)
                                });
                            }}
                        >
                            {Content}
                        </a>
                    ) : (
                        <div key={index}>{Content}</div>
                    )
                })}
            </div>
        </Card>
    )
}
