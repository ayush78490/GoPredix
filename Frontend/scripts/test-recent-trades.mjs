import { ethers } from 'ethers'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Load contract ABI
const BNB_MARKET_ARTIFACT = JSON.parse(
    readFileSync(join(__dirname, '../contracts/Bazar.json'), 'utf-8')
)

const extractABI = (artifact) => {
    return ('abi' in artifact ? artifact.abi : artifact)
}

const BNB_MARKET_ABI = extractABI(BNB_MARKET_ARTIFACT)
const BNB_MARKET_ADDRESS = process.env.NEXT_PUBLIC_PREDICTION_MARKET_ADDRESS || '0x9067477bcBAD226572212b56c034F42D402026DF'
const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL || 'https://data-seed-prebsc-1-s1.binance.org:8545'

async function testFetchTrades(marketId) {
    console.log('=== TESTING RECENT TRADES FETCH (NO BLOCK RANGE) ===')
    console.log('Market ID:', marketId)
    console.log('Contract Address:', BNB_MARKET_ADDRESS)
    console.log('RPC URL:', RPC_URL)

    try {
        const provider = new ethers.JsonRpcProvider(RPC_URL)
        const contract = new ethers.Contract(BNB_MARKET_ADDRESS, BNB_MARKET_ABI, provider)

        // Test BuyWithBNB events - NO BLOCK RANGE
        console.log('\n--- Testing BuyWithBNB events (no block range) ---')
        try {
            const buyFilter = contract.filters.BuyWithBNB(marketId)
            console.log('Filter created successfully')

            const buyEvents = await contract.queryFilter(buyFilter)
            console.log('✅ BuyWithBNB events found:', buyEvents.length)

            if (buyEvents.length > 0) {
                console.log('\nSample event:')
                console.log('  Transaction Hash:', buyEvents[0].transactionHash)
                console.log('  Block Number:', buyEvents[0].blockNumber)
                console.log('  Args:', {
                    id: buyEvents[0].args.id?.toString(),
                    user: buyEvents[0].args.user,
                    buyYes: buyEvents[0].args.buyYes,
                    bnbIn: ethers.formatEther(buyEvents[0].args.bnbIn),
                    tokenOut: ethers.formatEther(buyEvents[0].args.tokenOut)
                })
            }
        } catch (err) {
            console.error('❌ Error fetching BuyWithBNB events:', err.message)
            console.error('Stack:', err.stack)
            return
        }

        // Test SellForBNB events - NO BLOCK RANGE
        console.log('\n--- Testing SellForBNB events (no block range) ---')
        try {
            const sellFilter = contract.filters.SellForBNB(marketId)
            console.log('Filter created successfully')

            const sellEvents = await contract.queryFilter(sellFilter)
            console.log('✅ SellForBNB events found:', sellEvents.length)

            if (sellEvents.length > 0) {
                console.log('\nSample event:')
                console.log('  Transaction Hash:', sellEvents[0].transactionHash)
                console.log('  Block Number:', sellEvents[0].blockNumber)
                console.log('  Args:', {
                    id: sellEvents[0].args.id?.toString(),
                    user: sellEvents[0].args.user,
                    sellYes: sellEvents[0].args.sellYes,
                    tokenIn: ethers.formatEther(sellEvents[0].args.tokenIn),
                    bnbOut: ethers.formatEther(sellEvents[0].args.bnbOut)
                })
            }
        } catch (err) {
            console.error('❌ Error fetching SellForBNB events:', err.message)
            console.error('Stack:', err.stack)
            return
        }

        console.log('\n=== ✅ TEST PASSED - Ready to integrate! ===')
    } catch (err) {
        console.error('❌ Fatal error:', err.message)
        console.error('Stack:', err.stack)
    }
}

// Get market ID from command line or use default
const marketId = process.argv[2] ? parseInt(process.argv[2]) : 1

testFetchTrades(marketId)
