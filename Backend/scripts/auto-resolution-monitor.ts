/**
 * Market Resolution Monitor
 * 
 * This service monitors all markets and automatically requests AI resolution
 * when markets reach their end time.
 * 
 * Run with: npx ts-node scripts/auto-resolution-monitor.ts
 */

import { ethers } from 'ethers'
import * as fs from 'fs'
import * as path from 'path'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config()

// Configuration
const RPC_URL = process.env.RPC_URL || 'https://bsc-testnet-rpc.publicnode.com'
const PRIVATE_KEY = process.env.RESOLVER_PRIVATE_KEY || '' // Dedicated wallet for auto-resolution
const CHECK_INTERVAL_MS = 60 * 1000 // Check every 1 minute

// Contract addresses (from deployments/latest.json)
const BNB_MARKET_ADDRESS = '0x90FD905aB1F479399117F6EB6b3e3E58f94e26f1'
const PDX_MARKET_ADDRESS = '0x151fE04C421E197B982A4F62a65Acd6F416af51a'

// Load ABI (both contracts use the same ABI)
const abiPath = path.join(__dirname, '../abi.json')
const contractAbi = JSON.parse(fs.readFileSync(abiPath, 'utf-8'))

// Setup provider and wallet
const provider = new ethers.JsonRpcProvider(RPC_URL)
const wallet = new ethers.Wallet(PRIVATE_KEY, provider)

// Setup contracts
const bnbMarketContract = new ethers.Contract(
    BNB_MARKET_ADDRESS,
    contractAbi,
    wallet
)

const pdxMarketContract = new ethers.Contract(
    PDX_MARKET_ADDRESS,
    contractAbi,
    wallet
)

// Track processed markets to avoid re-requesting
const processedMarkets = new Set<string>()

async function checkAndResolveMarket(
    contract: ethers.Contract,
    marketId: number,
    tokenType: 'BNB' | 'PDX'
): Promise<boolean> {
    try {
        const marketKey = `${tokenType}-${marketId}`

        // Skip if already processed
        if (processedMarkets.has(marketKey)) {
            return false
        }

        // Get market details
        const market = await contract.getMarketInfo(BigInt(marketId))

        const endTime = Number(market.endTime)
        const status = Number(market.status)
        const now = Math.floor(Date.now() / 1000)

        // Check if market has ended and needs resolution
        // Status: 0=Open, 1=Closed, 2=ResolutionRequested, 3=Resolved, 4=Disputed
        const needsResolution = status === 0 && endTime <= now

        if (needsResolution) {
            console.log(`\n🔍 Found market needing resolution:`)
            console.log(`   Type: ${tokenType}`)
            console.log(`   ID: ${marketId}`)
            console.log(`   Question: ${market.question}`)
            console.log(`   End Time: ${new Date(endTime * 1000).toISOString()}`)

            console.log(`\n⏳ Requesting AI resolution...`)

            try {
                const tx = await contract.requestResolution(
                    BigInt(marketId),
                    'Automatic resolution request by monitoring service'
                )

                console.log(`   Transaction: ${tx.hash}`)
                const receipt = await tx.wait()

                console.log(`✅ Resolution requested successfully!`)
                console.log(`   Block: ${receipt.blockNumber}`)

                // Mark as processed
                processedMarkets.add(marketKey)
                return true

            } catch (error: any) {
                console.error(`❌ Error requesting resolution:`, error.message)

                // If error is "already requested", mark as processed
                if (error.message.includes('AlreadyRequested') ||
                    error.message.includes('already requested')) {
                    processedMarkets.add(marketKey)
                }

                return false
            }
        }

        return false

    } catch (error: any) {
        // Market doesn't exist or other error
        if (!error.message.includes('Market does not exist')) {
            console.error(`Error checking ${tokenType} market ${marketId}:`, error.message)
        }
        return false
    }
}

async function scanAllMarkets() {
    console.log(`\n🔎 Scanning markets at ${new Date().toISOString()}`)

    let resolvedCount = 0

    try {
        // Get BNB market count
        const bnbNextMarketId = await bnbMarketContract.nextMarketId()
        const bnbCount = Number(bnbNextMarketId)
        console.log(`   BNB Markets: 0-${bnbCount - 1}`)

        // Check all BNB markets
        for (let i = 0; i < bnbCount; i++) {
            const resolved = await checkAndResolveMarket(bnbMarketContract, i, 'BNB')
            if (resolved) resolvedCount++
        }

    } catch (error: any) {
        console.error('Error scanning BNB markets:', error.message)
    }

    try {
        // Get PDX market count (assuming similar structure)
        const pdxNextMarketId = await pdxMarketContract.nextMarketId()
        const pdxCount = Number(pdxNextMarketId)
        console.log(`   PDX Markets: 0-${pdxCount - 1}`)

        // Check all PDX markets
        for (let i = 0; i < pdxCount; i++) {
            const resolved = await checkAndResolveMarket(pdxMarketContract, i, 'PDX')
            if (resolved) resolvedCount++
        }

    } catch (error: any) {
        console.error('Error scanning PDX markets:', error.message)
    }

    if (resolvedCount === 0) {
        console.log(`✓ No markets needing resolution`)
    } else {
        console.log(`\n✨ Requested resolution for ${resolvedCount} market(s)`)
    }
}

async function main() {
    console.log('═══════════════════════════════════════════════')
    console.log('🤖 Market Auto-Resolution Monitor')
    console.log('═══════════════════════════════════════════════')
    console.log(`Network: ${RPC_URL}`)
    console.log(`Resolver: ${wallet.address}`)
    console.log(`Check Interval: ${CHECK_INTERVAL_MS / 1000}s`)
    console.log('═══════════════════════════════════════════════')

    // Validate private key
    if (!PRIVATE_KEY || PRIVATE_KEY.length < 32) {
        console.error('❌ ERROR: RESOLVER_PRIVATE_KEY not set in environment')
        console.error('Please set a private key with BNB for gas fees')
        process.exit(1)
    }

    // Check wallet balance
    const balance = await provider.getBalance(wallet.address)
    const balanceBNB = ethers.formatEther(balance)
    console.log(`\n💰 Resolver Balance: ${balanceBNB} BNB`)

    if (parseFloat(balanceBNB) < 0.01) {
        console.warn('⚠️  WARNING: Low balance! Please fund resolver wallet')
    }

    // Initial scan
    await scanAllMarkets()

    // Set up periodic scanning
    console.log(`\n⏰ Starting periodic monitoring...`)
    setInterval(async () => {
        try {
            await scanAllMarkets()
        } catch (error) {
            console.error('Error in scan cycle:', error)
        }
    }, CHECK_INTERVAL_MS)

    // Keep process alive
    process.on('SIGINT', () => {
        console.log('\n\n👋 Shutting down monitor...')
        process.exit(0)
    })
}

// Start the monitor
main().catch((error) => {
    console.error('Fatal error:', error)
    process.exit(1)
})
