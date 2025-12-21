/**
 * Test Redis Connection for Bull Queue
 * 
 * This script tests the Redis connection and Bull queue functionality
 */

import { resolutionQueue, scheduleResolution, getQueueStats, ResolutionJobData } from '../src/services/resolution-queue'

async function testRedisConnection() {
    console.log('🔍 Testing Redis Connection...\n')

    try {
        // Test 1: Check if queue is ready
        console.log('Test 1: Checking queue readiness...')
        const isReady = await resolutionQueue.isReady()
        console.log(`✅ Queue is ready: ${isReady}\n`)

        // Test 2: Get queue stats
        console.log('Test 2: Fetching queue statistics...')
        const stats = await getQueueStats()
        console.log('✅ Queue Stats:', stats, '\n')

        // Test 3: Add a test job
        console.log('Test 3: Adding a test job...')
        const testJob: ResolutionJobData = {
            marketId: 999999,
            paymentToken: 'BNB',
            endTime: Math.floor(Date.now() / 1000) + 60, // 1 minute from now
            question: 'Test Market - Will Redis work?',
            contractAddress: '0x0000000000000000000000000000000000000000'
        }

        await scheduleResolution(testJob)
        console.log('✅ Test job added successfully\n')

        // Test 4: Verify job exists
        console.log('Test 4: Verifying job exists...')
        const jobId = 'BNB-999999'
        const job = await resolutionQueue.getJob(jobId)

        if (job) {
            console.log('✅ Job found:', {
                id: job.id,
                data: job.data,
                delay: job.opts.delay,
            })

            // Clean up test job
            await job.remove()
            console.log('🗑️  Test job removed\n')
        } else {
            console.log('❌ Job not found\n')
        }

        // Test 5: Final stats check
        console.log('Test 5: Final queue statistics...')
        const finalStats = await getQueueStats()
        console.log('✅ Final Stats:', finalStats, '\n')

        console.log('🎉 All tests passed! Redis connection is working correctly.\n')

        // Close the connection
        await resolutionQueue.close()
        console.log('👋 Connection closed.')
        process.exit(0)

    } catch (error) {
        console.error('❌ Test failed:', error)
        console.error('\nPossible issues:')
        console.error('1. Redis server is not running')
        console.error('2. Wrong credentials (REDIS_HOST, REDIS_PORT, REDIS_PASSWORD)')
        console.error('3. Network/firewall issues')
        console.error('4. Redis Cloud endpoint not accessible\n')

        // Try to close connection
        try {
            await resolutionQueue.close()
        } catch (e) {
            // Ignore close errors
        }

        process.exit(1)
    }
}

// Run the test
testRedisConnection()
