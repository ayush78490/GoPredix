import { ethers } from 'hardhat';
import fs from 'fs';
import path from 'path';

async function main() {
    console.log('\n🔐 Approving BNB Native Marketplace\n');
    console.log('='.repeat(60));

    const [deployer] = await ethers.getSigners();

    // Load latest deployment
    const latestDeploymentPath = path.join(process.cwd(), 'deployments', 'latest.json');
    let latestDeployment;

    try {
        const deploymentData = fs.readFileSync(latestDeploymentPath, 'utf8');
        latestDeployment = JSON.parse(deploymentData);
        console.log('\n📂 Loaded deployment from latest.json\n');
    } catch (error) {
        throw new Error('❌ Could not load deployment. Please deploy contracts first.');
    }

    const predictionMarketAddress = latestDeployment.contracts.predictionMarket;
    const marketplaceAddress = latestDeployment.contracts.bnbNativeMarketplace;

    if (!predictionMarketAddress || !marketplaceAddress) {
        throw new Error('❌ Required contract addresses not found in deployment');
    }

    console.log('📋 Contract Addresses:\n');
    console.log(`BNB Prediction Market:    ${predictionMarketAddress}`);
    console.log(`BNB Native Marketplace:   ${marketplaceAddress}`);
    console.log(`Deployer/Owner:           ${deployer.address}\n`);

    // Connect to the prediction market contract
    const predictionMarket = await ethers.getContractAt(
        'PredictionMarketWithMultipliers',
        predictionMarketAddress
    );

    // Check current approval status
    console.log('🔍 Checking current approval status...');
    const isCurrentlyApproved = await predictionMarket.approvedMarketplaces(marketplaceAddress);
    console.log(`   Currently approved: ${isCurrentlyApproved}\n`);

    if (isCurrentlyApproved) {
        console.log('✅ Marketplace is already approved!');
        console.log('='.repeat(60));
        return;
    }

    // Approve the marketplace
    console.log('📝 Approving marketplace...');
    const tx = await predictionMarket.setApprovedMarketplace(marketplaceAddress, true);
    console.log(`   Transaction hash: ${tx.hash}`);

    console.log('⏳ Waiting for confirmation...');
    await tx.wait();

    console.log('✅ Transaction confirmed!\n');

    // Verify approval
    console.log('🔍 Verifying approval...');
    const isNowApproved = await predictionMarket.approvedMarketplaces(marketplaceAddress);
    console.log(`   Now approved: ${isNowApproved}\n`);

    if (isNowApproved) {
        console.log('='.repeat(60));
        console.log('🎉 MARKETPLACE SUCCESSFULLY APPROVED!');
        console.log('='.repeat(60));
        console.log('\n✨ What this means:\n');
        console.log('✅ Marketplace can now transfer market ownership on behalf of sellers');
        console.log('✅ When buyers purchase markets, ownership will transfer automatically');
        console.log('✅ The BNB Native Marketplace is now fully functional!');
        console.log('\n📝 Next Steps:\n');
        console.log('1. Test the marketplace:');
        console.log('   npx hardhat run scripts/test-marketplace-flow.ts --network bscTestnet');
        console.log('\n2. Create and list a market through the frontend');
        console.log('\n3. Try purchasing a market to test ownership transfer\n');
    } else {
        console.log('❌ Approval failed! Please check the transaction.');
    }

    console.log('='.repeat(60));
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error('\n❌ Approval failed:', error);
        process.exit(1);
    });
