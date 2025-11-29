import { ethers } from "ethers";

const RPC_URL = "https://data-seed-prebsc-1-s1.binance.org:8545/";
const PREDICTION_MARKET_ADDRESS = "0x52Ca4B7673646B8b922ea00ccef6DD0375B14619";
const MARKET_ID = 1;

// The 18-field ABI currently used in BNBMarketMarketplace.sol
const ABI = [
    "function markets(uint256) view returns (address creator, string question, uint256 endTime, uint8 status, uint8 outcome, address yesToken, address noToken, uint256 yesPool, uint256 noPool, uint256 lpTotalSupply, uint256 totalBacking, uint256 platformFees, uint256 resolutionRequestedAt, address resolutionRequester, bytes32 resolutionReason, uint256 resolutionConfidence, uint256 disputeDeadline, address disputer)"
];

async function main() {
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const contract = new ethers.Contract(PREDICTION_MARKET_ADDRESS, ABI, provider);

    console.log("🔍 Testing markets(1) with 18-field ABI...");

    try {
        const result = await contract.markets(MARKET_ID);
        console.log("✅ Call Succeeded!");
        console.log("Creator:", result.creator);
        console.log("Question:", result.question);
        console.log("EndTime:", result.endTime.toString());
        console.log("Status:", result.status);
        console.log("ResolutionReason:", result.resolutionReason);
        console.log("Disputer:", result.disputer);
    } catch (error) {
        console.error("❌ Call Failed!");
        console.error(error);
    }
}

main();
