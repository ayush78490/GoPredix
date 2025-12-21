/**
 * Market Resolution Queue
 * 
 * Uses Bull queue with Redis for persistent, scheduled resolution jobs
 */

import dotenv from 'dotenv'
dotenv.config()

import Queue from 'bull'
import { ethers } from 'ethers'

// Queue configuration
const REDIS_HOST = process.env.REDIS_HOST || 'localhost'
const REDIS_PORT = parseInt(process.env.REDIS_PORT || '6379')
const REDIS_PASSWORD = process.env.REDIS_PASSWORD || undefined
const REDIS_TLS = process.env.REDIS_TLS === 'true'

// Create resolution queue
export const resolutionQueue = new Queue('market-resolution', {
    redis: {
        host: REDIS_HOST,
        port: REDIS_PORT,
        password: REDIS_PASSWORD,
        tls: REDIS_TLS ? {
            rejectUnauthorized: false
        } : undefined,
    },
    defaultJobOptions: {
        attempts: 3,
        backoff: {
            type: 'exponential',
            delay: 60000, // 1 minute
        },
        removeOnComplete: true,
        removeOnFail: false,
    },
})

// Job data structure
export interface ResolutionJobData {
    marketId: number
    paymentToken: 'BNB' | 'PDX'
    endTime: number
    question: string
    contractAddress: string
}

/**
 * Schedule a resolution job for a specific market
 */
export async function scheduleResolution(data: ResolutionJobData): Promise<void> {
    const now = Math.floor(Date.now() / 1000)
    const delay = Math.max(0, data.endTime - now) * 1000 // Convert to milliseconds

    // Create unique job ID
    const jobId = `${data.paymentToken}-${data.marketId}`

    // Check if job already exists
    const existingJob = await resolutionQueue.getJob(jobId)
    if (existingJob) {
        console.log(`ℹ️  Job already scheduled for ${jobId}`)
        return
    }

    // Schedule the job
    await resolutionQueue.add(data, {
        jobId,
        delay,
    })

    console.log(`✅ Scheduled resolution for ${jobId} at ${new Date(data.endTime * 1000).toISOString()}`)
}

/**
 * Cancel a scheduled resolution
 */
export async function cancelResolution(marketId: number, paymentToken: 'BNB' | 'PDX'): Promise<void> {
    const jobId = `${paymentToken}-${marketId}`
    const job = await resolutionQueue.getJob(jobId)

    if (job) {
        await job.remove()
        console.log(`🗑️  Cancelled resolution for ${jobId}`)
    }
}

/**
 * Get queue statistics
 */
export async function getQueueStats() {
    const [waiting, active, completed, failed, delayed] = await Promise.all([
        resolutionQueue.getWaitingCount(),
        resolutionQueue.getActiveCount(),
        resolutionQueue.getCompletedCount(),
        resolutionQueue.getFailedCount(),
        resolutionQueue.getDelayedCount(),
    ])

    return {
        waiting,
        active,
        completed,
        failed,
        delayed,
        total: waiting + active + delayed,
    }
}

// Queue event listeners for monitoring
resolutionQueue.on('completed', (job) => {
    console.log(`✅ Job completed: ${job.id}`)
})

resolutionQueue.on('failed', (job, err) => {
    console.error(`❌ Job failed: ${job?.id}`, err.message)
})

resolutionQueue.on('error', (error) => {
    console.error('Queue error:', error)
})
