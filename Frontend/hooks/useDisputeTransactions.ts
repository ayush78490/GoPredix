'use client'

import { useState, useEffect, useCallback } from 'react'
import { usePublicClient } from 'wagmi'
import { ethers } from 'ethers'
import DISPUTE_ABI from '../contracts/DisputeResolution.json'
import PDX_DISPUTE_ABI from '../contracts/PDXDisputeResolution.json'

const DISPUTE_ADDRESS = process.env.NEXT_PUBLIC_DISPUTE_RESOLUTION_ADDRESS as `0x${string}`
const PDX_DISPUTE_ADDRESS = process.env.NEXT_PUBLIC_PDX_DISPUTE_RESOLUTION_ADDRESS as `0x${string}`

export interface DisputeTransaction {
    disputeId: number
    disputer: string
    txHash: string
    amount: string
    tokenType: 'BNB' | 'PDX'
    timestamp: number
    marketId: number
    reason: string
}

export function useDisputeTransactions() {
    const publicClient = usePublicClient()
    const [transactions, setTransactions] = useState<DisputeTransaction[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const fetchDisputeTransactions = useCallback(async () => {
        if (!publicClient) return

        setIsLoading(true)
        setError(null)

        try {
            const provider = new ethers.BrowserProvider(publicClient.transport as any)

            // Create contract instances
            const bnbDisputeContract = new ethers.Contract(DISPUTE_ADDRESS, DISPUTE_ABI, provider)
            const pdxDisputeContract = new ethers.Contract(PDX_DISPUTE_ADDRESS, PDX_DISPUTE_ABI, provider)

            // Define the event filter for DisputeCreated
            const disputeCreatedFilter = bnbDisputeContract.filters.DisputeCreated()
            const pdxDisputeCreatedFilter = pdxDisputeContract.filters.DisputeCreated()

            // Fetch events from the last 10000 blocks (adjust as needed)
            const currentBlock = await provider.getBlockNumber()
            const fromBlock = Math.max(0, currentBlock - 10000)

            // Fetch BNB dispute events
            const bnbEvents = await bnbDisputeContract.queryFilter(
                disputeCreatedFilter,
                fromBlock,
                'latest'
            )

            // Fetch PDX dispute events
            const pdxEvents = await pdxDisputeContract.queryFilter(
                pdxDisputeCreatedFilter,
                fromBlock,
                'latest'
            )

            // Process BNB events
            const bnbTransactions: DisputeTransaction[] = await Promise.all(
                bnbEvents.map(async (event) => {
                    const block = await event.getBlock()

                    // Type guard to ensure we have an EventLog with args
                    if (!('args' in event)) {
                        throw new Error('Event does not have args')
                    }

                    return {
                        disputeId: Number(event.args[0]),
                        disputer: event.args[3] as string,
                        txHash: event.transactionHash,
                        amount: ethers.formatEther(event.args[4]),
                        tokenType: 'BNB' as const,
                        timestamp: block.timestamp,
                        marketId: Number(event.args[2]),
                        reason: event.args[5] as string
                    }
                })
            )

            // Process PDX events
            const pdxTransactions: DisputeTransaction[] = await Promise.all(
                pdxEvents.map(async (event) => {
                    const block = await event.getBlock()

                    // Type guard to ensure we have an EventLog with args
                    if (!('args' in event)) {
                        throw new Error('Event does not have args')
                    }

                    return {
                        disputeId: Number(event.args[0]),
                        disputer: event.args[3] as string,
                        txHash: event.transactionHash,
                        amount: ethers.formatEther(event.args[4]),
                        tokenType: 'PDX' as const,
                        timestamp: block.timestamp,
                        marketId: Number(event.args[2]),
                        reason: event.args[5] as string
                    }
                })
            )

            // Combine and sort by timestamp (newest first)
            const allTransactions = [...bnbTransactions, ...pdxTransactions].sort(
                (a, b) => b.timestamp - a.timestamp
            )

            setTransactions(allTransactions)
        } catch (err: any) {
            console.error('Error fetching dispute transactions:', err)
            setError(err.message || 'Failed to fetch dispute transactions')
        } finally {
            setIsLoading(false)
        }
    }, [publicClient])

    useEffect(() => {
        fetchDisputeTransactions()
    }, [fetchDisputeTransactions])

    return {
        transactions,
        isLoading,
        error,
        refetch: fetchDisputeTransactions
    }
}
