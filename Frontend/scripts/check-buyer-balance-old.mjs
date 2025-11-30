import { ethers } from "ethers";

const RPC_URL = "https://data-seed-prebsc-1-s1.binance.org:8545/";
const PDX_ADDRESS = "0xeE943aCCAa07ED556DfAc9d3a76015050fA78BC8";
const BUYER_ADDRESS = "0x66eb217C65Ef8D20649f3B9a1b9b137aC8570053";

const ABI = [
    "function balanceOf(address) view returns (uint256)"
];

async function main() {
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const contract = new ethers.Contract(PDX_ADDRESS, ABI, provider);

    const balance = await contract.balanceOf(BUYER_ADDRESS);
    console.log(`Balance on 0xeE9...: ${ethers.formatEther(balance)} PDX`);
}

main();
