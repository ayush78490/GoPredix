import { ethers } from "ethers";

const RPC_URL = "https://data-seed-prebsc-1-s1.binance.org:8545/";
const PREDICTION_MARKET_ADDRESS = "0x12FD6C9B618949d940806B0E59e3c65507eC37E8";

async function main() {
    const provider = new ethers.JsonRpcProvider(RPC_URL);

    // Get code
    const code = await provider.getCode(PREDICTION_MARKET_ADDRESS);
    console.log(`Contract Code Length: ${code.length}`);

    if (code === "0x") {
        console.error("❌ No code at address!");
        return;
    }

    // Calculate selector for transferMarketOwnership(uint256,address)
    const signature = "transferMarketOwnership(uint256,address)";
    const selector = ethers.id(signature).slice(0, 10);
    console.log(`Function Signature: ${signature}`);
    console.log(`Expected Selector: ${selector}`);

    // Check if selector exists in bytecode (simple check)
    // Note: This is a heuristic. The selector might be in the code but not reachable, or optimized out of the main dispatch if not used (unlikely for external).
    // However, usually the dispatcher compares calldata with selectors.
    // We look for PUSH4 <selector> or similar.

    if (code.includes(selector.slice(2))) {
        console.log("✅ Selector FOUND in bytecode.");
    } else {
        console.error("❌ Selector NOT FOUND in bytecode! The function might be missing or named differently.");
    }

    // Also check confirmTransfer in Marketplace just in case
    const MARKETPLACE_ADDRESS = "0x8fc69AF69fd9Db85C4caA7A9D62170D7f2C919c5";
    const mpCode = await provider.getCode(MARKETPLACE_ADDRESS);
    const confirmSig = "confirmTransfer(uint256)";
    const confirmSel = ethers.id(confirmSig).slice(0, 10);

    console.log(`\nChecking Marketplace confirmTransfer...`);
    console.log(`Signature: ${confirmSig}`);
    console.log(`Selector: ${confirmSel}`);

    if (mpCode.includes(confirmSel.slice(2))) {
        console.log("✅ Selector FOUND in Marketplace bytecode.");
    } else {
        console.error("❌ Selector NOT FOUND in Marketplace bytecode!");
    }
}

main();
