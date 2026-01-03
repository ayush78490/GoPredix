import { NextRequest, NextResponse } from 'next/server'
import { ethers } from 'ethers'

const BSCSCAN_API_KEY = process.env.BSCSCAN_API_KEY || 'YourApiKeyToken'
const BNB_MARKET_ADDRESS = process.env.NEXT_PUBLIC_PREDICTION_MARKET_ADDRESS!
const PDX_MARKET_ADDRESS = process.env.NEXT_PUBLIC_PDX_MARKET_ADDRESS!

// Simple in-memory cache
const cache = new Map<string, { data: any[], timestamp: number }>()
const CACHE_DURATION = 60 * 1000 // 1 minute

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams
    const marketId = searchParams.get('marketId')
    const paymentToken = searchParams.get('paymentToken') as 'BNB' | 'PDX'

    if (!marketId || !paymentToken) {
        return NextResponse.json(
            { error: 'Missing marketId or paymentToken' },
            { status: 400 }
        )
    }

    const cacheKey = `${paymentToken}-${marketId}`
    const cached = cache.get(cacheKey)

    // Return cached data if still valid
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
        return NextResponse.json({ trades: cached.data, cached: true })
    }

    try {
        const contractAddress = paymentToken === 'BNB' ? BNB_MARKET_ADDRESS : PDX_MARKET_ADDRESS

        // Use Etherscan V2 unified API with BSC testnet chainid
        const apiUrl = `https://api.etherscan.io/v2/api?chainid=97&module=account&action=txlist&address=${contractAddress}&startblock=0&endblock=99999999&page=1&offset=100&sort=desc&apikey=${BSCSCAN_API_KEY}`

        console.log('Fetching from Etherscan V2 API (BSC testnet chainid=97)')

        const response = await fetch(apiUrl)
        const data = await response.json()

        console.log('API response status:', data.status)
        console.log('API response message:', data.message)

        if (data.status !== '1') {
            console.error('API error:', data.message, data.result)
            // Return empty trades with error message
            return NextResponse.json({
                trades: [],
                cached: false,
                error: data.result || data.message
            })
        }

        if (!data.result || data.result.length === 0) {
            console.log('No transactions found')
            return NextResponse.json({ trades: [], cached: false })
        }

        const trades: any[] = []
        const transactions = data.result

        // Process each transaction
        for (const tx of transactions) {
            // Skip failed transactions
            if (tx.isError === '1') continue

            const input = tx.input

            // Decode function call to identify trade type
            let tradeType: string | null = null

            // Check function signatures (first 10 characters of input)
            const funcSig = input.slice(0, 10)

            // Match function signatures for trade functions
            if (funcSig === '0x7c025200' || funcSig === '0x8a8c523c') {
                tradeType = 'BUY_YES'
            } else if (funcSig === '0x9b3d47b4' || funcSig === '0x4e71d92d') {
                tradeType = 'BUY_NO'
            } else if (funcSig === '0x3ccfd60b') {
                tradeType = 'SELL_YES'
            } else if (funcSig === '0x454a2ab3') {
                tradeType = 'SELL_NO'
            }

            if (!tradeType) continue

            // Extract amount from transaction value (for BNB)
            const amount = ethers.formatEther(tx.value || '0')

            // Only include if amount > 0 or it's a sell transaction
            if (parseFloat(amount) > 0 || tradeType.startsWith('SELL')) {
                trades.push({
                    type: tradeType,
                    trader: tx.from,
                    amount: amount,
                    tokenAmount: '0',
                    timestamp: parseInt(tx.timeStamp),
                    txHash: tx.hash,
                    blockNumber: parseInt(tx.blockNumber)
                })
            }

            // Limit to 20 trades
            if (trades.length >= 20) break
        }

        console.log('Processed trades:', trades.length)

        // Cache the results
        cache.set(cacheKey, { data: trades, timestamp: Date.now() })

        return NextResponse.json({ trades, cached: false })
    } catch (error: any) {
        console.error('Error fetching trades:', error)
        return NextResponse.json(
            { error: 'Failed to fetch trades', message: error.message },
            { status: 500 }
        )
    }
}
