import { ethers } from "ethers";

const RPC_URL = "https://data-seed-prebsc-1-s1.binance.org:8545/";
const MARKETPLACE_ADDRESS = "0xb8C6305725803028659dDBeeAAcd699A9C1A1819"; // Latest Contract
const PDX_TOKEN_ADDRESS = "0xeE943aCCAa07ED556DfAc9d3a76015050fA78BC8";
const MARKET_ID = 1;
const BUYER_ADDRESS = "0x66eb217C65Ef8D20649f3B9a1b9b137aC8570053";

const MARKETPLACE_ABI = [
    "function listings(uint256) view returns (address seller, uint256 marketId, uint256 price, uint256 listedAt, bool isActive)",
    "function marketToListing(uint256) view returns (uint256)",
    "function marketOwners(uint256) view returns (address)",
    "function predictionMarket() view returns (address)"
];

const ERC20_ABI = [
    "function allowance(address owner, address spender) view returns (uint256)",
    "function balanceOf(address account) view returns (uint256)"
];

async function main() {
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const marketplace = new ethers.Contract(MARKETPLACE_ADDRESS, MARKETPLACE_ABI, provider);
    const pdxToken = new ethers.Contract(PDX_TOKEN_ADDRESS, ERC20_ABI, provider);

    console.log("🔍 Debugging NEW Marketplace Contract...");
    console.log(`   Address: ${MARKETPLACE_ADDRESS}`);

    const pmAddress = await marketplace.predictionMarket();
    console.log(`   Prediction Market: ${pmAddress}`);
    if (pmAddress !== "0x52Ca4B7673646B8b922ea00ccef6DD0375B14619") {
        console.error("❌ Prediction Market Address Mismatch!");
    }

    // 1. Check Listing
    const listingId = await marketplace.marketToListing(MARKET_ID);
    console.log(`\n📋 Market ${MARKET_ID} Listing ID: ${listingId}`);

    if (listingId == 0) {
        console.error("❌ Market is NOT listed on this contract!");
        console.log("   User needs to LIST the market first.");
        return;
    }

    const listing = await marketplace.listings(listingId);
    console.log(`   Seller: ${listing.seller}`);
    console.log(`   Price: ${ethers.formatEther(listing.price)} PDX`);
    console.log(`   Active: ${listing.isActive}`);

    if (!listing.isActive) {
        console.error("❌ Listing is NOT active!");
    }

    // 2. Check Allowance
    const allowance = await pdxToken.allowance(BUYER_ADDRESS, MARKETPLACE_ADDRESS);
    console.log(`\n💰 Buyer Allowance: ${ethers.formatEther(allowance)} PDX`);

    if (allowance < listing.price) {
        console.error("❌ Insufficient Allowance! Buyer needs to Approve.");
    } else {
        console.log("✅ Allowance is sufficient.");
    }

    // 3. Check Balance
    const balance = await pdxToken.balanceOf(BUYER_ADDRESS);
    console.log(`   Buyer Balance: ${ethers.formatEther(balance)} PDX`);

    if (balance < listing.price) {
        console.error("❌ Insufficient Balance!");
    }
}

main();
