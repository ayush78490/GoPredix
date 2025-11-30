import { ethers } from 'ethers';

const RPC_URL = 'https://data-seed-prebsc-1-s1.binance.org:8545/';
const MARKETPLACE_ADDRESS = '0x2FC004d8d92Dee66FDF042BcE63C88E255b1237a';
const BNB_MARKET_ADDRESS = '0x12FD6C9B618949d940806B0E59e3c65507eC37E8';
const PDX_TOKEN_ADDRESS = '0xeE943aCCAa07ED556DfAc9d3a76015050fA78BC8';

// Marketplace ABI (minimal)
const MARKETPLACE_ABI = [
    "function nextListingId() view returns (uint256)",
    "function getListing(uint256 listingId) view returns (tuple(address seller, uint256 marketId, uint256 price, uint256 listedAt, bool isActive))",
    "function buyMarket(uint256 marketId) external",
    "function predictionMarket() view returns (address)",
    "function pdxToken() view returns (address)",
    "function marketplaceFeeBps() view returns (uint32)",
    "function owner() view returns (address)"
];

// Market ABI (minimal)
const MARKET_ABI = [
    "function markets(uint256) view returns (address creator, string question, uint256 totalYesAmount, uint256 totalNoAmount, bool resolved, bool outcome, uint256 endTime)",
    "function getMarketOwner(uint256 marketId) view returns (address)"
];

// PDX Token ABI (minimal)
const PDX_ABI = [
    "function balanceOf(address account) view returns (uint256)",
    "function allowance(address owner, address spender) view returns (uint256)"
];

async function main() {
    console.log('🔍 Debugging Marketplace Buy Transaction\n');
    console.log('='.repeat(60));

    const provider = new ethers.JsonRpcProvider(RPC_URL);

    // Check network
    const network = await provider.getNetwork();
    console.log(`\n📡 Network: ${network.name} (Chain ID: ${network.chainId})`);

    // Initialize contracts
    const marketplace = new ethers.Contract(MARKETPLACE_ADDRESS, MARKETPLACE_ABI, provider);
    const bnbMarket = new ethers.Contract(BNB_MARKET_ADDRESS, MARKET_ABI, provider);
    const pdxToken = new ethers.Contract(PDX_TOKEN_ADDRESS, PDX_ABI, provider);

    try {
        // 1. Check marketplace configuration
        console.log('\n📋 MARKETPLACE CONFIGURATION');
        console.log('='.repeat(60));
        const nextListingId = await marketplace.nextListingId();
        console.log(`Next Listing ID: ${nextListingId}`);

        const marketAddr = await marketplace.predictionMarket();
        console.log(`Configured Market Address: ${marketAddr}`);
        console.log(`Expected BNB Market: ${BNB_MARKET_ADDRESS}`);
        console.log(`Addresses Match: ${marketAddr.toLowerCase() === BNB_MARKET_ADDRESS.toLowerCase()}`);

        const pdxAddr = await marketplace.pdxToken();
        console.log(`Configured PDX Token: ${pdxAddr}`);
        console.log(`Expected PDX Token: ${PDX_TOKEN_ADDRESS}`);
        console.log(`Addresses Match: ${pdxAddr.toLowerCase() === PDX_TOKEN_ADDRESS.toLowerCase()}`);

        const fee = await marketplace.marketplaceFeeBps();
        console.log(`Fee Percentage: ${fee} BPS (${Number(fee) / 100}%)`);

        // 2. Check all listings
        console.log('\n📦 ALL LISTINGS');
        console.log('='.repeat(60));

        if (Number(nextListingId) <= 1) {
            console.log('⚠️ No listings found (nextListingId <= 1)');
        } else {
            for (let i = 1; i < Number(nextListingId); i++) {
                try {
                    const listing = await marketplace.getListing(i);
                    console.log(`\n📝 Listing #${i}:`);
                    console.log(`   Market ID: ${listing.marketId}`);
                    console.log(`   Seller: ${listing.seller}`);
                    console.log(`   Price: ${ethers.formatEther(listing.price)} PDX`);
                    console.log(`   Listed At: ${new Date(Number(listing.listedAt) * 1000).toISOString()}`);
                    console.log(`   Is Active: ${listing.isActive}`);
                    console.log(`   Is Transferred: ${listing.isTransferred}`);

                    // Check market details
                    try {
                        const market = await bnbMarket.markets(listing.marketId);
                        console.log(`   ✅ Market exists: ${market.question}`);
                        console.log(`   Creator: ${market.creator}`);

                        // Check current owner
                        try {
                            const owner = await bnbMarket.getMarketOwner(listing.marketId);
                            console.log(`   Current Owner: ${owner}`);
                            console.log(`   Owned by Marketplace: ${owner.toLowerCase() === MARKETPLACE_ADDRESS.toLowerCase()}`);
                        } catch (e) {
                            console.log(`   ⚠️ Could not fetch owner: ${e.message}`);
                        }
                    } catch (e) {
                        console.log(`   ❌ Market does not exist or error: ${e.message}`);
                    }
                } catch (e) {
                    console.log(`   ❌ Error fetching listing ${i}: ${e.message}`);
                }
            }
        }

        // 3. Simulate a buy transaction (if listing exists)
        // Find listing for Market 3
        let targetListingId = 0;
        for (let i = 1; i < Number(nextListingId); i++) {
            const l = await marketplace.getListing(i);
            if (Number(l.marketId) === 3) {
                targetListingId = i;
                break;
            }
        }

        if (targetListingId > 0) {
            console.log(`\n🛒 SIMULATING BUY TRANSACTION FOR LISTING #${targetListingId} (Market 3)`);
            console.log('='.repeat(60));

            const listing = await marketplace.getListing(targetListingId);
            const marketId = Number(listing.marketId);
            const price = listing.price;

            console.log(`Market ID: ${marketId}`);
            console.log(`Price: ${ethers.formatEther(price)} PDX`);
            console.log(`Seller: ${listing.seller}`);

            // Check if market owner is marketplace
            try {
                const owner = await bnbMarket.getMarketOwner(marketId);
                console.log(`\nCurrent Market Owner: ${owner}`);
                console.log(`Marketplace Address: ${MARKETPLACE_ADDRESS}`);

                if (owner.toLowerCase() !== MARKETPLACE_ADDRESS.toLowerCase()) {
                    console.log('\n❌ PROBLEM FOUND: Market is not owned by the marketplace!');
                    console.log('   The seller needs to transfer ownership to the marketplace first.');
                    console.log('   This is why buyMarket() is reverting.');
                } else {
                    console.log('\n✅ Market is owned by marketplace (ownership transferred correctly)');
                }
            } catch (e) {
                console.log(`\n❌ Error checking owner: ${e.message}`);
            }

            // Try to estimate gas for buy (this will fail if contract would revert)
            console.log('\n🧮 Attempting to estimate gas for buyMarket()...');
            try {
                // We need a valid address for simulation
                const buyerAddress = '0x66eb217C65Ef8D20649f3B9a1b9b137aC8570053'; // From logs

                // Check buyer's PDX balance
                const balance = await pdxToken.balanceOf(buyerAddress);
                console.log(`Buyer PDX Balance: ${ethers.formatEther(balance)} PDX`);
                console.log(`Required: ${ethers.formatEther(price)} PDX`);
                console.log(`Sufficient Balance: ${balance >= price}`);

                // Check allowance
                const allowance = await pdxToken.allowance(buyerAddress, MARKETPLACE_ADDRESS);
                console.log(`\nBuyer Allowance: ${ethers.formatEther(allowance)} PDX`);
                console.log(`Sufficient Allowance: ${allowance >= price}`);

                // Try to estimate gas
                const estimatedGas = await marketplace.buyMarket.estimateGas(marketId, {
                    from: buyerAddress
                });
                console.log(`\n✅ Gas Estimate Successful: ${estimatedGas.toString()}`);
                console.log('   This means the transaction should work!');
            } catch (error) {
                console.log(`\n❌ Gas Estimation Failed: ${error.message}`);
                console.log('\n🔍 This indicates the contract call will revert.');
                console.log('   Possible reasons:');
                console.log('   1. Market ownership not transferred to marketplace');
                console.log('   2. Listing is not active');
                console.log('   3. Insufficient PDX balance or allowance');
                console.log('   4. Contract logic error');

                // Try to decode the revert reason
                if (error.data) {
                    console.log(`\n   Revert data: ${error.data}`);
                }
            }
        }

    } catch (error) {
        console.error('\n❌ Script Error:', error);
    }
}

main().catch(console.error);
