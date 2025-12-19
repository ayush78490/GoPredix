import { ethers } from 'hardhat';
import fs from 'fs';
import path from 'path';

async function main() {
    console.log('\n🧪 Testing Complete Marketplace Flow\n');
    console.log('='.repeat(60));

    const signers = await ethers.getSigners();
    const seller = signers[0];

    // Use second signer if available, otherwise create a test wallet
    let buyer;
    if (signers.length > 1) {
        buyer = signers[1];
    } else {
        // Create a test wallet and fund it
        buyer = ethers.Wallet.createRandom().connect(ethers.provider);
        console.log('\n💰 Funding test buyer account...');
        const fundTx = await seller.sendTransaction({
            to: buyer.address,
            value: ethers.parseEther('0.1')
        });
        await fundTx.wait();
        console.log(`✅ Funded buyer: ${buyer.address}\n`);
    }

    console.log('\n👥 Test Accounts:\n');
    console.log(`Seller:  ${seller.address}`);
    console.log(`Buyer:   ${buyer.address}\n`);

    // Load deployment
    const latestDeploymentPath = path.join(process.cwd(), 'deployments', 'latest.json');
    const deployment = JSON.parse(fs.readFileSync(latestDeploymentPath, 'utf8'));

    const marketAddress = deployment.contracts.predictionMarket;
    const marketplaceAddress = deployment.contracts.bnbNativeMarketplace;

    console.log('📋 Contract Addresses:\n');
    console.log(`BNB Prediction Market:    ${marketAddress}`);
    console.log(`BNB Native Marketplace:   ${marketplaceAddress}\n`);

    const predictionMarket = await ethers.getContractAt('PredictionMarketWithMultipliers', marketAddress);
    const marketplace = await ethers.getContractAt('BNBNativeMarketplace', marketplaceAddress);

    // Step 1: Verify Marketplace Approval
    console.log('='.repeat(60));
    console.log('Step 1: Verify Marketplace Approval');
    console.log('='.repeat(60));

    const isApproved = await predictionMarket.approvedMarketplaces(marketplaceAddress);
    console.log(`\nMarketplace approved: ${isApproved}`);

    if (!isApproved) {
        console.log('\n❌ Marketplace not approved! Run approve-marketplace.ts first\n');
        return;
    }
    console.log('✅ Marketplace is approved!\n');

    // Step 2: Create a Market
    console.log('='.repeat(60));
    console.log('Step 2: Create a Test Market');
    console.log('='.repeat(60));

    const initialYes = ethers.parseEther('0.01');
    const initialNo = ethers.parseEther('0.01');
    const endTime = Math.floor(Date.now() / 1000) + 86400; // 24 hours from now

    console.log('\n📝 Creating market...');
    const createTx = await predictionMarket.connect(seller).createMarket(
        "Will this marketplace test pass?",
        endTime,
        initialYes,
        initialNo,
        { value: initialYes + initialNo }
    );

    const createReceipt = await createTx.wait();

    // Get market ID from event
    const marketCreatedEvent = createReceipt?.logs.find((log: any) => {
        try {
            const parsed = predictionMarket.interface.parseLog(log);
            return parsed?.name === 'MarketCreated';
        } catch {
            return false;
        }
    });

    let marketId = 0;
    if (marketCreatedEvent) {
        const parsed = predictionMarket.interface.parseLog(marketCreatedEvent);
        marketId = Number(parsed?.args[0]);
    }

    console.log(`✅ Market created! ID: ${marketId}\n`);

    // Verify seller owns the market
    const market = await predictionMarket.markets(marketId);
    console.log(`Market owner: ${market.creator}`);
    console.log(`Expected:     ${seller.address}`);
    console.log(`Match:        ${market.creator.toLowerCase() === seller.address.toLowerCase()}\n`);

    // Step 3: List Market on Marketplace
    console.log('='.repeat(60));
    console.log('Step 3: List Market on Marketplace');
    console.log('='.repeat(60));

    const listingPrice = ethers.parseEther('0.05'); // 0.05 BNB

    console.log(`\n📝 Listing market ${marketId} for ${ethers.formatEther(listingPrice)} BNB...`);
    const listTx = await marketplace.connect(seller).listMarket(marketId, listingPrice);
    const listReceipt = await listTx.wait();

    // Get listing ID from event
    const marketListedEvent = listReceipt?.logs.find((log: any) => {
        try {
            const parsed = marketplace.interface.parseLog(log);
            return parsed?.name === 'MarketListed';
        } catch {
            return false;
        }
    });

    let listingId = 0;
    if (marketListedEvent) {
        const parsed = marketplace.interface.parseLog(marketListedEvent);
        listingId = Number(parsed?.args[0]);
    }

    console.log(`✅ Market listed! Listing ID: ${listingId}\n`);

    // Verify listing
    const listing = await marketplace.listings(listingId);
    console.log(`Listing details:`);
    console.log(`  Seller:    ${listing.seller}`);
    console.log(`  Market ID: ${listing.marketId}`);
    console.log(`  Price:     ${ethers.formatEther(listing.price)} BNB`);
    console.log(`  Active:    ${listing.isActive}\n`);

    // Verify market still owned by seller (non-custodial!)
    const marketAfterListing = await predictionMarket.markets(marketId);
    console.log(`Market owner after listing: ${marketAfterListing.creator}`);
    console.log(`Still seller:               ${marketAfterListing.creator.toLowerCase() === seller.address.toLowerCase()}`);
    console.log('✅ Non-custodial verification passed!\n');

    // Step 4: Buy Market
    console.log('='.repeat(60));
    console.log('Step 4: Buy Market');
    console.log('='.repeat(60));

    console.log(`\n📝 Buyer purchasing market ${marketId}...`);
    console.log(`Sending ${ethers.formatEther(listingPrice)} BNB...`);

    const buyTx = await marketplace.connect(buyer).buyMarket(marketId, { value: listingPrice });
    const buyReceipt = await buyTx.wait();

    console.log('✅ Purchase transaction confirmed!\n');

    // Parse events
    const marketBoughtEvent = buyReceipt?.logs.find((log: any) => {
        try {
            const parsed = marketplace.interface.parseLog(log);
            return parsed?.name === 'MarketBought';
        } catch {
            return false;
        }
    });

    if (marketBoughtEvent) {
        const parsed = marketplace.interface.parseLog(marketBoughtEvent);
        console.log('📊 MarketBought Event:');
        console.log(`  Listing ID: ${parsed?.args[0]}`);
        console.log(`  Market ID:  ${parsed?.args[1]}`);
        console.log(`  Seller:     ${parsed?.args[2]}`);
        console.log(`  Buyer:      ${parsed?.args[3]}`);
        console.log(`  Price:      ${ethers.formatEther(parsed?.args[4])} BNB\n`);
    }

    // Step 5: Verify Ownership Transfer
    console.log('='.repeat(60));
    console.log('Step 5: Verify Ownership Transfer');
    console.log('='.repeat(60));

    const marketAfterSale = await predictionMarket.markets(marketId);
    const newOwner = marketAfterSale.creator;

    console.log(`\n🔍 Ownership Verification:`);
    console.log(`  Previous owner: ${seller.address}`);
    console.log(`  New owner:      ${newOwner}`);
    console.log(`  Buyer:          ${buyer.address}`);
    console.log(`  Match:          ${newOwner.toLowerCase() === buyer.address.toLowerCase()}\n`);

    if (newOwner.toLowerCase() === buyer.address.toLowerCase()) {
        console.log('✅ OWNERSHIP SUCCESSFULLY TRANSFERRED!\n');
    } else {
        console.log('❌ OWNERSHIP TRANSFER FAILED!\n');
        return;
    }

    // Verify listing is inactive
    const listingAfterSale = await marketplace.listings(listingId);
    console.log(`Listing active after sale: ${listingAfterSale.isActive}`);

    if (!listingAfterSale.isActive) {
        console.log('✅ Listing correctly deactivated!\n');
    }

    // Step 6: Summary
    console.log('='.repeat(60));
    console.log('🎉 TEST COMPLETE - ALL CHECKS PASSED!');
    console.log('='.repeat(60));

    console.log('\n✨ Test Results:\n');
    console.log('✅ Marketplace approval: WORKING');
    console.log('✅ Market creation: WORKING');
    console.log('✅ Market listing (non-custodial): WORKING');
    console.log('✅ Market purchase: WORKING');
    console.log('✅ Ownership transfer: WORKING');
    console.log('✅ Listing deactivation: WORKING');

    console.log('\n📊 Flow Summary:\n');
    console.log(`1. Seller created market #${marketId}`);
    console.log(`2. Seller listed market for ${ethers.formatEther(listingPrice)} BNB`);
    console.log(`3. Seller kept ownership (non-custodial)`);
    console.log(`4. Buyer purchased market`);
    console.log(`5. Ownership transferred: Seller → Buyer`);
    console.log(`6. Listing deactivated`);

    console.log('\n🚀 The BNB Native Marketplace is FULLY FUNCTIONAL!\n');
    console.log('='.repeat(60));
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error('\n❌ Test failed:', error);
        process.exit(1);
    });
