import { ethers } from 'hardhat';
import fs from 'fs';
import path from 'path';

async function main() {
    console.log('\n🚀 Deploying BNB Native Marketplace (Updated)\n');
    console.log('='.repeat(60));

    const [deployer] = await ethers.getSigners();
    const network = await ethers.provider.getNetwork();

    const balance = await ethers.provider.getBalance(deployer.address);
    console.log(`\n📊 Deployment Information:`);
    console.log(`   Network: ${network.name} (Chain ID: ${network.chainId})`);
    console.log(`   Deployer: ${deployer.address}`);
    console.log(`   Balance: ${ethers.formatEther(balance)} BNB\n`);

    // Load existing deployment to get the new prediction market address
    const latestDeploymentPath = path.join(process.cwd(), 'deployments', 'latest.json');
    let latestDeployment;

    try {
        const deploymentData = fs.readFileSync(latestDeploymentPath, 'utf8');
        latestDeployment = JSON.parse(deploymentData);
        console.log('📂 Loaded existing deployment from latest.json\n');
    } catch (error) {
        throw new Error('❌ Could not load existing deployment. Please deploy Bazar first.');
    }

    // Get NEW BNB Prediction Market address from deployment
    const predictionMarketAddress = latestDeployment.contracts.predictionMarket;

    if (!predictionMarketAddress) {
        throw new Error('❌ BNB Prediction Market address not found in deployment.');
    }

    console.log('✅ Using NEW BNB Prediction Market:');
    console.log(`   Address: ${predictionMarketAddress}\n`);

    // Configuration
    const MARKETPLACE_FEE_BPS = 200; // 2% marketplace fee

    console.log('⚙️  Configuration:');
    console.log(`   Marketplace Fee: ${MARKETPLACE_FEE_BPS / 100}%`);
    console.log(`   Prediction Market: ${predictionMarketAddress}\n`);

    // ==================== Deploy BNB Native Marketplace ====================
    console.log('📦 Deploying BNB Native Marketplace...\n');

    const BNBNativeMarketplace = await ethers.getContractFactory('BNBNativeMarketplace');
    const marketplace = await BNBNativeMarketplace.deploy(
        predictionMarketAddress,  // Use the NEW prediction market address
        MARKETPLACE_FEE_BPS
    );
    await marketplace.waitForDeployment();
    const marketplaceAddress = await marketplace.getAddress();

    console.log(`✅ BNB Native Marketplace deployed to: ${marketplaceAddress}\n`);

    // ==================== Save Deployment Information ====================
    console.log('💾 Updating deployment information...\n');

    // Update the existing deployment with new marketplace
    latestDeployment.contracts.bnbNativeMarketplace = marketplaceAddress;
    latestDeployment.timestamp = new Date().toISOString();
    latestDeployment.lastUpdate = 'Updated BNB Native Marketplace with new Prediction Market';

    // Save timestamped version
    const deploymentsDir = path.join(process.cwd(), 'deployments');
    const deploymentFile = path.join(deploymentsDir, `deployment-bnb-marketplace-updated-${Date.now()}.json`);
    fs.writeFileSync(deploymentFile, JSON.stringify(latestDeployment, null, 2));
    console.log(`✅ Deployment info saved to: ${deploymentFile}`);

    // Update latest.json
    fs.writeFileSync(latestDeploymentPath, JSON.stringify(latestDeployment, null, 2));
    console.log(`✅ Updated latest.json\n`);

    // ==================== Export ABI ====================
    console.log('📦 Exporting ABI to frontend...\n');

    const frontendContractsDir = path.join(process.cwd(), '../Frontend/contracts');
    const marketplaceABI = BNBNativeMarketplace.interface.formatJson();
    fs.writeFileSync(
        path.join(frontendContractsDir, 'bnbNativeMarketplaceAbi.json'),
        marketplaceABI
    );
    console.log('✅ Saved bnbNativeMarketplaceAbi.json\n');

    // ==================== Deployment Summary ====================
    console.log('='.repeat(60));
    console.log('🎉 DEPLOYMENT COMPLETE!');
    console.log('='.repeat(60));
    console.log('\n📋 Contract Addresses:\n');
    console.log(`BNB Native Marketplace:   ${marketplaceAddress}`);
    console.log(`Prediction Market:        ${predictionMarketAddress}`);
    console.log('\n📊 Configuration:\n');
    console.log(`Marketplace Fee:          ${MARKETPLACE_FEE_BPS / 100}%`);
    console.log('\n' + '='.repeat(60));

    console.log('\n✨ Next Steps:\n');
    console.log('1. Approve the marketplace:');
    console.log(`   npx hardhat run scripts/approve-marketplace.ts --network bscTestnet`);
    console.log('\n2. Test the complete flow:');
    console.log(`   npx hardhat run scripts/test-marketplace-flow.ts --network bscTestnet\n`);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error('\n❌ Deployment failed:', error);
        process.exit(1);
    });
