import { ethers } from 'ethers';
import fs from 'fs';

// Read .env.local manually
const envContent = fs.readFileSync('.env.local', 'utf8');
const envVars = {};
envContent.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
        envVars[match[1].trim()] = match[2].trim();
    }
});

// Set to process.env
for (const [key, value] of Object.entries(envVars)) {
    process.env[key] = value;
}

// Load ABIs
const BNB_HELPER_ABI = JSON.parse(fs.readFileSync('./contracts/helperABI.json', 'utf8'));
const PDX_HELPER_ABI = JSON.parse(fs.readFileSync('./contracts/pdxhelperabi.json', 'utf8'));
const BNB_MARKET_ABI = JSON.parse(fs.readFileSync('./contracts/abi.json', 'utf8')).abi || JSON.parse(fs.readFileSync('./contracts/abi.json', 'utf8'));

// Contract addresses from env
const BNB_MARKET_ADDRESS = process.env.NEXT_PUBLIC_PREDICTION_MARKET_ADDRESS;
const BNB_HELPER_ADDRESS = process.env.NEXT_PUBLIC_HELPER_CONTRACT_ADDRESS;
const PDX_MARKET_ADDRESS = process.env.NEXT_PUBLIC_PDX_MARKET_ADDRESS;
const PDX_HELPER_ADDRESS = process.env.NEXT_PUBLIC_PDX_HELPER_CONTRACT_ADDRESS;
const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL || 'https://data-seed-prebsc-1-s1.binance.org:8545';

console.log('🔍 Debug Leaderboard Data Fetching\n');
console.log('📍 Contract Addresses:');
console.log(`   BNB Market: ${BNB_MARKET_ADDRESS}`);
console.log(`   BNB Helper: ${BNB_HELPER_ADDRESS}`);
console.log(`   PDX Market: ${PDX_MARKET_ADDRESS}`);
console.log(`   PDX Helper: ${PDX_HELPER_ADDRESS}`);
console.log(`   RPC URL: ${RPC_URL}\n`);

async function main() {
    try {
        const provider = new ethers.JsonRpcProvider(RPC_URL);

        // Create contracts
        const bnbMarketContract = new ethers.Contract(BNB_MARKET_ADDRESS, BNB_MARKET_ABI, provider);
        const bnbHelperContract = new ethers.Contract(BNB_HELPER_ADDRESS, BNB_HELPER_ABI, provider);
        const pdxMarketContract = new ethers.Contract(PDX_MARKET_ADDRESS, BNB_MARKET_ABI, provider);
        const pdxHelperContract = new ethers.Contract(PDX_HELPER_ADDRESS, PDX_HELPER_ABI, provider);

        // 1. Fetch BNB markets
        console.log('📊 Fetching BNB Markets...');
        const bnbNextId = await bnbMarketContract.nextMarketId();
        console.log(`   Total BNB Markets: ${bnbNextId.toString()}`);

        const traders = new Set();

        // Fetch first 5 BNB markets
        for (let i = 0; i < Math.min(5, Number(bnbNextId)); i++) {
            try {
                const market = await bnbMarketContract.markets(i);
                const creator = market[0];
                console.log(`   Market ${i}: Creator ${creator}`);
                traders.add(creator.toLowerCase());
            } catch (err) {
                console.log(`   ❌ Error fetching BNB market ${i}:`, err.message);
            }
        }

        // 2. Fetch PDX markets
        console.log('\n📊 Fetching PDX Markets...');
        const pdxNextId = await pdxMarketContract.nextMarketId();
        console.log(`   Total PDX Markets: ${pdxNextId.toString()}`);

        for (let i = 0; i < Math.min(5, Number(pdxNextId)); i++) {
            try {
                const market = await pdxMarketContract.markets(i);
                const creator = market[0];
                console.log(`   Market ${i}: Creator ${creator}`);
                traders.add(creator.toLowerCase());
            } catch (err) {
                console.log(`   ❌ Error fetching PDX market ${i}:`, err.message);
            }
        }

        console.log(`\n👥 Total Unique Traders: ${traders.size}`);

        // 3. Test getUserPositions for first trader
        if (traders.size > 0) {
            const firstTrader = Array.from(traders)[0];
            console.log(`\n🔍 Testing getUserPositions for: ${firstTrader}`);

            console.log('\n   📌 BNB Helper Contract Test:');
            try {
                const bnbPositions = await bnbHelperContract.getUserPositions(firstTrader);
                console.log(`      ✅ BNB Positions fetched: ${bnbPositions.length} positions`);

                if (bnbPositions.length > 0) {
                    console.log(`      First position:`, {
                        marketId: bnbPositions[0].marketId.toString(),
                        yesBalance: ethers.formatEther(bnbPositions[0].yesBalance),
                        noBalance: ethers.formatEther(bnbPositions[0].noBalance),
                        totalInvested: ethers.formatEther(bnbPositions[0].totalInvested || bnbPositions[0].bnbInvested || 0),
                    });
                } else {
                    console.log(`      ⚠️  User has no BNB positions (created markets but didn't trade)`);
                }
            } catch (err) {
                console.log(`      ❌ Error:`, err.message);
            }

            console.log('\n   📌 PDX Helper Contract Test:');
            try {
                const pdxPositions = await pdxHelperContract.getUserPositions(firstTrader);
                console.log(`      ✅ PDX Positions fetched: ${pdxPositions.length} positions`);

                if (pdxPositions.length > 0) {
                    console.log(`      First position:`, {
                        marketId: pdxPositions[0].marketId.toString(),
                        yesBalance: ethers.formatEther(pdxPositions[0].yesBalance),
                        noBalance: ethers.formatEther(pdxPositions[0].noBalance),
                        totalInvested: ethers.formatEther(pdxPositions[0].totalInvested || 0),
                    });
                } else {
                    console.log(`      ⚠️  User has no PDX positions (created markets but didn't trade)`);
                }
            } catch (err) {
                console.log(`      ❌ Error:`, err.message);
            }

            // 4. Test getUserTotalInvestment
            console.log('\n   📌 Total Investment Test:');
            try {
                const bnbInvestment = await bnbHelperContract.getUserTotalInvestment(firstTrader);
                console.log(`      ✅ BNB Investment: ${ethers.formatEther(bnbInvestment)} BNB`);
            } catch (err) {
                console.log(`      ❌ BNB Investment Error:`, err.message);
            }

            try {
                const pdxInvestment = await pdxHelperContract.getUserTotalInvestment(firstTrader);
                console.log(`      ✅ PDX Investment: ${ethers.formatEther(pdxInvestment)} PDX`);
            } catch (err) {
                console.log(`      ❌ PDX Investment Error:`, err.message);
            }
        }

        console.log('\n✨ Debug Complete\n');

    } catch (error) {
        console.error('❌ Fatal Error:', error);
    }
}

main();
