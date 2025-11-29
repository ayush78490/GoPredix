import { ethers } from "ethers";

const RPC_URL = "https://data-seed-prebsc-1-s1.binance.org:8545/";
const PREDICTION_MARKET_ADDRESS = "0x52Ca4B7673646B8b922ea00ccef6DD0375B14619";
const MARKET_ID = 1;

// The interface exactly as defined in BNBMarketMarketplace.sol
const ABI = [
    {
        "inputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
        "name": "markets",
        "outputs": [
            { "internalType": "address", "name": "creator", "type": "address" },
            { "internalType": "string", "name": "question", "type": "string" },
            { "internalType": "uint256", "name": "endTime", "type": "uint256" },
            { "internalType": "uint8", "name": "status", "type": "uint8" },
            { "internalType": "uint8", "name": "outcome", "type": "uint8" },
            { "internalType": "address", "name": "yesToken", "type": "address" },
            { "internalType": "address", "name": "noToken", "type": "address" },
            { "internalType": "uint256", "name": "yesPool", "type": "uint256" },
            { "internalType": "uint256", "name": "noPool", "type": "uint256" },
            { "internalType": "uint256", "name": "lpTotalSupply", "type": "uint256" },
            { "internalType": "uint256", "name": "totalBacking", "type": "uint256" },
            { "internalType": "uint256", "name": "platformFees", "type": "uint256" },
            { "internalType": "uint256", "name": "resolutionRequestedAt", "type": "uint256" },
            { "internalType": "address", "name": "resolutionRequester", "type": "address" },
            { "internalType": "bytes32", "name": "resolutionReason", "type": "bytes32" },
            { "internalType": "uint256", "name": "resolutionConfidence", "type": "uint256" },
            { "internalType": "uint256", "name": "disputeDeadline", "type": "uint256" },
            { "internalType": "address", "name": "disputer", "type": "address" }
        ],
        "stateMutability": "view",
        "type": "function"
    }
];

async function main() {
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const contract = new ethers.Contract(PREDICTION_MARKET_ADDRESS, ABI, provider);

    console.log(`Calling markets(${MARKET_ID})...`);
    try {
        const result = await contract.markets(MARKET_ID);
        console.log("✅ Success!");
        console.log("Status:", result.status);
        console.log("Creator:", result.creator);
        console.log("Marketplace Address:", "0x0A7d80e4c892DC3D72d054798b222Ec8819eE6f9");
    } catch (error) {
        console.error("❌ Failed!");
        console.error(error);
    }
}

main();
