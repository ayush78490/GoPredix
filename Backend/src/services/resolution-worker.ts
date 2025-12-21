/**
 * Resolution Worker
 * 
 * Processes scheduled resolution jobs from the queue
 */

import { resolutionQueue, ResolutionJobData } from './resolution-queue'
import { ethers } from 'ethers'
import * as fs from 'fs'
import * as path from 'path'

// Setup blockchain connection
const RPC_URL = process.env.RPC_URL || 'https://bsc-testnet-rpc.publicnode.com'
const PRIVATE_KEY = process.env.RESOLVER_PRIVATE_KEY || ''

const provider = new ethers.JsonRpcProvider(RPC_URL)
const wallet = new ethers.Wallet(PRIVATE_KEY, provider)

// Load ABIs
const bnbAbiPath = path.join(__dirname, '../../deployments/latest.json')
const pdxAbiPath = path.join(__dirname, '../../deployments/pdx-latest.json')

const bnbDeployment = JSON.parse(fs.readFileSync(bnbAbiPath, 'utf-8'))
const pdxDeployment = JSON.parse(fs.readFileSync(pdxAbiPath, 'utf-8'))

// Cache contracts
const contracts = new Map<string, ethers.Contract>()

function getContract(contractAddress: string, paymentToken: 'BNB' | 'PDX'): ethers.Contract {
    const key = `${paymentToken}-${contractAddress}`

    if (!contracts.has(key)) {
        const abi = paymentToken === 'BNB' ? bnbDeployment.abi : pdxDeployment.abi
        contracts.set(key, new ethers.Contract(contractAddress, abi, wallet))
    }

    return contracts.get(key)!
}

/**
 * Process a resolution job
 */
async function processResolution(job: any): Promise<void> {
    const data: ResolutionJobData = job.data

    console.log(`\n🔄 Processing resolution job: ${job.id}`)
    console.log(`   Market: ${data.paymentToken}-${data.marketId}`)
    console.log(`   Question: ${data.question}`)

    const contract = getContract(data.contractAddress, data.paymentToken)

    try {
        // Double-check market status before requesting
        const market = await contract.getMarket(BigInt(data.marketId))
        const status = Number(market.status)
        const now = Math.floor(Date.now() / 1000)

        // Status: 0=Open, 1=Closed, 2=ResolutionRequested, 3=Resolved, 4=Disputed
        if (status === 0 && Number(market.endTime) <= now) {
            console.log(`   ⏳ Requesting AI resolution...`)

            const tx = await contract.requestResolution(
                BigInt(data.marketId),
                'Automatic resolution by scheduled service'
            )

            console.log(`   TX: ${tx.hash}`)
            const receipt = await tx.wait()

            console.log(`   ✅ Resolution requested! Block: ${receipt.blockNumber}`)

        } else if (status === 2) {
            console.log(`   ℹ️  Resolution already requested, skipping`)
        } else if (status === 3) {
            console.log(`   ℹ️  Market already resolved, skipping`)
        } else if (status === 0 && Number(market.endTime) > now) {
            console.log(`   ⚠️  Market hasn't ended yet, will retry`)
            throw new Error('Market not ended yet')
        } else {
            console.log(`   ℹ️  Market status ${status}, skipping`)
        }

    } catch (error: any) {
        console.error(`   ❌ Error:`, error.message)

        // Don't retry if already requested or resolved
        if (error.message.includes('AlreadyRequested') ||
            error.message.includes('already requested') ||
            error.message.includes('AlreadyResolved')) {
            console.log(`   ℹ️  Skipping retry (already processed)`)
            return
        }

        throw error // Let Bull handle retry
    }
}

/**
 * Start the resolution worker
 */
export function startWorker() {
    console.log('═══════════════════════════════════════════════')
    console.log('🤖 Market Resolution Worker')
    console.log('═══════════════════════════════════════════════')
    console.log(`Network: ${RPC_URL}`)
    console.log(`Resolver: ${wallet.address}`)
    console.log('═══════════════════════════════════════════════\n')

    // Validate configuration
    if (!PRIVATE_KEY || PRIVATE_KEY.length < 32) {
        console.error('❌ ERROR: RESOLVER_PRIVATE_KEY not set')
        process.exit(1)
    }

    // Process jobs from queue
    resolutionQueue.process(async (job) => {
        await processResolution(job)
    })

    console.log('✅ Worker started, waiting for jobs...\n')

    // Graceful shutdown
    process.on('SIGINT', async () => {
        console.log('\n\n👋 Shutting down worker...')
        await resolutionQueue.close()
        process.exit(0)
    })
}
