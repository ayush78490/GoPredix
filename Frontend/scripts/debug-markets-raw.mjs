import { ethers } from "ethers";

const RPC_URL = "https://data-seed-prebsc-1-s1.binance.org:8545/";
const PREDICTION_MARKET_ADDRESS = "0x52Ca4B7673646B8b922ea00ccef6DD0375B14619";
const MARKET_ID = 1;

async function main() {
    const provider = new ethers.JsonRpcProvider(RPC_URL);

    // Function selector for markets(uint256)
    // markets(uint256) -> 0xdac15514
    const selector = ethers.id("markets(uint256)").slice(0, 10);

    // Encode argument (1)
    const coder = new ethers.AbiCoder();
    const args = coder.encode(["uint256"], [MARKET_ID]);
    const data = selector + args.slice(2);

    console.log("🔍 Calling markets(1) raw...");
    console.log(`   To: ${PREDICTION_MARKET_ADDRESS}`);
    console.log(`   Data: ${data}`);

    try {
        const result = await provider.call({
            to: PREDICTION_MARKET_ADDRESS,
            data: data
        });

        console.log(`\n📥 Raw Result: ${result}`);
        console.log(`   Length (bytes): ${(result.length - 2) / 2}`);

        // Analyze chunks (32 bytes each)
        const chunks = (result.length - 2) / 64;
        console.log(`   32-byte chunks: ${chunks}`);

        // Try to decode with ABI A (18 fields - No Category, No DisputeReason)
        // This matches the "Original" interface but with string resolutionReason
        const ABI_A = [
            "function markets(uint256) view returns (address, string, uint256, uint8, uint8, address, address, uint256, uint256, uint256, uint256, uint256, uint256, address, string, uint256, uint256, address)"
        ];
        try {
            const ifaceA = new ethers.Interface(ABI_A);
            const decodedA = ifaceA.decodeFunctionResult("markets", result);
            console.log("\n✅ Decoded with ABI A (18 fields - No Category)!");
            console.log(decodedA);
            return;
        } catch (e) {
            console.log("❌ Failed ABI A");
        }

        // Try ABI B (19 fields - With Category, No DisputeReason)
        const ABI_B = [
            "function markets(uint256) view returns (address, string, string, uint256, uint8, uint8, address, address, uint256, uint256, uint256, uint256, uint256, uint256, address, string, uint256, uint256, address)"
        ];
        try {
            const ifaceB = new ethers.Interface(ABI_B);
            const decodedB = ifaceB.decodeFunctionResult("markets", result);
            console.log("\n✅ Decoded with ABI B (19 fields - With Category)!");
            console.log(decodedB);
            return;
        } catch (e) {
            console.log("❌ Failed ABI B");
        }

    } catch (error) {
        console.error("❌ Call failed:", error);
    }
}

main();
