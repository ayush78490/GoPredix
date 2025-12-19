import { ethers } from 'hardhat';
import fs from 'fs';
import path from 'path';

async function main() {
    console.log('\n🚀 Deploying BNB Native Marketplace to Testnet\n');
    console.log('='.repeat(60));

    const [deployer] = await ethers.getSigners();
    const network = await ethers.provider.getNetwork();

    const balance = await ethers.provider.getBalance(deployer.address);
    console.log(`\n📊 Deployment Information:`);
    console.log(`   Network: ${network.name} (Chain ID: ${network.chainId})`);
    console.log(`   Deployer: ${deployer.address}`);
    console.log(`   Balance: ${ethers.formatEther(balance)} BNB\n`);

    // Load existing deployment
    const latestDeploymentPath = path.join(process.cwd(), 'deployments', 'latest.json');
    let latestDeployment;

    try {
        const deploymentData = fs.readFileSync(latestDeploymentPath, 'utf8');
        latestDeployment = JSON.parse(deploymentData);
        console.log('📂 Loaded existing deployment from latest.json\n');
    } catch (error) {
        throw new Error('❌ Could not load existing deployment. Please deploy core contracts first.');
    }

    // Get BNB Prediction Market address from existing deployment
    const predictionMarketAddress = latestDeployment.contracts.predictionMarket;

    if (!predictionMarketAddress) {
        throw new Error('❌ BNB Prediction Market address not found in deployment. Deploy it first.');
    }

    console.log('✅ Using existing BNB Prediction Market:');
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
        predictionMarketAddress,
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
    latestDeployment.lastUpdate = 'Added BNB Native Marketplace';

    // Save updated deployment info
    const deploymentsDir = path.join(process.cwd(), 'deployments');
    if (!fs.existsSync(deploymentsDir)) {
        fs.mkdirSync(deploymentsDir, { recursive: true });
    }

    // Save timestamped version
    const deploymentFile = path.join(deploymentsDir, `deployment-bnb-marketplace-${Date.now()}.json`);
    fs.writeFileSync(deploymentFile, JSON.stringify(latestDeployment, null, 2));
    console.log(`✅ Deployment info saved to: ${deploymentFile}`);

    // Update latest.json
    fs.writeFileSync(latestDeploymentPath, JSON.stringify(latestDeployment, null, 2));
    console.log(`✅ Updated latest.json\n`);

    // ==================== Export ABI ====================
    console.log('📦 Exporting ABI to frontend...\n');

    const frontendContractsDir = path.join(process.cwd(), '../Frontend/contracts');
    if (!fs.existsSync(frontendContractsDir)) {
        fs.mkdirSync(frontendContractsDir, { recursive: true });
    }

    // Save marketplace ABI
    const marketplaceABI = BNBNativeMarketplace.interface.formatJson();
    fs.writeFileSync(
        path.join(frontendContractsDir, 'bnbNativeMarketplaceAbi.json'),
        marketplaceABI
    );
    console.log('✅ Saved bnbNativeMarketplaceAbi.json\n');

    // ==================== Update Frontend Environment ====================
    console.log('📝 Updating frontend environment variables...\n');

    const frontendEnvPath = path.join(process.cwd(), '../Frontend/.env.local');
    let envContent = '';

    // Read existing .env.local if it exists
    try {
        envContent = fs.readFileSync(frontendEnvPath, 'utf8');
    } catch (error) {
        console.log('⚠️  No existing .env.local found, creating new one...');
    }

    // Add or update BNB Native Marketplace address
    const marketplaceEnvVar = `NEXT_PUBLIC_BNB_NATIVE_MARKETPLACE_ADDRESS=${marketplaceAddress}`;

    if (envContent.includes('NEXT_PUBLIC_BNB_NATIVE_MARKETPLACE_ADDRESS=')) {
        // Replace existing
        envContent = envContent.replace(
            /NEXT_PUBLIC_BNB_NATIVE_MARKETPLACE_ADDRESS=.*/,
            marketplaceEnvVar
        );
    } else {
        // Add new
        envContent += `\n# BNB Native Marketplace\n${marketplaceEnvVar}\n`;
    }

    fs.writeFileSync(frontendEnvPath, envContent);
    console.log('✅ Updated .env.local\n');

    // ==================== Deployment Summary ====================
    console.log('='.repeat(60));
    console.log('🎉 BNB NATIVE MARKETPLACE DEPLOYMENT COMPLETE!');
    console.log('='.repeat(60));
    console.log('\n📋 Contract Address:\n');
    console.log(`BNB Native Marketplace:   ${marketplaceAddress}`);
    console.log('\n📊 Configuration:\n');
    console.log(`Prediction Market:        ${predictionMarketAddress}`);
    console.log(`Marketplace Fee:          ${MARKETPLACE_FEE_BPS / 100}%`);
    console.log('\n' + '='.repeat(60));

    console.log('\n✨ Next Steps:\n');
    console.log('1. Verify contract on BSCScan:');
    console.log(`   npx hardhat verify --network bscTestnet ${marketplaceAddress} "${predictionMarketAddress}" ${MARKETPLACE_FEE_BPS}`);
    console.log('\n2. Test marketplace functions:');
    console.log('   - List a market for sale');
    console.log('   - Make an offer');
    console.log('   - Buy a market');
    console.log('\n3. Frontend has been updated:');
    console.log('   - ABI exported to Frontend/contracts/');
    console.log('   - .env.local updated with marketplace address');
    console.log('   - Restart your frontend: npm run dev\n');
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error('\n❌ Deployment failed:', error);
        process.exit(1);
    });
