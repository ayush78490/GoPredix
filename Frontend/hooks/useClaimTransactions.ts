import { useState, useEffect, useCallback } from 'react'
import { usePublicClient } from 'wagmi'
import { ethers } from 'ethers'
import BNB_MARKET_ABI from '../contracts/Bazar.json'
import PDX_MARKET_ABI from '../contracts/PDXbazar.json'

const BNB_MARKET_ADDRESS = process.env.NEXT_PUBLIC_PREDICTION_MARKET_ADDRESS as `0x${string}`
const PDX_MARKET_ADDRESS = process.env.NEXT_PUBLIC_PDX_MARKET_ADDRESS as `0x${string}`

export interface ClaimTransaction {
    marketId: number
    claimer: string
    txHash: string
    amount: string
    tokenType: 'BNB' | 'PDX'
    timestamp: number
    blockNumber: number
    marketQuestion?: string
}

export function useClaimTransactions() {
    const publicClient = usePublicClient()
    const [transactions, setTransactions] = useState<ClaimTransaction[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const fetchClaimTransactions = useCallback(async () => {
        if (!publicClient) return

        setIsLoading(true)
        setError(null)

        try {
            const provider = new ethers.BrowserProvider(publicClient.transport as any)

            // Create contract instances
            const bnbMarketContract = new ethers.Contract(BNB_MARKET_ADDRESS, BNB_MARKET_ABI, provider)
            const pdxMarketContract = new ethers.Contract(PDX_MARKET_ADDRESS, PDX_MARKET_ABI, provider)

            // Get current block with retry logic
            let currentBlock: number
            try {
                currentBlock = await provider.getBlockNumber()
            } catch (error) {
                console.warn('Failed to get current block, using default range:', error)
                // Fallback to a reasonable block range if RPC fails
                currentBlock = 45000000 // Approximate recent block on BSC Testnet
            }

            // Search last 500,000 blocks to find historical claims (approximately 2-3 weeks on BSC)
            const fromBlock = Math.max(0, currentBlock - 500000)

            // Fetch events with timeout protection
            const fetchWithTimeout = async (promise: Promise<any>, timeoutMs = 10000) => {
                const timeout = new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('Request timeout')), timeoutMs)
                )
                return Promise.race([promise, timeout])
            }

            let bnbEvents: any[] = []
            let pdxEvents: any[] = []

            // Fetch BNB claim events with error handling
            try {
                const bnbFilter = bnbMarketContract.filters.RedemptionClaimed()
                bnbEvents = await fetchWithTimeout(
                    bnbMarketContract.queryFilter(bnbFilter, fromBlock, 'latest')
                ) as any[]
            } catch (error) {
                console.warn('Failed to fetch BNB claim events:', error)
                // Continue with empty array
            }

            // Fetch PDX claim events with error handling
            try {
                const pdxFilter = pdxMarketContract.filters.RedemptionClaimed()
                pdxEvents = await fetchWithTimeout(
                    pdxMarketContract.queryFilter(pdxFilter, fromBlock, 'latest')
                ) as any[]
            } catch (error) {
                console.warn('Failed to fetch PDX claim events:', error)
                // Continue with empty array
            }

            // Process BNB events
            const bnbResults: (ClaimTransaction | null)[] = await Promise.all(
                bnbEvents.map(async (event) => {
                    try {
                        const block = await event.getBlock()

                        if (!('args' in event)) {
                            throw new Error('Event does not have args')
                        }

                        const marketId = Number(event.args[0])
                        let marketQuestion = `Market ${marketId}`

                        // Try to fetch market question
                        try {
                            const market = await bnbMarketContract.markets(marketId)
                            marketQuestion = market.question || marketQuestion
                        } catch (e) {
                            console.error(`Failed to fetch BNB market ${marketId}:`, e)
                        }

                        return {
                            marketId,
                            claimer: event.args[1] as string,
                            txHash: event.transactionHash,
                            amount: ethers.formatEther(event.args[2]),
                            tokenType: 'BNB' as const,
                            timestamp: Number(block.timestamp),
                            blockNumber: Number(event.blockNumber),
                            marketQuestion
                        } as ClaimTransaction
                    } catch (error) {
                        console.error('Error processing BNB event:', error)
                        return null
                    }
                })
            )
            const bnbTransactions: ClaimTransaction[] = bnbResults.filter((tx): tx is ClaimTransaction => tx !== null)

            // Process PDX events
            const pdxResults: (ClaimTransaction | null)[] = await Promise.all(
                pdxEvents.map(async (event) => {
                    try {
                        const block = await event.getBlock()

                        if (!('args' in event)) {
                            throw new Error('Event does not have args')
                        }

                        const marketId = Number(event.args[0])
                        let marketQuestion = `Market ${marketId}`

                        // Try to fetch market question
                        try {
                            const market = await pdxMarketContract.markets(marketId)
                            marketQuestion = market.question || marketQuestion
                        } catch (e) {
                            console.error(`Failed to fetch PDX market ${marketId}:`, e)
                        }

                        return {
                            marketId,
                            claimer: event.args[1] as string,
                            txHash: event.transactionHash,
                            amount: ethers.formatEther(event.args[2]),
                            tokenType: 'PDX' as const,
                            timestamp: Number(block.timestamp),
                            blockNumber: Number(event.blockNumber),
                            marketQuestion
                        } as ClaimTransaction
                    } catch (error) {
                        console.error('Error processing PDX event:', error)
                        return null
                    }
                })
            )
            const pdxTransactions: ClaimTransaction[] = pdxResults.filter((tx): tx is ClaimTransaction => tx !== null)

            // Combine and sort by timestamp (newest first), then limit to last 5
            const allTransactions: ClaimTransaction[] = [...bnbTransactions, ...pdxTransactions]
                .sort((a, b) => b.timestamp - a.timestamp)
                .slice(0, 5) // Only keep the 5 most recent claims

            setTransactions(allTransactions)
        } catch (err: any) {
            console.error('Error fetching claim transactions:', err)
            // Set a user-friendly error message
            if (err.message?.includes('timeout') || err.message?.includes('timed out')) {
                setError('RPC timeout - please refresh to try again')
            } else {
                setError('Failed to fetch claim transactions')
            }
        } finally {
            setIsLoading(false)
        }
    }, [publicClient])

    useEffect(() => {
        fetchClaimTransactions()
    }, [fetchClaimTransactions])

    return {
        transactions,
        isLoading,
        error,
        refetch: fetchClaimTransactions
    }
}
