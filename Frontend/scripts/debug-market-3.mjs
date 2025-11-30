import { ethers } from "ethers";

const RPC_URL = "https://data-seed-prebsc-1-s1.binance.org:8545/";
const PREDICTION_MARKET_ADDRESS = "0x12FD6C9B618949d940806B0E59e3c65507eC37E8";
const MARKET_ID = 3;
const EXPECTED_CREATOR = "0xd84fdA5439152A51fBc11C2a5838F3aFF57ce02e";

const PREDICTION_MARKET_ABI = [
    "function markets(uint256) view returns (address creator, string question, string category, uint256 endTime, uint8 status, uint8 outcome, address yesToken, address noToken, uint256 yesPool, uint256 noPool, uint256 lpTotalSupply, uint256 totalBacking, uint256 platformFees, uint256 resolutionRequestedAt, address resolutionRequester, string resolutionReason, uint256 resolutionConfidence, uint256 disputeDeadline, address disputer, string disputeReason)"
];

async function main() {
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const predictionMarket = new ethers.Contract(PREDICTION_MARKET_ADDRESS, PREDICTION_MARKET_ABI, provider);

    console.log(`🔍 Debugging Market ID: ${MARKET_ID}`);

    try {
        const market = await predictionMarket.markets(MARKET_ID);
        console.log(`\n📊 Market Details:`);
        console.log(`   Creator: ${market.creator}`);
        console.log(`   Question: ${market.question}`);
        console.log(`   Status: ${market.status} (0=Open, 1=Closed, 2=ResReq, 3=Resolved, 4=Disputed)`);
        console.log(`   End Time: ${market.endTime}`);

        console.log(`\n🕵️ Verification:`);
        if (market.creator.toLowerCase() === EXPECTED_CREATOR.toLowerCase()) {
            console.log("✅ Creator matches expected user.");
        } else {
            console.error(`❌ Creator MISMATCH! Expected ${EXPECTED_CREATOR}, got ${market.creator}`);
        }

        if (Number(market.status) === 0) {
            console.log("✅ Market is Open.");
        } else {
            console.error(`❌ Market is NOT Open! Status is ${market.status}`);
        }

    } catch (error) {
        console.error("❌ Error fetching market:", error);
    }
}

main();
