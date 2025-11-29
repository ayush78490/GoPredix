import { ethers } from "ethers";

const RPC_URL = "https://data-seed-prebsc-1-s1.binance.org:8545/";
const PREDICTION_MARKET_ADDRESS = "0x52Ca4B7673646B8b922ea00ccef6DD0375B14619";

async function main() {
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    console.log(`🔍 Checking contract at ${PREDICTION_MARKET_ADDRESS}`);

    const signatures = [
        // 18 fields: Missing Category, Missing DisputeReason, ResolutionReason is bytes32
        "function markets(uint256) view returns (address,string,uint256,uint8,uint8,address,address,uint256,uint256,uint256,uint256,uint256,uint256,address,bytes32,uint256,uint256,address)"
    ];

    for (let i = 0; i < signatures.length; i++) {
        const sig = signatures[i];
        console.log(`\nTesting signature ${i + 1}: ${sig}`);
        const contract = new ethers.Contract(PREDICTION_MARKET_ADDRESS, [sig], provider);
        try {
            const market = await contract.markets(1);
            console.log("✅ SUCCESS! Found matching signature.");
            console.log("Field count:", market.length);
            console.log("Creator:", market[0]);
            console.log("Question:", market[1]);
            console.log("ResolutionReason:", market[14]);
            console.log("Disputer:", market[17]);
            break;
        } catch (e) {
            console.log("❌ Failed:", e.code, e.shortMessage || e.message);
        }
    }
}

main();
