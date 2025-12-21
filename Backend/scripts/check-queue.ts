/**
 * Check Queue Status
 * 
 * Quick utility to check the current status of the resolution queue
 */

import dotenv from 'dotenv'
dotenv.config()

import { getQueueStats, resolutionQueue } from '../src/services/resolution-queue'

async function checkQueueStatus() {
    try {
        console.log('\n📊 Resolution Queue Status\n')
        console.log('═══════════════════════════════════════════════\n')

        const stats = await getQueueStats()

        console.log('Current Statistics:')
        console.log(`  Waiting:   ${stats.waiting}`)
        console.log(`  Active:    ${stats.active}`)
        console.log(`  Delayed:   ${stats.delayed}`)
        console.log(`  Completed: ${stats.completed}`)
        console.log(`  Failed:    ${stats.failed}`)
        console.log(`  ─────────────────`)
        console.log(`  Total:     ${stats.total}\n`)

        // Get delayed jobs (upcoming resolutions)
        const delayedJobs = await resolutionQueue.getDelayed(0, 10)

        if (delayedJobs.length > 0) {
            console.log('📅 Upcoming Resolutions:\n')
            for (const job of delayedJobs) {
                const delay = job.opts.delay || 0
                const processTime = new Date(job.timestamp + delay)
                const now = new Date()
                const timeRemaining = processTime.getTime() - now.getTime()
                const minutesRemaining = Math.round(timeRemaining / 60000)

                console.log(`  ${job.id}`)
                console.log(`    Market: ${job.data.paymentToken}-${job.data.marketId}`)
                console.log(`    Question: ${job.data.question.substring(0, 60)}...`)
                console.log(`    Process at: ${processTime.toISOString()}`)
                console.log(`    Time remaining: ${minutesRemaining} minutes\n`)
            }
        } else {
            console.log('No upcoming resolutions scheduled.\n')
        }

        // Get failed jobs if any
        const failedJobs = await resolutionQueue.getFailed(0, 5)

        if (failedJobs.length > 0) {
            console.log('❌ Recent Failures:\n')
            for (const job of failedJobs) {
                console.log(`  ${job.id}`)
                console.log(`    Market: ${job.data.paymentToken}-${job.data.marketId}`)
                console.log(`    Error: ${job.failedReason}\n`)
            }
        }

        console.log('═══════════════════════════════════════════════\n')

        await resolutionQueue.close()
        process.exit(0)

    } catch (error: any) {
        console.error('Error:', error.message)

        try {
            await resolutionQueue.close()
        } catch (e) {
            // Ignore
        }

        process.exit(1)
    }
}

checkQueueStatus()
