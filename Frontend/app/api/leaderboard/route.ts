import { NextRequest, NextResponse } from 'next/server'
import { ethers } from 'ethers'

// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic'

const BNB_TESTNET_RPC = process.env.NEXT_PUBLIC_BSC_TESTNET_RPC || 'https://data-seed-prebsc-1-s1.binance.org:8545/'
const PDX_TESTNET_RPC = 'https://data-seed-prebsc-1-s1.bnbchain.org:8545' // PDX markets are also on BSC Testnet

const BNB_MARKET_ADDRESS = process.env.NEXT_PUBLIC_PREDICTION_MARKET_ADDRESS
const PDX_MARKET_ADDRESS = process.env.NEXT_PUBLIC_PDX_MARKET_ADDRESS
const BNB_HELPER_ADDRESS = process.env.NEXT_PUBLIC_HELPER_CONTRACT_ADDRESS
const PDX_HELPER_ADDRESS = process.env.NEXT_PUBLIC_PDX_HELPER_ADDRESS

// Minimal ABIs for what we need
interface UserStats {
    address: string
    totalInvestment: string
    bnbInvestment: string
    pdxInvestment: string
    totalVolume: number
    totalPositions: number
    totalProfit: string
    realizedProfit: string
    unrealizedProfit: string
    profitPercent: number
}

const BNB_MARKET_ABI = [
    'function nextMarketId() view returns (uint256)',
    'function markets(uint256) view returns (address creator, string question, string category, uint256 endTime, uint8 status, uint8 outcome, uint256 yesPool, uint256 noPool, uint256 totalBacking)',
    'function userInvestments(uint256 marketId, address user) view returns (uint256 totalInvested, uint256 yesBalance, uint256 noBalance)',
    'event RedemptionClaimed(uint256 indexed marketId, address indexed user, uint256 amount)',
]

const PDX_MARKET_ABI = [
    'function nextMarketId() view returns (uint256)',
    'function markets(uint256) view returns (address creator, string question, string category, uint256 endTime, uint8 status, uint8 outcome, address yesToken, address noToken, uint256 yesPool, uint256 noPool, uint256 totalBacking)',
    'function userInvestments(uint256 marketId, address user) view returns (uint256 totalInvested, uint256 yesBalance, uint256 noBalance)',
    'event RedemptionClaimed(uint256 indexed marketId, address indexed user, uint256 amount)',
]

const HELPER_ABI = [
    'function getUserTotalInvestment(address user) view returns (uint256)',
]

const OUTCOME_TOKEN_ABI = [
    'function balanceOf(address) view returns (uint256)',
]

// Helper to delay between RPC calls
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

// Calculate prices from pools
function calculatePrices(yesPool: string, noPool: string) {
    const yes = parseFloat(yesPool) || 0
    const no = parseFloat(noPool) || 0
    const total = yes + no

    if (total === 0) return { yesPrice: 50, noPrice: 50 }

    return {
        yesPrice: (yes / total) * 100,
        noPrice: (no / total) * 100
    }
}

export async function GET(request: NextRequest) {
    try {
        // Initialize providers
        const bnbProvider = new ethers.JsonRpcProvider(BNB_TESTNET_RPC)
        const pdxProvider = new ethers.JsonRpcProvider(PDX_TESTNET_RPC)

        // Check which addresses are missing
        const missingAddresses = []
        if (!BNB_MARKET_ADDRESS) missingAddresses.push('NEXT_PUBLIC_PREDICTION_MARKET_ADDRESS')
        if (!PDX_MARKET_ADDRESS) missingAddresses.push('NEXT_PUBLIC_PDX_MARKET_ADDRESS')
        if (!BNB_HELPER_ADDRESS) missingAddresses.push('NEXT_PUBLIC_HELPER_CONTRACT_ADDRESS')
        if (!PDX_HELPER_ADDRESS) missingAddresses.push('NEXT_PUBLIC_PDX_HELPER_ADDRESS')

        if (missingAddresses.length > 0) {
            return NextResponse.json(
                { error: `Contract addresses not configured: ${missingAddresses.join(', ')}` },
                { status: 500 }
            )
        }

        // TypeScript assertions: these are guaranteed to be defined after the check above
        const bnbContract = new ethers.Contract(BNB_MARKET_ADDRESS!, BNB_MARKET_ABI, bnbProvider)
        const pdxContract = new ethers.Contract(PDX_MARKET_ADDRESS!, PDX_MARKET_ABI, pdxProvider)
        const bnbHelperContract = new ethers.Contract(BNB_HELPER_ADDRESS!, HELPER_ABI, bnbProvider)
        const pdxHelperContract = new ethers.Contract(PDX_HELPER_ADDRESS!, HELPER_ABI, pdxProvider)

        // Get total market counts
        const [bnbNextId, pdxNextId] = await Promise.all([
            bnbContract.nextMarketId(),
            pdxContract.nextMarketId()
        ])

        const bnbMarketCount = Number(bnbNextId)
        const pdxMarketCount = Number(pdxNextId)

        console.log(`Fetching ${bnbMarketCount} BNB markets and ${pdxMarketCount} PDX markets`)

        // Fetch all markets sequentially with delays
        const allMarkets: any[] = []
        const traders = new Set<string>()

        // Fetch BNB markets
        for (let i = 0; i < bnbMarketCount; i++) {
            try {
                const market = await bnbContract.markets(i)
                const marketData = {
                    id: i,
                    creator: market[0],
                    question: market[1],
                    category: market[2],
                    endTime: Number(market[3]),
                    status: Number(market[4]),
                    outcome: Number(market[5]),
                    yesPool: ethers.formatEther(market[6]),
                    noPool: ethers.formatEther(market[7]),
                    totalBacking: ethers.formatEther(market[8]),
                    paymentToken: 'BNB'
                }

                if (marketData.question && marketData.creator !== '0x0000000000000000000000000000000000000000') {
                    allMarkets.push(marketData)
                    traders.add(marketData.creator.toLowerCase())
                }

                // Delay between requests
                if (i < bnbMarketCount - 1) {
                    await delay(150)
                }
            } catch (error) {
                console.error(`Error fetching BNB market ${i}:`, error)
            }
        }

        // Fetch PDX markets
        for (let i = 0; i < pdxMarketCount; i++) {
            try {
                const market = await pdxContract.markets(i)
                const marketData = {
                    id: i,
                    creator: market[0],
                    question: market[1],
                    category: market[2],
                    endTime: Number(market[3]),
                    status: Number(market[4]),
                    outcome: Number(market[5]),
                    yesToken: market[6],
                    noToken: market[7],
                    yesPool: ethers.formatEther(market[8]),
                    noPool: ethers.formatEther(market[9]),
                    totalBacking: ethers.formatEther(market[10]),
                    paymentToken: 'PDX'
                }

                if (marketData.question && marketData.creator !== '0x0000000000000000000000000000000000000000') {
                    allMarkets.push(marketData)
                    traders.add(marketData.creator.toLowerCase())
                }

                // Delay between requests
                if (i < pdxMarketCount - 1) {
                    await delay(150)
                }
            } catch (error) {
                console.error(`Error fetching PDX market ${i}:`, error)
            }
        }

        // Now calculate stats for each trader (limit to top 15)
        const tradersList = Array.from(traders).slice(0, 15)
        const userStats: UserStats[] = []

        for (const trader of tradersList) {
            try {
                let bnbInvestment = '0'
                let pdxInvestment = '0'
                let totalVolume = 0
                let totalPositions = 0
                let realizedProfit = 0
                let unrealizedProfit = 0

                // Get BNB investment using helper contract
                try {
                    const bnbInv = await bnbHelperContract.getUserTotalInvestment(trader)
                    bnbInvestment = ethers.formatEther(bnbInv)
                    if (parseFloat(bnbInvestment) > 0) {
                        totalVolume += parseFloat(bnbInvestment)
                    }
                } catch (err) {
                    console.error(`Error getting BNB investment for ${trader}:`, err)
                }

                // Get PDX investment using helper contract  
                try {
                    const pdxInv = await pdxHelperContract.getUserTotalInvestment(trader)
                    pdxInvestment = ethers.formatEther(pdxInv)
                    if (parseFloat(pdxInvestment) > 0) {
                        totalVolume += parseFloat(pdxInvestment)
                    }
                } catch (err) {
                    console.error(`Error getting PDX investment for ${trader}:`, err)
                }

                // Calculate realized profits from RedemptionClaimed events
                try {
                    const currentBlock = await bnbProvider.getBlockNumber()
                    const fromBlock = Math.max(0, currentBlock - 100000)

                    // BNB claims
                    const bnbClaimFilter = bnbContract.filters.RedemptionClaimed(null, trader)
                    const bnbClaims = await bnbContract.queryFilter(bnbClaimFilter, fromBlock, 'latest')
                    for (const claim of bnbClaims) {
                        if ('args' in claim) {
                            realizedProfit += parseFloat(ethers.formatEther(claim.args[2]))
                        }
                    }

                    // PDX claims
                    const pdxClaimFilter = pdxContract.filters.RedemptionClaimed(null, trader)
                    const pdxClaims = await pdxContract.queryFilter(pdxClaimFilter, fromBlock, 'latest')
                    for (const claim of pdxClaims) {
                        if ('args' in claim) {
                            realizedProfit += parseFloat(ethers.formatEther(claim.args[2]))
                        }
                    }
                } catch (err) {
                    console.error(`Error fetching claims for ${trader}:`, err)
                }

                // Calculate unrealized profits from current positions
                try {
                    for (const market of allMarkets) {
                        try {
                            const contract = market.paymentToken === 'BNB' ? bnbContract : pdxContract
                            const investment = await contract.userInvestments(market.id, trader)

                            const totalInvested = parseFloat(ethers.formatEther(investment[0]))
                            const yesBalance = parseFloat(ethers.formatEther(investment[1]))
                            const noBalance = parseFloat(ethers.formatEther(investment[2]))

                            if (totalInvested > 0) {
                                totalPositions++

                                // Calculate current value based on market status
                                if (market.status === 3) { // Resolved
                                    // For resolved markets, value is based on outcome
                                    if (market.outcome === 1) { // YES won
                                        unrealizedProfit += yesBalance - totalInvested
                                    } else if (market.outcome === 2) { // NO won
                                        unrealizedProfit += noBalance - totalInvested
                                    }
                                } else { // Active or other status
                                    // Calculate current market value
                                    const prices = calculatePrices(market.yesPool, market.noPool)
                                    const yesValue = yesBalance * (prices.yesPrice / 100)
                                    const noValue = noBalance * (prices.noPrice / 100)
                                    const currentValue = yesValue + noValue
                                    unrealizedProfit += currentValue - totalInvested
                                }
                            }

                            await delay(50)
                        } catch (err) {
                            // Skip this market
                        }
                    }
                } catch (err) {
                    console.error(`Error calculating unrealized profit for ${trader}:`, err)
                }

                const totalInvestment = (parseFloat(bnbInvestment) + parseFloat(pdxInvestment)).toFixed(4)
                const totalProfit = realizedProfit + unrealizedProfit
                const profitPercent = parseFloat(totalInvestment) > 0
                    ? (totalProfit / parseFloat(totalInvestment)) * 100
                    : 0

                userStats.push({
                    address: trader,
                    totalInvestment,
                    bnbInvestment: parseFloat(bnbInvestment).toFixed(4),
                    pdxInvestment: parseFloat(pdxInvestment).toFixed(4),
                    totalVolume,
                    totalPositions,
                    totalProfit: totalProfit.toFixed(4),
                    realizedProfit: realizedProfit.toFixed(4),
                    unrealizedProfit: unrealizedProfit.toFixed(4),
                    profitPercent: parseFloat(profitPercent.toFixed(2))
                })

                // Delay between traders
                await delay(200)
            } catch (error) {
                console.error(`Error calculating stats for ${trader}:`, error)
            }
        }

        // Sort by total investment
        userStats.sort((a, b) => parseFloat(b.totalInvestment) - parseFloat(a.totalInvestment))

        // Fetch Twitter profiles for top users
        const profiles: any = {}
        if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
            try {
                const { getUserProfileByWallet } = await import('@/lib/supabase')
                for (const stat of userStats.slice(0, 10)) {
                    try {
                        const profile = await getUserProfileByWallet(stat.address)
                        if (profile?.twitter_username) {
                            profiles[stat.address.toLowerCase()] = profile
                        }
                    } catch (err) {
                        // Silently fail
                    }
                }
            } catch (err) {
                console.error('Error fetching profiles:', err)
            }
        }

        return NextResponse.json({
            success: true,
            data: {
                userStats,
                profiles,
                markets: allMarkets,
                totalTraders: traders.size,
                activeMarkets: allMarkets.filter(m => {
                    const now = Date.now() / 1000
                    return m.status === 0 && m.endTime > now
                }).length
            }
        })

    } catch (error: any) {
        console.error('Error fetching leaderboard data:', error)
        return NextResponse.json(
            { error: error.message || 'Internal server error' },
            { status: 500 }
        )
    }
}
