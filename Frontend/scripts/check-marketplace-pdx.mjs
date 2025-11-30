import { ethers } from "ethers";

const RPC_URL = "https://data-seed-prebsc-1-s1.binance.org:8545/";
const MARKETPLACE_ADDRESS = "0xc92c18CD349c7C60EF1B8c5A83c9000a73E7F4A0";

const ABI = [
    "function pdxToken() view returns (address)"
];

async function main() {
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const contract = new ethers.Contract(MARKETPLACE_ADDRESS, ABI, provider);

    const pdx = await contract.pdxToken();
    console.log(`Marketplace PDX Token: ${pdx}`);
}

main();
