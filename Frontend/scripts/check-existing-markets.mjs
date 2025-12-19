import { ethers } from 'ethers';

const RPC_URL = 'https://data-seed-prebsc-1-s1.binance.org:8545/';
const BNB_MARKET_ADDRESS = '0xDD774C850001f193Bc3D1d63B3d6C9E1ba46dE42';
const PDX_MARKET_ADDRESS = '0x03C3eDae35228bF970d30Bf77E9Dce3A88A3dB4B';

const MARKET_ABI = [
    'function nextMarketId() external view returns (uint256)',
    'function getMarketInfo(uint256 id) external view returns (tuple(address creator, string question, string category, uint256 endTime, uint8 status, uint8 outcome, uint256 yesPool, uint256 noPool, uint256 totalBacking))'
];

async function checkMarkets() {
    const provider = new ethers.JsonRpcProvider(RPC_URL);

    console.log('🔍 Checking BNB Markets...\n');
    const bnbMarket = new ethers.Contract(BNB_MARKET_ADDRESS, MARKET_ABI, provider);

    try {
        const nextId = await bnbMarket.nextMarketId();
        console.log(`Next Market ID: ${nextId.toString()}`);
        console.log(`Total Markets: ${Number(nextId)}\n`);

        if (Number(nextId) === 0) {
            console.log('⚠️ No markets exist in BNB contract\n');
        } else {
            for (let i = 0; i < Number(nextId); i++) {
                try {
                    const market = await bnbMarket.getMarketInfo(i);
                    console.log(`✅ Market ${i}:`);
                    console.log(`   Creator: ${market.creator}`);
                    console.log(`   Question: ${market.question}`);
                    console.log(`   Status: ${market.status}\n`);
                } catch (err) {
                    console.log(`❌ Market ${i}: Does not exist or error`);
                    console.log(`   ${err.message}\n`);
                }
            }
        }
    } catch (error) {
        console.error('❌ Error checking BNB markets:', error.message);
    }

    console.log('\n🔍 Checking PDX Markets...\n');
    const pdxMarket = new ethers.Contract(PDX_MARKET_ADDRESS, MARKET_ABI, provider);

    try {
        const nextId = await pdxMarket.nextMarketId();
        console.log(`Next Market ID: ${nextId.toString()}`);
        console.log(`Total Markets: ${Number(nextId)}\n`);

        if (Number(nextId) === 0) {
            console.log('⚠️ No markets exist in PDX contract\n');
        } else {
            for (let i = 0; i < Number(nextId); i++) {
                try {
                    const market = await pdxMarket.getMarketInfo(i);
                    console.log(`✅ Market ${i}:`);
                    console.log(`   Creator: ${market.creator}`);
                    console.log(`   Question: ${market.question}`);
                    console.log(`   Status: ${market.status}\n`);
                } catch (err) {
                    console.log(`❌ Market ${i}: Does not exist or error`);
                    console.log(`   ${err.message}\n`);
                }
            }
        }
    } catch (error) {
        console.error('❌ Error checking PDX markets:', error.message);
    }
}

checkMarkets();
