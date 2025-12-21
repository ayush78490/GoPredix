/**
 * Event Listener Service
 * 
 * Listens to MarketCreated events and schedules resolution jobs
 */

import { ethers } from 'ethers'
import { scheduleResolution, ResolutionJobData } from './resolution-queue'
import * as fs from 'fs'
import * as path from 'path'

// Configuration
const RPC_URL = process.env.RPC_URL || 'https://bsc-testnet-rpc.publicnode.com'
const BNB_MARKET_ADDRESS = '0x7b0fC4c0A9462b8DB2F2bb71e4D66eD60E6B2eB8'
const PDX_MARKET_ADDRESS = '0x6DFAa6D31E3C99B9461f92524c83b8e4b10f7CDE'

// Load ABIs
const bnbAbiPath = path.join(__dirname, '../../deployments/latest.json')
const pdxAbiPath = path.join(__dirname, '../../deployments/pdx-latest.json')

const bnbDeployment = JSON.parse(fs.readFileSync(bnbAbiPath, 'utf-8'))
const pdxDeployment = JSON.parse(fs.readFileSync(pdxAbiPath, 'utf-8'))

const provider = new ethers.JsonRpcProvider(RPC_URL)

const bnbContract = new ethers.Contract(BNB_MARKET_ADDRESS, bnbDeployment.abi, provider)
const pdxContract = new ethers.Contract(PDX_MARKET_ADDRESS, pdxDeployment.abi, provider)

/**
 * Listen for MarketCreated events and schedule resolutions
 */
export async function startEventListener() {
    console.log('═══════════════════════════════════════════════')
    console.log('👂 Market Event Listener')
    console.log('═══════════════════════════════════════════════')
    console.log(`Network: ${RPC_URL}`)
    console.log(`BNB Contract: ${BNB_MARKET_ADDRESS}`)
    console.log(`PDX Contract: ${PDX_MARKET_ADDRESS}`)
    console.log('═══════════════════════════════════════════════\n')

    // Listen to BNB market events
    bnbContract.on('MarketCreated', async (marketId, creator, question, endTime, event) => {
        try {
            const jobData: ResolutionJobData = {
                marketId: Number(marketId),
                paymentToken: 'BNB',
                endTime: Number(endTime),
                question: question,
                contractAddress: BNB_MARKET_ADDRESS,
            }

            console.log(`\n📢 New BNB Market Created:`)
            console.log(`   ID: ${marketId}`)
            console.log(`   Question: ${question.substring(0, 60)}...`)
            console.log(`   Ends: ${new Date(Number(endTime) * 1000).toISOString()}`)

            await scheduleResolution(jobData)

        } catch (error) {
            console.error('Error scheduling BNB market:', error)
        }
    })

    // Listen to PDX market events
    pdxContract.on('MarketCreated', async (marketId, creator, question, endTime, event) => {
        try {
            const jobData: ResolutionJobData = {
                marketId: Number(marketId),
                paymentToken: 'PDX',
                endTime: Number(endTime),
                question: question,
                contractAddress: PDX_MARKET_ADDRESS,
            }

            console.log(`\n📢 New PDX Market Created:`)
            console.log(`   ID: ${marketId}`)
            console.log(`   Question: ${question.substring(0, 60)}...`)
            console.log(`   Ends: ${new Date(Number(endTime) * 1000).toISOString()}`)

            await scheduleResolution(jobData)

        } catch (error) {
            console.error('Error scheduling PDX market:', error)
        }
    })

    console.log('✅ Event listeners started\n')
    console.log('🎯 Listening for new market creations...\n')
}

/**
 * Backfill existing markets - run once on startup
 */
export async function backfillExistingMarkets() {
    console.log('\n🔄 Backfilling existing markets...\n')

    try {
        // Get BNB markets
        const bnbNextMarketId = await bnbContract.nextMarketId()
        const bnbCount = Number(bnbNextMarketId)

        console.log(`Found ${bnbCount} BNB markets`)

        for (let i = 0; i < bnbCount; i++) {
            try {
                const market = await bnbContract.getMarket(BigInt(i))
                const status = Number(market.status)
                const endTime = Number(market.endTime)
                const now = Math.floor(Date.now() / 1000)

                // Only schedule if market is open and hasn't ended yet
                if (status === 0 && endTime > now) {
                    const jobData: ResolutionJobData = {
                        marketId: i,
                        paymentToken: 'BNB',
                        endTime,
                        question: market.question,
                        contractAddress: BNB_MARKET_ADDRESS,
                    }

                    await scheduleResolution(jobData)
                }
            } catch (error) {
                // Skip markets that don't exist or have errors
            }
        }

        // Get PDX markets
        const pdxNextMarketId = await pdxContract.nextMarketId()
        const pdxCount = Number(pdxNextMarketId)

        console.log(`Found ${pdxCount} PDX markets`)

        for (let i = 0; i < pdxCount; i++) {
            try {
                const market = await pdxContract.getMarket(BigInt(i))
                const status = Number(market.status)
                const endTime = Number(market.endTime)
                const now = Math.floor(Date.now() / 1000)

                // Only schedule if market is open and hasn't ended yet
                if (status === 0 && endTime > now) {
                    const jobData: ResolutionJobData = {
                        marketId: i,
                        paymentToken: 'PDX',
                        endTime,
                        question: market.question,
                        contractAddress: PDX_MARKET_ADDRESS,
                    }

                    await scheduleResolution(jobData)
                }
            } catch (error) {
                // Skip markets that don't exist or have errors
            }
        }

        console.log('\n✅ Backfill complete\n')

    } catch (error) {
        console.error('Error during backfill:', error)
    }
}
