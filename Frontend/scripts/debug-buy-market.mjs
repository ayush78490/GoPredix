import { ethers } from "ethers";

const RPC_URL = "https://data-seed-prebsc-1-s1.binance.org:8545/";
const MARKETPLACE_ADDRESS = "0x0A7d80e4c892DC3D72d054798b222Ec8819eE6f9";
const PREDICTION_MARKET_ADDRESS = "0x52Ca4B7673646B8b922ea00ccef6DD0375B14619";
const PDX_TOKEN_ADDRESS = "0xeE943aCCAa07ED556DfAc9d3a76015050fA78BC8";

const MARKET_ID = 1; // The market ID being bought
const BUYER_ADDRESS = "0x66eb217C65Ef8D20649f3B9a1b9b137aC8570053"; // From user error log

const MARKETPLACE_ABI = [
    "function listings(uint256) view returns (address seller, uint256 marketId, uint256 price, uint256 listedAt, bool isActive)",
    "function marketToListing(uint256) view returns (uint256)",
    "function pdxToken() view returns (address)"
];

const PREDICTION_MARKET_ABI = [
    "function markets(uint256) view returns (address creator, string question, uint256 endTime, uint8 status, uint8 outcome, address yesToken, address noToken, uint256 yesPool, uint256 noPool, uint256 lpTotalSupply, uint256 totalBacking, uint256 platformFees, uint256 resolutionRequestedAt, address resolutionRequester, bytes32 resolutionReason, uint256 resolutionConfidence, uint256 disputeDeadline, address disputer)"
];

const ERC20_ABI = [
    "function allowance(address owner, address spender) view returns (uint256)",
    "function balanceOf(address account) view returns (uint256)"
];

async function main() {
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const marketplace = new ethers.Contract(MARKETPLACE_ADDRESS, MARKETPLACE_ABI, provider);
    const predictionMarket = new ethers.Contract(PREDICTION_MARKET_ADDRESS, PREDICTION_MARKET_ABI, provider);
    const pdxToken = new ethers.Contract(PDX_TOKEN_ADDRESS, ERC20_ABI, provider);

    console.log("🔍 Debugging Buy Market Transaction...");
    console.log(`   Market ID: ${MARKET_ID}`);
    console.log(`   Buyer: ${BUYER_ADDRESS}`);

    const contractPdx = await marketplace.pdxToken();
    console.log(`   Contract PDX: ${contractPdx}`);
    if (contractPdx.toLowerCase() !== PDX_TOKEN_ADDRESS.toLowerCase()) {
        console.error(`❌ PDX Address Mismatch! Contract has ${contractPdx}, expected ${PDX_TOKEN_ADDRESS}`);
        return;
    }

    // 1. Check Listing
    const listingId = await marketplace.marketToListing(MARKET_ID);
    console.log(`\n📋 Listing ID: ${listingId}`);

    if (listingId == 0) {
        console.error("❌ Market is NOT listed!");
        return;
    }

    const listing = await marketplace.listings(listingId);
    console.log(`   Seller: ${listing.seller}`);
    console.log(`   Price: ${ethers.formatEther(listing.price)} PDX`);
    console.log(`   Active: ${listing.isActive}`);

    if (!listing.isActive) {
        console.error("❌ Listing is NOT active!");
    }

    if (listing.seller.toLowerCase() === BUYER_ADDRESS.toLowerCase()) {
        console.error("❌ Buyer is the Seller! Cannot buy own market.");
    }

    // 2. Check Market Status
    const market = await predictionMarket.markets(MARKET_ID);
    console.log(`\n📊 Market Status: ${market.status} (0=Open, 1=Closed, 2=ResReq, 3=Resolved, 4=Disputed)`);

    if (market.status != 0) {
        console.error("❌ Market is NOT Open!");
    }

    // 3. Check Balance & Allowance
    const balance = await pdxToken.balanceOf(BUYER_ADDRESS);
    const allowance = await pdxToken.allowance(BUYER_ADDRESS, MARKETPLACE_ADDRESS);

    console.log(`\n💰 Buyer Balance: ${ethers.formatEther(balance)} PDX`);
    console.log(`   Allowance: ${ethers.formatEther(allowance)} PDX`);
    console.log(`   Required: ${ethers.formatEther(listing.price)} PDX`);

    if (balance < listing.price) {
        console.error("❌ Insufficient Balance!");
    }

    if (allowance < listing.price) {
        console.error("❌ Insufficient Allowance!");
    }

    if (listing.isActive && market.status == 0 && balance >= listing.price && allowance >= listing.price && listing.seller.toLowerCase() !== BUYER_ADDRESS.toLowerCase()) {
        console.log("\n✅ All checks passed! Transaction SHOULD succeed.");
    } else {
        console.log("\n❌ Transaction will REVERT.");
    }
}

main();
