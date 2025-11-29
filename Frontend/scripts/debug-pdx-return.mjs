import { ethers } from "ethers";

const RPC_URL = "https://data-seed-prebsc-1-s1.binance.org:8545/";
const PDX_TOKEN_ADDRESS = "0xeE943aCCAa07ED556DfAc9d3a76015050fA78BC8";
const PRIVATE_KEY = process.env.DEPLOYER_PRIVATE_KEY || "2e76f7afbbdf13594af5999c82454516fbb1ebaf17128b337f6e575927970436";

async function main() {
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

    console.log("🔍 Checking PDX Token Return Value...");
    console.log(`   Token: ${PDX_TOKEN_ADDRESS}`);
    console.log(`   Sender: ${wallet.address}`);

    // Encode transfer(to, amount)
    const iface = new ethers.Interface(["function transfer(address to, uint256 amount) returns (bool)"]);
    const data = iface.encodeFunctionData("transfer", [wallet.address, 0]); // 0 amount transfer to self

    try {
        // Perform static call (simulation)
        const result = await provider.call({
            to: PDX_TOKEN_ADDRESS,
            data: data,
            from: wallet.address
        });

        console.log(`\n📥 Return Data: ${result}`);
        console.log(`   Length: ${result.length}`);

        if (result === "0x") {
            console.error("❌ PDX Token returns VOID (no data)! It is NOT a standard ERC20.");
            console.log("   The Marketplace contract expects 'returns (bool)', so it will REVERT.");
        } else {
            const decoded = iface.decodeFunctionResult("transfer", result);
            console.log(`✅ Decoded Result: ${decoded}`);
        }

    } catch (error) {
        console.error("❌ Call failed:", error);
    }
}

main();
