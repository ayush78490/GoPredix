import { ethers } from 'ethers'

/**
 * Debug script to check market existence and ownership on BNB Prediction Market
 * Run this in the browser console or as a Node script
 */

async function debugMarketListing() {
    const RPC_URL = 'https://data-seed-prebsc-1-s1.binance.org:8545/'
    const PREDICTION_MARKET_ADDRESS = '0xDD774C850001f193Bc3D1d63B3d6C9E1ba46dE42'
    const BNB_MARKETPLACE_ADDRESS = '0xe334f0B78f5f2Ff153C300386a76d9b3be41Bf66'

    // Ask for market ID to check
    const marketId = prompt('Enter Market ID to check:') || '0'

    console.log('🔍 Debugging Market Listing Issue\n')
    console.log(`Market ID: ${marketId}`)
    console.log(`BNB Prediction Market: ${PREDICTION_MARKET_ADDRESS}`)
    console.log(`BNB Marketplace: ${BNB_MARKETPLACE_ADDRESS}\n`)

    // Connect to provider
    const provider = new ethers.JsonRpcProvider(RPC_URL)

    // Minimal ABI for checking
    const marketABI = [
        'function markets(uint256) view returns (address creator, string question, string category, uint256 endTime, uint8 status, uint8 outcome, address yesToken, address noToken, uint256 yesPool, uint256 noPool, uint256 lpTotalSupply, uint256 totalBacking, uint256 platformFees, uint256 resolutionRequestedAt, address resolutionRequester, string resolutionReason, uint256 resolutionConfidence, uint256 disputeDeadline, address disputer, string disputeReason)',
        'function approvedMarketplaces(address) view returns (bool)',
        'function nextMarketId() view returns (uint256)'
    ]

    const marketplaceABI = [
        'function marketExists(uint256) view returns (bool)',
        'function getMarketOwner(uint256) view returns (address)',
        'function isMarketListed(uint256) view returns (bool)',
        'function predictionMarket() view returns (address)'
    ]

    const predictionMarket = new ethers.Contract(PREDICTION_MARKET_ADDRESS, marketABI, provider)
    const marketplace = new ethers.Contract(BNB_MARKETPLACE_ADDRESS, marketplaceABI, provider)

    try {
        // Get next market ID to see the range
        const nextMarketId = await predictionMarket.nextMarketId()
        console.log(`📊 Next Market ID on contract: ${nextMarketId}`)
        console.log(`   Valid market IDs: 0 to ${Number(nextMarketId) - 1}\n`)

        if (Number(marketId) >= Number(nextMarketId)) {
            console.log(`❌ ERROR: Market #${marketId} does not exist!`)
            console.log(`   The market ID is beyond the current range.`)
            console.log(`   Please create a market first or use an existing market ID.\n`)
            return
        }

        // Check if marketplace is approved
        const isApproved = await predictionMarket.approvedMarketplaces(BNB_MARKETPLACE_ADDRESS)
        console.log(`🔐 Marketplace Approval: ${isApproved ? '✅ APPROVED' : '❌ NOT APPROVED'}\n`)

        // Get market info
        console.log(`🔍 Checking Market #${marketId}...`)
        const market = await predictionMarket.markets(marketId)
        console.log(`   Creator: ${market.creator}`)
        console.log(`   Question: ${market.question}`)
        console.log(`   Status: ${market.status} (0=Open, 1=Closed, 2=ResolutionRequested, 3=Resolved, 4=Disputed)`)
        console.log(`   End Time: ${new Date(Number(market.endTime) * 1000).toLocaleString()}`)
        console.log(`   Total Backing: ${ethers.formatEther(market.totalBacking)} BNB\n`)

        // Check from marketplace perspective
        console.log(`🏪 Marketplace Checks:`)
        const marketExistsFromMarketplace = await marketplace.marketExists(marketId)
        console.log(`   Market exists: ${marketExistsFromMarketplace ? '✅ YES' : '❌ NO'}`)

        if (marketExistsFromMarketplace) {
            const owner = await marketplace.getMarketOwner(marketId)
            console.log(`   Market owner: ${owner}`)

            const isListed = await marketplace.isMarketListed(marketId)
            console.log(`   Already listed: ${isListed ? '✅ YES' : '❌ NO'}\n`)

            // Check if connected wallet is the owner
            if (window.ethereum) {
                const accounts = await window.ethereum.request({ method: 'eth_accounts' })
                if (accounts && accounts.length > 0) {
                    const userAddress = accounts[0]
                    console.log(`👤 Your address: ${userAddress}`)
                    console.log(`   You are the owner: ${owner.toLowerCase() === userAddress.toLowerCase() ? '✅ YES' : '❌ NO'}\n`)

                    if (owner.toLowerCase() !== userAddress.toLowerCase()) {
                        console.log(`❌ PROBLEM: You are not the owner of this market!`)
                        console.log(`   You can only list markets that you created.\n`)
                    } else if (isListed) {
                        console.log(`❌ PROBLEM: This market is already listed!`)
                        console.log(`   You need to cancel the existing listing first.\n`)
                    } else if (market.status !== 0) {
                        console.log(`❌ PROBLEM: This market is not Open!`)
                        console.log(`   Only Open markets can be listed for sale.\n`)
                    } else {
                        console.log(`✅ This market can be listed!`)
                        console.log(`   You should be able to list it for sale.\n`)
                    }
                }
            }
        } else {
            console.log(`\n❌ PROBLEM: Market does not exist from marketplace perspective!`)
            console.log(`   This is strange since we got market data from the prediction market contract.\n`)
        }

    } catch (error) {
        console.error('❌ Error:', error)
        console.error('\nPossible causes:')
        console.error('   1. Market does not exist')
        console.error('   2. RPC connection issue')
        console.error('   3. Contract address mismatch\n')
    }
}

// Auto-run if in browser
if (typeof window !== 'undefined') {
    debugMarketListing()
}

export { debugMarketListing }
