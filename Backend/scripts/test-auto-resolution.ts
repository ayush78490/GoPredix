/**
 * End-to-End Test for Auto-Resolution System
 * 
 * Tests the complete flow:
 * 1. Create a market with a short end time
 * 2. Verify it gets scheduled in the queue
 * 3. Wait for it to end
 * 4. Verify auto-resolution is triggered
 */

import dotenv from 'dotenv'
dotenv.config()

import { ethers } from 'ethers'
import { scheduleResolution, getQueueStats, resolutionQueue } from '../src/services/resolution-queue'
import * as fs from 'fs'
import * as path from 'path'

// Configuration
const RPC_URL = process.env.RPC_URL || 'https://bsc-testnet-rpc.publicnode.com'
const PRIVATE_KEY = process.env.RESOLVER_PRIVATE_KEY || ''
const TEST_ENDTIME_MINUTES = 2 // Market will end in 2 minutes

const BNB_MARKET_ADDRESS = '0x7b0fC4c0A9462b8DB2F2bb71e4D66eD60E6B2eB8'

// Load ABI
const bnbAbiPath = path.join(__dirname, '../deployments/latest.json')
const bnbDeployment = JSON.parse(fs.readFileSync(bnbAbiPath, 'utf-8'))

const provider = new ethers.JsonRpcProvider(RPC_URL)
const wallet = new ethers.Wallet(PRIVATE_KEY, provider)
const contract = new ethers.Contract(BNB_MARKET_ADDRESS, bnbDeployment.abi, wallet)

async function testAutoResolution() {
    console.log('\n🧪 Auto-Resolution End-to-End Test\n')
    console.log('═══════════════════════════════════════════════\n')

    try {
        // Check wallet balance
        const balance = await provider.getBalance(wallet.address)
        console.log(`💰 Wallet: ${wallet.address}`)
        console.log(`💵 Balance: ${ethers.formatEther(balance)} BNB\n`)

        if (balance === 0n) {
            console.error('❌ ERROR: Wallet has no BNB for gas fees')
            process.exit(1)
        }

        // Step 1: Get current market count
        const nextMarketId = await contract.nextMarketId()
        const currentMarketId = Number(nextMarketId)
        console.log(`📊 Current nextMarketId: ${currentMarketId}\n`)

        // Step 2: Create a test market
        console.log('📝 Creating test market...')
        const endTime = Math.floor(Date.now() / 1000) + (TEST_ENDTIME_MINUTES * 60)
        const endDate = new Date(endTime * 1000)

        const question = `Test Auto-Resolution: Will this work? (Ends at ${endDate.toISOString()})`

        console.log(`   Question: ${question}`)
        console.log(`   End Time: ${endDate.toISOString()}`)
        console.log(`   Duration: ${TEST_ENDTIME_MINUTES} minutes\n`)

        const createTx = await contract.createMarket(
            question,
            BigInt(endTime),
            { value: ethers.parseEther('0.001') } // 0.001 BNB initial liquidity
        )

        console.log(`   TX Hash: ${createTx.hash}`)
        const receipt = await createTx.wait()
        console.log(`   ✅ Market created in block ${receipt.blockNumber}\n`)

        // Get the created market ID
        const newMarketId = currentMarketId
        console.log(`✅ Test Market ID: ${newMarketId}\n`)

        // Step 3: Manually schedule it in the queue (simulating event listener)
        console.log('📅 Scheduling market in resolution queue...')
        await scheduleResolution({
            marketId: newMarketId,
            paymentToken: 'BNB',
            endTime,
            question,
            contractAddress: BNB_MARKET_ADDRESS,
        })
        console.log('✅ Market scheduled\n')

        // Step 4: Verify job exists in queue
        console.log('🔍 Verifying job in queue...')
        const jobId = `BNB-${newMarketId}`
        const job = await resolutionQueue.getJob(jobId)

        if (job) {
            const delay = job.opts.delay || 0
            const delayMinutes = Math.round(delay / 60000)
            console.log(`✅ Job found in queue!`)
            console.log(`   Job ID: ${job.id}`)
            console.log(`   Delay: ${delayMinutes} minutes`)
            console.log(`   Will process at: ${new Date(Date.now() + delay).toISOString()}\n`)
        } else {
            console.log('❌ Job not found in queue\n')
            process.exit(1)
        }

        // Step 5: Check queue stats
        const stats = await getQueueStats()
        console.log('📊 Queue Statistics:')
        console.log(`   Waiting: ${stats.waiting}`)
        console.log(`   Active: ${stats.active}`)
        console.log(`   Delayed: ${stats.delayed}`)
        console.log(`   Total: ${stats.total}\n`)

        // Step 6: Monitor market status
        console.log('👀 Test Summary:\n')
        console.log(`   Market ID: ${newMarketId}`)
        console.log(`   End Time: ${endDate.toISOString()}`)
        console.log(`   Job ID: ${jobId}`)
        console.log(`   Queue: Scheduled with ${TEST_ENDTIME_MINUTES} minute delay\n`)

        console.log('📋 Next Steps:\n')
        console.log(`1. Start the auto-resolution service:`)
        console.log(`   npx ts-node src/index.ts\n`)
        console.log(`2. Wait ${TEST_ENDTIME_MINUTES} minutes for the market to end\n`)
        console.log(`3. Check if the market gets auto-resolved:\n`)
        console.log(`   Watch the service logs for:`)
        console.log(`   "🔄 Processing resolution job: BNB-${newMarketId}"\n`)
        console.log(`4. Verify market status changed to ResolutionRequested (status=2):\n`)
        console.log(`   You can check the market status on the frontend or via contract call\n`)

        console.log('═══════════════════════════════════════════════\n')
        console.log('✅ Test setup complete!\n')

        // Close queue connection
        await resolutionQueue.close()

    } catch (error: any) {
        console.error('❌ Test failed:', error.message)
        if (error.message.includes('insufficient funds')) {
            console.error('\n💡 TIP: Add some BNB to your wallet:')
            console.error(`   ${wallet.address}\n`)
        }

        try {
            await resolutionQueue.close()
        } catch (e) {
            // Ignore
        }

        process.exit(1)
    }
}

// Run the test
testAutoResolution()
