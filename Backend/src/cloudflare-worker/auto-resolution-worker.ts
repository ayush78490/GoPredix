/**
 * Combined Auto-Resolution Cloudflare Worker
 * 
 * This worker runs on a cron schedule and:
 * 1. Scans all BNB and PDX markets
 * 2. Calls requestResolution() for markets that have ended
 * 3. Immediately calls the AI resolution API
 * 4. Calls resolveMarket() on-chain with the AI result
 * 
 * Deploy: wrangler deploy
 * Cron: Runs every 5 minutes
 */

import { ethers } from 'ethers'

// Cloudflare Workers types
type ScheduledEvent = {
    scheduledTime: number
    cron: string
}

type ExecutionContext = {
    waitUntil(promise: Promise<any>): void
    passThroughOnException(): void
}

// Market ABIs
const MARKET_ABI = [
    'function nextMarketId() view returns (uint256)',
    'function markets(uint256) view returns (address creator, string question, string category, uint256 endTime, uint8 status, uint8 outcome, address yesToken, address noToken, uint256 yesPool, uint256 noPool, uint256 lpTotalSupply, uint256 totalBacking, uint256 platformFees, uint256 resolutionRequestedAt, address resolutionRequester, string resolutionReason, uint256 resolutionConfidence)',
    'function requestResolution(uint256 marketId, string reason) returns (bool)',
    'function resolveMarket(uint256 marketId, uint8 outcome, string reason, uint256 confidence) returns (bool)',
]

interface Env {
    RESOLVER_PRIVATE_KEY: string
    RPC_URL: string
    RESOLUTION_API_URL: string
    BNB_MARKET_ADDRESS: string
    PDX_MARKET_ADDRESS: string
}

interface Market {
    creator: string
    question: string
    category: string
    endTime: bigint
    status: number
    outcome: number
    yesPool: bigint
    noPool: bigint
    totalBacking: bigint
    resolutionReason: string
    resolutionConfidence: bigint
    resolutionRequestedAt: bigint
}

interface AIResolutionResponse {
    success: boolean
    outcome: number | null
    confidence: number
    reason: string
}

async function callAIResolutionAPI(
    apiUrl: string,
    question: string,
    endTime: number,
    marketId: number
): Promise<AIResolutionResponse> {
    try {
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                question,
                endTime,
                marketId,
            }),
        })

        if (!response.ok) {
            throw new Error(`AI API returned ${response.status}`)
        }

        const data = await response.json()
        return data
    } catch (error: any) {
        console.error('Error calling AI resolution API:', error.message)
        return {
            success: false,
            outcome: null,
            confidence: 0,
            reason: `Failed to get AI resolution: ${error.message}`,
        }
    }
}

async function processMarket(
    contract: ethers.Contract,
    marketId: number,
    tokenType: 'BNB' | 'PDX',
    env: Env
): Promise<string> {
    try {
        const marketData = await contract.markets(BigInt(marketId))

        // Parse the market data tuple
        const market = {
            creator: marketData[0],
            question: marketData[1],
            category: marketData[2],
            endTime: marketData[3],
            status: Number(marketData[4]),
            outcome: Number(marketData[5]),
            yesPool: marketData[6],
            noPool: marketData[7],
            totalBacking: marketData[8],
            resolutionReason: marketData[9],
            resolutionConfidence: marketData[10],
            resolutionRequestedAt: marketData[11],
        }

        const endTime = Number(market.endTime)
        const status = market.status
        const now = Math.floor(Date.now() / 1000)

        // Status: 0=Open, 1=Closed, 2=ResolutionRequested, 3=Resolved, 4=Disputed

        // Step 1: Request resolution for ended markets
        if (status === 0 && endTime <= now) {
            console.log(`📍 ${tokenType} Market ${marketId}: Requesting resolution...`)

            try {
                const tx = await contract.requestResolution(
                    BigInt(marketId),
                    'Automatic resolution request by Cloudflare Worker'
                )
                await tx.wait()
                console.log(`✅ ${tokenType} Market ${marketId}: Resolution requested`)

                // Continue to step 2 immediately
            } catch (error: any) {
                if (error.message.includes('AlreadyRequested')) {
                    console.log(`ℹ️  ${tokenType} Market ${marketId}: Already requested, proceeding to AI resolution`)
                } else {
                    throw error
                }
            }
        }

        // Step 2: Call AI and resolve markets in ResolutionRequested status
        if (status === 2 || (status === 0 && endTime <= now)) {
            console.log(`🤖 ${tokenType} Market ${marketId}: Calling AI resolution API...`)

            const aiResult = await callAIResolutionAPI(
                env.RESOLUTION_API_URL,
                market.question,
                endTime,
                marketId
            )

            if (aiResult.success && aiResult.outcome !== null && aiResult.confidence >= 70) {
                console.log(`📊 ${tokenType} Market ${marketId}: AI Result - Outcome: ${aiResult.outcome}, Confidence: ${aiResult.confidence}%`)

                try {
                    const tx = await contract.resolveMarket(
                        BigInt(marketId),
                        aiResult.outcome,
                        aiResult.reason,
                        aiResult.confidence
                    )
                    await tx.wait()
                    console.log(`✅ ${tokenType} Market ${marketId}: Resolved on-chain!`)
                    return `${tokenType}-${marketId}: Fully resolved`
                } catch (error: any) {
                    console.error(`❌ ${tokenType} Market ${marketId}: Error resolving on-chain:`, error.message)
                    return `${tokenType}-${marketId}: AI success but on-chain failed`
                }
            } else {
                console.log(`⚠️  ${tokenType} Market ${marketId}: AI confidence too low (${aiResult.confidence}%) or failed`)
                return `${tokenType}-${marketId}: AI confidence too low`
            }
        }

        return `${tokenType}-${marketId}: No action needed (status ${status})`
    } catch (error: any) {
        if (!error.message.includes('Market does not exist')) {
            console.error(`Error processing ${tokenType} market ${marketId}:`, error.message)
        }
        return `${tokenType}-${marketId}: Error - ${error.message}`
    }
}

async function scanAndResolveMarkets(env: Env): Promise<string[]> {
    const results: string[] = []

    try {
        const provider = new ethers.JsonRpcProvider(env.RPC_URL)
        const wallet = new ethers.Wallet(env.RESOLVER_PRIVATE_KEY, provider)

        const bnbContract = new ethers.Contract(env.BNB_MARKET_ADDRESS, MARKET_ABI, wallet)
        const pdxContract = new ethers.Contract(env.PDX_MARKET_ADDRESS, MARKET_ABI, wallet)

        // Get market counts
        const bnbCount = Number(await bnbContract.nextMarketId())
        const pdxCount = Number(await pdxContract.nextMarketId())

        console.log(`\n🔍 Scanning ${bnbCount} BNB markets and ${pdxCount} PDX markets...`)

        // Process BNB markets
        for (let i = 0; i < bnbCount; i++) {
            const result = await processMarket(bnbContract, i, 'BNB', env)
            results.push(result)
        }

        // Process PDX markets
        for (let i = 0; i < pdxCount; i++) {
            const result = await processMarket(pdxContract, i, 'PDX', env)
            results.push(result)
        }

        return results
    } catch (error: any) {
        console.error('Fatal error in scanAndResolveMarkets:', error.message)
        throw error
    }
}

export default {
    async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
        console.log('⏰ Cron triggered at:', new Date().toISOString())

        try {
            const results = await scanAndResolveMarkets(env)
            const resolved = results.filter(r => r.includes('Fully resolved'))
            console.log(`\n✨ Scan complete: ${resolved.length} markets fully resolved`)
        } catch (error: any) {
            console.error('Cron execution error:', error.message)
        }
    },

    async fetch(request: Request, env: Env): Promise<Response> {
        // Manual trigger via HTTP
        console.log('🌐 HTTP trigger at:', new Date().toISOString())

        try {
            const results = await scanAndResolveMarkets(env)
            const resolved = results.filter(r => r.includes('Fully resolved'))

            return new Response(JSON.stringify({
                success: true,
                timestamp: new Date().toISOString(),
                results,
                resolvedCount: resolved.length,
            }), {
                headers: { 'Content-Type': 'application/json' },
            })
        } catch (error: any) {
            return new Response(JSON.stringify({
                success: false,
                error: error.message,
            }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' },
            })
        }
    },
}
