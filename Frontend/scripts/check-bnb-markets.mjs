import { ethers } from 'ethers'
import fs from 'fs'

const RPC_URL = 'https://data-seed-prebsc-1-s1.binance.org:8545/'
const BNB_MARKET_ADDRESS = '0xA2867c105ff7725fb134d838E964Cd291B0e7e76'

const PREDICTION_MARKET_ABI = [
    'function nextMarketId() view returns (uint256)',
    'function getMarketInfo(uint256) view returns (tuple(address creator, string question, string category, uint256 endTime, uint8 status, uint8 outcome, uint256 yesPool, uint256 noPool, uint256 totalBacking))'
]

async function checkBNBMarkets() {
    console.log('🔍 Checking BNB Prediction Market...\n')
    console.log('Contract:', BNB_MARKET_ADDRESS)
    console.log('RPC:', RPC_URL, '\n')

    const provider = new ethers.JsonRpcProvider(RPC_URL)
    const contract = new ethers.Contract(BNB_MARKET_ADDRESS, PREDICTION_MARKET_ABI, provider)

    try {
        const nextId = await contract.nextMarketId()
        const totalMarkets = Number(nextId)

        console.log(`📊 Total Markets in Contract: ${totalMarkets}\n`)

        if (totalMarkets === 0) {
            console.log('⚠️  NO MARKETS FOUND!')
            console.log('   This is why the marketplace is empty')
            console.log('   You need to create BNB markets first!\n')
            return
        }

        console.log('📋 Markets:\n')
        for (let i = 0; i < totalMarkets; i++) {
            try {
                const info = await contract.getMarketInfo(i)
                console.log(`Market ID ${i}:`)
                console.log(`  Creator: ${info.creator}`)
                console.log(`  Question: ${info.question}`)
                console.log(`  Status: ${info.status}`)
                console.log(`  End Time: ${new Date(Number(info.endTime) * 1000).toLocaleString()}`)
                console.log()
            } catch (err) {
                console.log(`Market ID ${i}: ❌ Error fetching - ${err.message}`)
            }
        }
    } catch (error) {
        console.error('❌ Error:', error.message)
    }
}

checkBNBMarkets()
