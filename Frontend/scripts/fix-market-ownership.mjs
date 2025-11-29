import { ethers } from "ethers";

const RPC_URL = "https://data-seed-prebsc-1-s1.binance.org:8545/";
const PREDICTION_MARKET_ADDRESS = "0x52Ca4B7673646B8b922ea00ccef6DD0375B14619";
const MARKETPLACE_ADDRESS = "0x0A7d80e4c892DC3D72d054798b222Ec8819eE6f9";
const MARKET_ID = 1;
const PRIVATE_KEY = process.env.DEPLOYER_PRIVATE_KEY || "2e76f7afbbdf13594af5999c82454516fbb1ebaf17128b337f6e575927970436"; // Seller Key

const PREDICTION_MARKET_ABI = [
    "function transferMarketOwnership(uint256 marketId, address newOwner) external",
    "function markets(uint256) view returns (address creator, string question, uint256 endTime, uint8 status, uint8 outcome, address yesToken, address noToken, uint256 yesPool, uint256 noPool, uint256 lpTotalSupply, uint256 totalBacking, uint256 platformFees, uint256 resolutionRequestedAt, address resolutionRequester, bytes32 resolutionReason, uint256 resolutionConfidence, uint256 disputeDeadline, address disputer)"
];

async function main() {
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
    const predictionMarket = new ethers.Contract(PREDICTION_MARKET_ADDRESS, PREDICTION_MARKET_ABI, wallet);

    console.log(`Transferring ownership of Market ${MARKET_ID} to Marketplace...`);
    console.log(`Current Owner (Seller): ${wallet.address}`);
    console.log(`New Owner (Marketplace): ${MARKETPLACE_ADDRESS}`);

    // Check current owner
    const market = await predictionMarket.markets(MARKET_ID);
    console.log(`Market Creator on-chain: ${market.creator}`);

    if (market.creator.toLowerCase() !== wallet.address.toLowerCase()) {
        console.error("❌ You are not the owner of this market!");
        if (market.creator.toLowerCase() === MARKETPLACE_ADDRESS.toLowerCase()) {
            console.log("✅ Marketplace is ALREADY the owner.");
        }
        return;
    }

    try {
        const tx = await predictionMarket.transferMarketOwnership(MARKET_ID, MARKETPLACE_ADDRESS);
        console.log(`⏳ Transaction sent: ${tx.hash}`);
        await tx.wait();
        console.log("✅ Ownership transferred successfully!");
    } catch (error) {
        console.error("❌ Transfer failed:", error);
    }
}

main();
