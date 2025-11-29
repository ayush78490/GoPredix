import { ethers } from "ethers";

const RPC_URL = "https://data-seed-prebsc-1-s1.binance.org:8545/";
const PDX_TOKEN_ADDRESS = "0xeE943aCCAa07ED556DfAc9d3a76015050fA78BC8";
const MARKETPLACE_ADDRESS = "0x09d25a4Ee887E7c7E759923352606d6c85f04c45"; // From config

async function main() {
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    console.log(`🔍 Checking PDX Token at ${PDX_TOKEN_ADDRESS}`);

    // 1. Check if code exists
    const code = await provider.getCode(PDX_TOKEN_ADDRESS);
    if (code === "0x") {
        console.error("❌ NO CODE found at this address! It is likely an EOA or incorrect address.");
        return;
    }
    console.log("✅ Code found at address.");

    // 2. Try to call basic ERC20 functions
    const abi = [
        "function name() view returns (string)",
        "function symbol() view returns (string)",
        "function decimals() view returns (uint8)",
        "function allowance(address, address) view returns (uint256)"
    ];
    const contract = new ethers.Contract(PDX_TOKEN_ADDRESS, abi, provider);

    try {
        const name = await contract.name();
        console.log("Name:", name);
    } catch (e) { console.log("Failed to get name:", e.message); }

    try {
        const symbol = await contract.symbol();
        console.log("Symbol:", symbol);
    } catch (e) { console.log("Failed to get symbol:", e.message); }

    try {
        // Check allowance for a random address
        const randomAddress = "0xd84fdA5439152A51fBc11C2a5838F3aFF57ce02e"; // Deployer
        const allowance = await contract.allowance(randomAddress, MARKETPLACE_ADDRESS);
        console.log("Allowance check successful. Value:", allowance.toString());
    } catch (e) {
        console.error("❌ Failed to check allowance:", e.code, e.message);
    }
}

main();
