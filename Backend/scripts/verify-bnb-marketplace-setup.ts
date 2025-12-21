import { ethers } from "hardhat";
import * as fs from 'fs';
import * as path from 'path';

/**
 * Verify BNB Marketplace Setup and Market Availability
 */
async function main() {
    console.log('🔍 Verifying BNB Marketplace Setup\n');

    // Load deployment data
    const deploymentsPath = path.join(__dirname, '../deployments/latest.json');
    if (!fs.existsSync(deploymentsPath)) {
        throw new Error('Deployment file not found!');
    }

    const deploymentData = JSON.parse(fs.readFileSync(deploymentsPath, 'utf8'));
    const bnbMarketAddress = deploymentData.contracts.predictionMarket;
    const bnbMarketplaceAddress = deploymentData.contracts.bnbNativeMarketplace;

    console.log('📋 Deployed Contracts:');
    console.log(`   BNB Prediction Market: ${bnbMarketAddress}`);
    console.log(`   BNB Native Marketplace: ${bnbMarketplaceAddress}\n`);

    // Get signer
    const [deployer] = await ethers.getSigners();
    console.log(`👤 Checking from address: ${deployer.address}\n`);

    // Connect to contracts
    const PredictionMarket = await ethers.getContractAt(
        'PredictionMarketWithMultipliers',
        bnbMarketAddress
    );

    const Marketplace = await ethers.getContractAt(
        'BNBNativeMarketplace',
        bnbMarketplaceAddress
    );

    // 1. Check marketplace approval
    console.log('═══════════════════════════════════════════════════════');
    console.log('1️⃣  MARKETPLACE APPROVAL STATUS');
    console.log('═══════════════════════════════════════════════════════\n');

    const isApproved = await PredictionMarket.approvedMarketplaces(bnbMarketplaceAddress);
    console.log(`   Marketplace approved: ${isApproved ? '✅ YES' : '❌ NO'}`);

    if (!isApproved) {
        console.log('   ⚠️  WARNING: Marketplace is not approved!');
        console.log('   Run: npx hardhat run scripts/approve-bnb-marketplace.ts --network bscTestnet\n');
    } else {
        console.log('   ✅ Marketplace can facilitate ownership transfers\n');
    }

    // 2. Check market count
    console.log('═══════════════════════════════════════════════════════');
    console.log('2️⃣  MARKET INVENTORY');
    console.log('═══════════════════════════════════════════════════════\n');

    const nextMarketId = await PredictionMarket.nextMarketId();
    console.log(`   Total markets created: ${nextMarketId}`);
    console.log(`   Valid market IDs: 0 to ${Number(nextMarketId) - 1}\n`);

    if (nextMarketId == 0n) {
        console.log('   ⚠️  WARNING: No markets exist on this contract!');
        console.log('   You need to create a BNB market before you can list it.\n');
        console.log('   💡 TIP: Go to your app and create a new market with BNB as the payment token.\n');
        return;
    }

    // 3. Check deployer's markets
    console.log('═══════════════════════════════════════════════════════');
    console.log('3️⃣  YOUR MARKETS');
    console.log('═══════════════════════════════════════════════════════\n');

    let yourMarkets = 0;
    let openMarkets = 0;
    let listedMarkets = 0;

    for (let i = 0; i < Number(nextMarketId); i++) {
        try {
            const marketInfo = await PredictionMarket.getMarketInfo(i);

            if (marketInfo.creator.toLowerCase() === deployer.address.toLowerCase()) {
                yourMarkets++;

                const isOpen = Number(marketInfo.status) === 0;
                const isListed = await Marketplace.isMarketListed(i);

                if (isOpen) {
                    openMarkets++;
                }
                if (isListed) {
                    listedMarkets++;
                }

                console.log(`   Market #${i}:`);
                console.log(`      Question: ${marketInfo.question}`);
                console.log(`      Status: ${['Open', 'Closed', 'ResolutionRequested', 'Resolved', 'Disputed'][Number(marketInfo.status)]}`);
                console.log(`      Listed: ${isListed ? 'Yes' : 'No'}`);
                console.log(`      Total Backing: ${ethers.formatEther(marketInfo.totalBacking)} BNB`);
                console.log();
            }
        } catch (error) {
            // Market doesn't exist or error reading
        }
    }

    console.log(`   📊 Summary:`);
    console.log(`      Total your markets: ${yourMarkets}`);
    console.log(`      Open markets: ${openMarkets}`);
    console.log(`      Already listed: ${listedMarkets}`);
    console.log(`      Available to list: ${openMarkets - listedMarkets}\n`);

    // 4. Recommendations
    console.log('═══════════════════════════════════════════════════════');
    console.log('4️⃣  RECOMMENDATIONS');
    console.log('═══════════════════════════════════════════════════════\n');

    if (yourMarkets === 0) {
        console.log('   ❌ You have no markets on this contract.');
        console.log('   ➡️  ACTION: Create a new BNB market in your app.\n');
    } else if (openMarkets === 0) {
        console.log('   ⚠️  All your markets are closed or resolved.');
        console.log('   ➡️  ACTION: Create a new BNB market, or wait for markets to be open.\n');
    } else if (openMarkets === listedMarkets) {
        console.log('   ℹ️  All your open markets are already listed.');
        console.log('   ➡️  Create more markets or wait for existing ones to sell.\n');
    } else {
        console.log(`   ✅ You have ${openMarkets - listedMarkets} market(s) available to list!`);
        console.log('   ➡️  You can list them via the marketplace UI.\n');
    }

    // 5. Frontend Environment Check
    console.log('═══════════════════════════════════════════════════════');
    console.log('5️⃣  FRONTEND CONFIGURATION');
    console.log('═══════════════════════════════════════════════════════\n');

    console.log('   Make sure your Frontend .env has:');
    console.log(`   NEXT_PUBLIC_PREDICTION_MARKET_ADDRESS=${bnbMarketAddress}`);
    console.log(`   NEXT_PUBLIC_BNB_NATIVE_MARKETPLACE_ADDRESS=${bnbMarketplaceAddress}\n`);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error('\n❌ Error:', error);
        process.exit(1);
    });
