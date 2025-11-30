
import { ethers } from 'ethers';

const RPC_URL = 'https://data-seed-prebsc-1-s1.binance.org:8545';
const CONTRACT_ADDRESS = '0x52Ca4B7673646B8b922ea00ccef6DD0375B14619';

async function main() {
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const marketId = 0;
    const selector = ethers.id("markets(uint256)").slice(0, 10);
    const abiCoder = new ethers.AbiCoder();
    const encodedArg = abiCoder.encode(["uint256"], [marketId]).slice(2);
    const data = selector + encodedArg;

    try {
        const result = await provider.call({
            to: CONTRACT_ADDRESS,
            data: data
        });

        console.log("Raw result length:", result.length);
        // Print first 10 words (32 bytes each = 64 hex chars)
        const content = result.slice(2);
        for (let i = 0; i < content.length; i += 64) {
            const word = content.slice(i, i + 64);
            // Only print first 20 words to avoid truncation limits
            if (i / 64 < 20) {
                console.log(`Word ${i / 64}: ${word}`);
            }
        }

    } catch (error) {
        console.error("Call failed:", error);
    }
}

main();
