/**
 * Auto Dispute Finalization Monitor
 * 
 * This service monitors all active disputes and automatically finalizes them
 * when the voting period ends. After finalization, the DisputeResolved event
 * is emitted which can be used to notify traders.
 * 
 * Run with: npx ts-node scripts/auto-dispute-finalization-monitor.ts
 */

import { ethers } from 'ethers'
import * as fs from 'fs'
import * as path from 'path'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config()

// Configuration
const RPC_URL = process.env.RPC_URL || 'https://bsc-testnet-rpc.publicnode.com'
const PRIVATE_KEY = process.env.RESOLVER_PRIVATE_KEY || ''
const CHECK_INTERVAL_MS = 60 * 1000 // Check every 1 minute

// Load deployment info
const deploymentPath = path.join(__dirname, '../deployments/latest.json')
const deployment = JSON.parse(fs.readFileSync(deploymentPath, 'utf-8'))

const BNB_DISPUTE_ADDRESS = deployment.contracts.disputeResolution
const PDX_DISPUTE_ADDRESS = deployment.contracts.pdxDisputeResolution

// Load ABI from Frontend contracts directory
const disputeAbiPath = path.join(__dirname, '../../Frontend/contracts/DisputeResolution.json')
const disputeAbi = JSON.parse(fs.readFileSync(disputeAbiPath, 'utf-8'))

// Setup provider and wallet
const provider = new ethers.JsonRpcProvider(RPC_URL)
const wallet = new ethers.Wallet(PRIVATE_KEY, provider)

// Setup contracts
const bnbDisputeContract = new ethers.Contract(
    BNB_DISPUTE_ADDRESS,
    disputeAbi,
    wallet
)

const pdxDisputeContract = new ethers.Contract(
    PDX_DISPUTE_ADDRESS,
    disputeAbi,
    wallet
)

// Track processed disputes to avoid re-finalizing
const processedDisputes = new Set<string>()

interface DisputeInfo {
    disputeId: number
    status: number
    votingEndTime: number
    marketContract: string
    marketId: number
}

async function getDisputeInfo(
    contract: ethers.Contract,
    disputeId: number
): Promise<DisputeInfo | null> {
    try {
        const info = await contract.getDisputeInfo(disputeId)

        return {
            disputeId,
            status: Number(info.status),
            votingEndTime: Number(info.votingEndTime),
            marketContract: info.marketContract,
            marketId: Number(info.marketId)
        }
    } catch (error) {
        return null
    }
}

async function finalizeDisputeIfReady(
    contract: ethers.Contract,
    disputeId: number,
    tokenType: 'BNB' | 'PDX'
): Promise<boolean> {
    try {
        const disputeKey = `${tokenType}-${disputeId}`

        // Skip if already processed
        if (processedDisputes.has(disputeKey)) {
            return false
        }

        const disputeInfo = await getDisputeInfo(contract, disputeId)
        if (!disputeInfo) {
            return false
        }

        const now = Math.floor(Date.now() / 1000)

        // Status: 0=Active, 1=VotingInProgress, 2=Resolved, 3=RejectedByAuthority
        const isActive = disputeInfo.status === 0
        const votingEnded = disputeInfo.votingEndTime <= now

        if (isActive && votingEnded) {
            console.log(`\n🔍 Found dispute ready for finalization:`)
            console.log(`   Type: ${tokenType}`)
            console.log(`   Dispute ID: ${disputeId}`)
            console.log(`   Market: ${disputeInfo.marketContract}`)
            console.log(`   Market ID: ${disputeInfo.marketId}`)
            console.log(`   Voting Ended: ${new Date(disputeInfo.votingEndTime * 1000).toISOString()}`)

            console.log(`\n⏳ Finalizing dispute...`)

            try {
                const tx = await contract.finalizeDispute(BigInt(disputeId))
                console.log(`   Transaction: ${tx.hash}`)

                const receipt = await tx.wait()
                console.log(`✅ Dispute finalized successfully!`)
                console.log(`   Block: ${receipt.blockNumber}`)

                // Parse DisputeResolved event
                const disputeResolvedEvent = receipt.logs
                    .map((log: any) => {
                        try {
                            return contract.interface.parseLog(log)
                        } catch {
                            return null
                        }
                    })
                    .find((event: any) => event?.name === 'DisputeResolved')

                if (disputeResolvedEvent) {
                    const outcome = Number(disputeResolvedEvent.args[1])
                    const outcomeText = outcome === 1 ? 'ACCEPTED' : 'REJECTED'
                    console.log(`   Outcome: ${outcomeText}`)
                    console.log(`   Accept Stake: ${ethers.formatEther(disputeResolvedEvent.args[2])}`)
                    console.log(`   Reject Stake: ${ethers.formatEther(disputeResolvedEvent.args[3])}`)
                }

                // Mark as processed
                processedDisputes.add(disputeKey)
                return true

            } catch (error: any) {
                console.error(`❌ Error finalizing dispute:`, error.message)

                // If already finalized, mark as processed
                if (error.message.includes('dispute not active')) {
                    processedDisputes.add(disputeKey)
                }

                return false
            }
        }

        return false

    } catch (error: any) {
        console.error(`Error checking ${tokenType} dispute ${disputeId}:`, error.message)
        return false
    }
}

async function scanAllDisputes() {
    console.log(`\n🔎 Scanning disputes at ${new Date().toISOString()}`)

    let finalizedCount = 0

    try {
        // Fetch BNB DisputeCreated events from the last 10000 blocks
        const currentBlock = await provider.getBlockNumber()
        const fromBlock = Math.max(0, currentBlock - 10000)

        console.log(`   Scanning blocks ${fromBlock} to ${currentBlock}`)

        // Get BNB dispute events
        const bnbFilter = bnbDisputeContract.filters.DisputeCreated()
        const bnbEvents = await bnbDisputeContract.queryFilter(bnbFilter, fromBlock, 'latest')

        console.log(`   BNB Disputes found: ${bnbEvents.length}`)

        // Check each BNB dispute
        for (const event of bnbEvents) {
            if ('args' in event && event.args) {
                const disputeId = Number(event.args[0])
                const finalized = await finalizeDisputeIfReady(bnbDisputeContract, disputeId, 'BNB')
                if (finalized) finalizedCount++
            }
        }

    } catch (error: any) {
        console.error('Error scanning BNB disputes:', error.message)
    }

    try {
        // Get PDX dispute events
        const pdxFilter = pdxDisputeContract.filters.DisputeCreated()
        const pdxEvents = await pdxDisputeContract.queryFilter(pdxFilter, Math.max(0, await provider.getBlockNumber() - 10000), 'latest')

        console.log(`   PDX Disputes found: ${pdxEvents.length}`)

        // Check each PDX dispute
        for (const event of pdxEvents) {
            if ('args' in event && event.args) {
                const disputeId = Number(event.args[0])
                const finalized = await finalizeDisputeIfReady(pdxDisputeContract, disputeId, 'PDX')
                if (finalized) finalizedCount++
            }
        }

    } catch (error: any) {
        console.error('Error scanning PDX disputes:', error.message)
    }

    if (finalizedCount === 0) {
        console.log(`✓ No disputes ready for finalization`)
    } else {
        console.log(`\n✨ Finalized ${finalizedCount} dispute(s)`)
    }
}

async function main() {
    console.log('═══════════════════════════════════════════════')
    console.log('⚖️  Auto Dispute Finalization Monitor')
    console.log('═══════════════════════════════════════════════')
    console.log(`Network: ${RPC_URL}`)
    console.log(`Finalizer: ${wallet.address}`)
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
    console.log(`\n💰 Finalizer Balance: ${balanceBNB} BNB`)

    if (parseFloat(balanceBNB) < 0.01) {
        console.warn('⚠️  WARNING: Low balance! Please fund finalizer wallet')
    }

    // Initial scan
    await scanAllDisputes()

    // Set up periodic scanning
    console.log(`\n⏰ Starting periodic monitoring...`)
    setInterval(async () => {
        try {
            await scanAllDisputes()
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
