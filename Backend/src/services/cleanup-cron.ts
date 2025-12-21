/**
 * Cleanup Cron Service
 * 
 * Runs periodically to catch any missed markets and reschedule them
 */

import cron from 'node-cron'
import { ethers } from 'ethers'
import { scheduleResolution, ResolutionJobData, getQueueStats } from './resolution-queue'
import * as fs from 'fs'
import * as path from 'path'

const RPC_URL = process.env.RPC_URL || 'https://bsc-testnet-rpc.publicnode.com'
const BNB_MARKET_ADDRESS = '0x7b0fC4c0A9462b8DB2F2bb71e4D66eD60E6B2eB8'
const PDX_MARKET_ADDRESS = '0x6DFAa6D31E3C99B9461f92524c83b8e4b10f7CDE'

const bnbAbiPath = path.join(__dirname, '../../deployments/latest.json')
const pdxAbiPath = path.join(__dirname, '../../deployments/pdx-latest.json')

const bnbDeployment = JSON.parse(fs.readFileSync(bnbAbiPath, 'utf-8'))
const pdxDeployment = JSON.parse(fs.readFileSync(pdxAbiPath, 'utf-8'))

const provider = new ethers.JsonRpcProvider(RPC_URL)
const bnbContract = new ethers.Contract(BNB_MARKET_ADDRESS, bnbDeployment.abi, provider)
const pdxContract = new ethers.Contract(PDX_MARKET_ADDRESS, pdxDeployment.abi, provider)

/**
 * Scan for markets that need resolution but aren't scheduled
 */
async function cleanupMissedMarkets() {
    console.log('\n🧹 Running cleanup scan...')

    const now = Math.floor(Date.now() / 1000)
    let rescheduled = 0

    try {
        // Check BNB markets
        const bnbNextMarketId = await bnbContract.nextMarketId()
        const bnbCount = Number(bnbNextMarketId)

        for (let i = 0; i < bnbCount; i++) {
            try {
                const market = await bnbContract.getMarket(BigInt(i))
                const status = Number(market.status)
                const endTime = Number(market.endTime)

                // Market ended but not resolved yet
                if (status === 0 && endTime <= now) {
                    console.log(`   Found missed BNB market ${i}`)

                    await scheduleResolution({
                        marketId: i,
                        paymentToken: 'BNB',
                        endTime,
                        question: market.question,
                        contractAddress: BNB_MARKET_ADDRESS,
                    })

                    rescheduled++
                }
            } catch (error) {
                // Skip
            }
        }

        // Check PDX markets
        const pdxNextMarketId = await pdxContract.nextMarketId()
        const pdxCount = Number(pdxNextMarketId)

        for (let i = 0; i < pdxCount; i++) {
            try {
                const market = await pdxContract.getMarket(BigInt(i))
                const status = Number(market.status)
                const endTime = Number(market.endTime)

                // Market ended but not resolved yet
                if (status === 0 && endTime <= now) {
                    console.log(`   Found missed PDX market ${i}`)

                    await scheduleResolution({
                        marketId: i,
                        paymentToken: 'PDX',
                        endTime,
                        question: market.question,
                        contractAddress: PDX_MARKET_ADDRESS,
                    })

                    rescheduled++
                }
            } catch (error) {
                // Skip
            }
        }

        if (rescheduled > 0) {
            console.log(`✅ Rescheduled ${rescheduled} missed market(s)`)
        } else {
            console.log(`✓ No missed markets found`)
        }

        // Print queue stats
        const stats = await getQueueStats()
        console.log(`\n📊 Queue Stats:`)
        console.log(`   Waiting: ${stats.waiting}`)
        console.log(`   Active: ${stats.active}`)
        console.log(`   Delayed: ${stats.delayed}`)
        console.log(`   Failed: ${stats.failed}`)
        console.log(`   Total: ${stats.total}`)

    } catch (error) {
        console.error('Error during cleanup:', error)
    }
}

/**
 * Start cleanup cron job
 * Runs every hour
 */
export function startCleanupCron() {
    console.log('🕐 Starting cleanup cron (runs hourly)\n')

    // Run every hour at minute 0
    cron.schedule('0 * * * *', async () => {
        await cleanupMissedMarkets()
    })

    // Also run once on startup after 1 minute
    setTimeout(async () => {
        await cleanupMissedMarkets()
    }, 60000)
}
