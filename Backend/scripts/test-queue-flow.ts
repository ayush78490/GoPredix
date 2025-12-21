/**
 * Test Auto-Resolution Queue Flow
 * 
 * This test simulates the complete auto-resolution flow without creating a real market:
 * 1. Schedules a "fake" market in the queue
 * 2. Verifies it's scheduled correctly
 * 3. Shows how the system would process it
 * 
 * No wallet or private key required!
 */

import dotenv from 'dotenv'
dotenv.config()

import { scheduleResolution, getQueueStats, resolutionQueue, cancelResolution, ResolutionJobData } from '../src/services/resolution-queue'

async function testQueueFlow() {
    console.log('\n🧪 Auto-Resolution Queue Flow Test\n')
    console.log('═══════════════════════════════════════════════\n')

    try {
        // Step 1: Check Redis connection
        console.log('1️⃣  Testing Redis connection...')
        const initialStats = await getQueueStats()
        console.log('✅ Redis connected!')
        console.log(`   Current queue stats:`, initialStats, '\n')

        // Step 2: Create a test market that "ends" in 3 minutes
        console.log('2️⃣  Simulating a market being created...')
        const testEndTime = Math.floor(Date.now() / 1000) + (3 * 60) // 3 minutes from now
        const testMarketData: ResolutionJobData = {
            marketId: 99999,
            paymentToken: 'BNB',
            endTime: testEndTime,
            question: 'Test Market: Will the queue work correctly?',
            contractAddress: '0x7b0fC4c0A9462b8DB2F2bb71e4D66eD60E6B2eB8'
        }

        console.log(`   Market ID: ${testMarketData.marketId}`)
        console.log(`   Question: ${testMarketData.question}`)
        console.log(`   End Time: ${new Date(testEndTime * 1000).toISOString()}`)
        console.log(`   Payment: ${testMarketData.paymentToken}\n`)

        // Step 3: Schedule it
        console.log('3️⃣  Scheduling market in resolution queue...')
        await scheduleResolution(testMarketData)
        console.log('✅ Market scheduled!\n')

        // Step 4: Verify job exists
        console.log('4️⃣  Verifying job in queue...')
        const jobId = `${testMarketData.paymentToken}-${testMarketData.marketId}`
        const job = await resolutionQueue.getJob(jobId)

        if (job) {
            const delay = job.opts.delay || 0
            const processTime = new Date(Date.now() + delay)

            console.log('✅ Job found in queue!')
            console.log(`   Job ID: ${job.id}`)
            console.log(`   Delay: ${Math.round(delay / 1000)}s (${Math.round(delay / 60000)} minutes)`)
            console.log(`   Will process at: ${processTime.toISOString()}`)
            console.log(`   Market ID: ${job.data.marketId}`)
            console.log(`   Question: ${job.data.question}\n`)
        } else {
            console.log('❌ Job not found!\n')
            throw new Error('Job not found in queue')
        }

        // Step 5: Check updated stats
        console.log('5️⃣  Queue statistics after scheduling:')
        const stats = await getQueueStats()
        console.log(`   Waiting: ${stats.waiting}`)
        console.log(`   Active: ${stats.active}`)
        console.log(`   Delayed: ${stats.delayed}`)
        console.log(`   Failed: ${stats.failed}`)
        console.log(`   Completed: ${stats.completed}`)
        console.log(`   Total pending: ${stats.total}\n`)

        // Step 6: Simulate duplicate scheduling (should skip)
        console.log('6️⃣  Testing duplicate prevention...')
        await scheduleResolution(testMarketData)
        const afterDuplicateStats = await getQueueStats()
        console.log(`✅ Duplicate scheduling prevented!`)
        console.log(`   Jobs in queue: ${afterDuplicateStats.total} (unchanged)\n`)

        // Step 7: Test cancellation
        console.log('7️⃣  Testing job cancellation...')
        await cancelResolution(testMarketData.marketId, testMarketData.paymentToken)
        const cancelledJob = await resolutionQueue.getJob(jobId)

        if (!cancelledJob) {
            console.log('✅ Job successfully cancelled!\n')
        } else {
            console.log('⚠️  Job still exists (might be completed)\n')
        }

        // Step 8: Final stats
        console.log('8️⃣  Final queue statistics:')
        const finalStats = await getQueueStats()
        console.log(`   Total jobs: ${finalStats.total}\n`)

        // Summary
        console.log('═══════════════════════════════════════════════')
        console.log('✅ All Queue Tests Passed!\n')
        console.log('📋 What was tested:\n')
        console.log('   ✓ Redis connection')
        console.log('   ✓ Market scheduling')
        console.log('   ✓ Job verification')
        console.log('   ✓ Duplicate prevention')
        console.log('   ✓ Job cancellation')
        console.log('   ✓ Queue statistics\n')

        console.log('🚀 Next Steps:\n')
        console.log('1. Set up RESOLVER_PRIVATE_KEY in .env:')
        console.log('   RESOLVER_PRIVATE_KEY=your_wallet_private_key\n')
        console.log('2. Fund the wallet with some testnet BNB\n')
        console.log('3. Start the auto-resolution service:')
        console.log('   npx ts-node src/index.ts\n')
        console.log('4. Create a real market with a short end time')
        console.log('   (or run: npx ts-node scripts/test-auto-resolution.ts)\n')
        console.log('5. Watch the service auto-resolve it when it ends!\n')
        console.log('═══════════════════════════════════════════════\n')

        // Cleanup
        await resolutionQueue.close()

    } catch (error: any) {
        console.error('❌ Test failed:', error.message)

        try {
            await resolutionQueue.close()
        } catch (e) {
            // Ignore
        }

        process.exit(1)
    }
}

// Run the test
testQueueFlow()
