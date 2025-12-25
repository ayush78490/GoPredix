/**
 * Cloudflare Worker - Auto Market Resolution
 * 
 * This worker runs as a cron job to automatically resolve ended markets
 */

import { ethers } from 'ethers'

// Contract ABIs (minimal - only what we need)
const MARKET_ABI = [
    'function nextMarketId() view returns (uint256)',
    'function markets(uint256) view returns (tuple(address creator, string question, string category, uint256 endTime, uint8 status, uint8 outcome, address yesToken, address noToken, uint256 yesPool, uint256 noPool, uint256 lpTotalSupply, uint256 totalBacking, uint256 platformFees, uint256 resolutionRequestedAt, address resolutionRequester, bytes32 resolutionReason, uint256 resolutionConfidence, uint256 disputeDeadline, address disputer, bytes32 disputeReason))',
    'function requestResolution(uint256 marketId, string reason) returns (bool)'
]

interface Env {
    // Environment variables
    RPC_URL: string
    RESOLVER_PRIVATE_KEY: string
    BNB_MARKET_ADDRESS: string
    PDX_MARKET_ADDRESS: string
    CRON_SECRET: string
}

// Track processed markets (in-memory, resets on worker restart)
const processedMarkets = new Set<string>()

async function checkAndResolveMarket(
    provider: ethers.JsonRpcProvider,
    wallet: ethers.Wallet,
    contractAddress: string,
    marketId: number,
    tokenType: 'BNB' | 'PDX'
): Promise<{ resolved: boolean; message: string }> {
    try {
        const marketKey = `${tokenType}-${marketId}`

        // Skip if already processed
        if (processedMarkets.has(marketKey)) {
            return { resolved: false, message: 'Already processed' }
        }

        const contract = new ethers.Contract(contractAddress, MARKET_ABI, wallet)
        const market = await contract.markets(BigInt(marketId))

        const endTime = Number(market.endTime)
        const status = Number(market.status)
        const now = Math.floor(Date.now() / 1000)

        // Check if market needs resolution
        // Status: 0=Open, 1=Closed, 2=ResolutionRequested, 3=Resolved, 4=Disputed
        const needsResolution = status === 0 && endTime <= now

        if (needsResolution) {
            console.log(`🔍 Found market needing resolution: ${tokenType}-${marketId}`)
            console.log(`   Question: ${market.question}`)

            const tx = await contract.requestResolution(
                BigInt(marketId),
                'Automatic resolution by Cloudflare Worker'
            )

            const receipt = await tx.wait()
            processedMarkets.add(marketKey)

            return {
                resolved: true,
                message: `✅ Resolved ${tokenType}-${marketId} in block ${receipt.blockNumber}`
            }
        }

        return { resolved: false, message: `Market ${marketKey} doesn't need resolution (status: ${status})` }

    } catch (error: any) {
        // Mark as processed if already requested
        if (error.message?.includes('AlreadyRequested') || error.message?.includes('already requested')) {
            processedMarkets.add(`${tokenType}-${marketId}`)
            return { resolved: false, message: 'Already requested' }
        }

        return { resolved: false, message: `Error: ${error.message}` }
    }
}

async function scanAllMarkets(env: Env): Promise<string[]> {
    const results: string[] = []

    try {
        const provider = new ethers.JsonRpcProvider(env.RPC_URL)
        const wallet = new ethers.Wallet(env.RESOLVER_PRIVATE_KEY, provider)

        results.push(`🤖 Market Resolution Check - ${new Date().toISOString()}`)
        results.push(`Resolver: ${wallet.address}`)

        // Check BNB markets
        try {
            const bnbContract = new ethers.Contract(env.BNB_MARKET_ADDRESS, MARKET_ABI, provider)
            const bnbNextId = await bnbContract.nextMarketId()
            const bnbCount = Number(bnbNextId)

            results.push(`\n📊 BNB Markets: 0-${bnbCount - 1}`)

            for (let i = 0; i < bnbCount; i++) {
                const result = await checkAndResolveMarket(provider, wallet, env.BNB_MARKET_ADDRESS, i, 'BNB')
                if (result.resolved) {
                    results.push(`   ${result.message}`)
                }
            }
        } catch (error: any) {
            results.push(`❌ Error scanning BNB markets: ${error.message}`)
        }

        // Check PDX markets
        try {
            const pdxContract = new ethers.Contract(env.PDX_MARKET_ADDRESS, MARKET_ABI, provider)
            const pdxNextId = await pdxContract.nextMarketId()
            const pdxCount = Number(pdxNextId)

            results.push(`\n📊 PDX Markets: 0-${pdxCount - 1}`)

            for (let i = 0; i < pdxCount; i++) {
                const result = await checkAndResolveMarket(provider, wallet, env.PDX_MARKET_ADDRESS, i, 'PDX')
                if (result.resolved) {
                    results.push(`   ${result.message}`)
                }
            }
        } catch (error: any) {
            results.push(`❌ Error scanning PDX markets: ${error.message}`)
        }

        results.push(`\n✅ Scan complete`)

    } catch (error: any) {
        results.push(`❌ Fatal error: ${error.message}`)
    }

    return results
}

export default {
    // Cron trigger handler
    async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
        console.log('🔔 Cron triggered:', new Date(event.scheduledTime).toISOString())

        const results = await scanAllMarkets(env)
        console.log(results.join('\n'))
    },

    // HTTP handler (for manual triggers)
    async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
        const url = new URL(request.url)

        // Health check
        if (url.pathname === '/health') {
            return new Response('OK', { status: 200 })
        }

        // Manual trigger (protected by secret)
        if (url.pathname === '/trigger') {
            const authHeader = request.headers.get('Authorization')
            const expectedAuth = `Bearer ${env.CRON_SECRET}`

            if (authHeader !== expectedAuth) {
                return new Response('Unauthorized', { status: 401 })
            }

            const results = await scanAllMarkets(env)
            return new Response(results.join('\n'), {
                status: 200,
                headers: { 'Content-Type': 'text/plain' }
            })
        }

        return new Response('Not Found', { status: 404 })
    }
}
