import { ethers } from "hardhat";
import * as fs from 'fs';
import * as path from 'path';

/**
 * Deploy BNB Custodial Marketplace
 * Uses the same 3-step listing process as PDX marketplace but with BNB payments
 */
async function main() {
    console.log('🚀 Deploying BNB Custodial Marketplace...\n');

    // Load existing deployment data
    const deploymentsPath = path.join(__dirname, '../deployments/latest.json');
    let deploymentData: any = {};

    if (fs.existsSync(deploymentsPath)) {
        deploymentData = JSON.parse(fs.readFileSync(deploymentsPath, 'utf8'));
        console.log('📋 Loaded existing deployment data\n');
    }

    // Get deployer
    const [deployer] = await ethers.getSigners();
    console.log('👤 Deployer:', deployer.address);

    const balance = await ethers.provider.getBalance(deployer.address);
    console.log('💰 Balance:', ethers.formatEther(balance), 'BNB\n');

    // Get BNB Prediction Market address from deployment
    const bnbMarketAddress = deploymentData.contracts?.predictionMarket;
    if (!bnbMarketAddress) {
        throw new Error('BNB Prediction Market address not found in deployment data!');
    }

    console.log('📋 Using BNB Prediction Market:', bnbMarketAddress);

    // Marketplace fee in basis points (200 = 2%)
    const marketplaceFeeBps = 200;
    console.log('📊 Marketplace Fee:', marketplaceFeeBps / 100, '%\n');

    // Deploy BNB Custodial Marketplace
    console.log('📦 Deploying BNB Custodial Marketplace...');
    const BNBCustodialMarketplace = await ethers.getContractFactory('BNBCustodialMarketplace');
    const bnbCustodialMarketplace = await BNBCustodialMarketplace.deploy(
        bnbMarketAddress,
        marketplaceFeeBps
    );

    await bnbCustodialMarketplace.waitForDeployment();
    const bnbCustodialMarketplaceAddress = await bnbCustodialMarketplace.getAddress();

    console.log('✅ BNB Custodial Marketplace deployed to:', bnbCustodialMarketplaceAddress);
    console.log();

    // Approve the marketplace on the BNB Prediction Market contract
    console.log('🔐 Approving marketplace on BNB Prediction Market...');
    const PredictionMarket = await ethers.getContractAt(
        'PredictionMarketWithMultipliers',
        bnbMarketAddress
    );

    const approveTx = await PredictionMarket.setApprovedMarketplace(
        bnbCustodialMarketplaceAddress,
        true
    );
    await approveTx.wait();
    console.log('✅ Marketplace approved!\n');

    // Verify approval
    const isApproved = await PredictionMarket.approvedMarketplaces(bnbCustodialMarketplaceAddress);
    console.log('🔍 Verification - Marketplace approved:', isApproved ? '✅ YES' : '❌ NO\n');

    // Update deployment data
    deploymentData.contracts = {
        ...deploymentData.contracts,
        bnbCustodialMarketplace: bnbCustodialMarketplaceAddress
    };

    deploymentData.lastUpdate = 'Added BNB Custodial Marketplace';
    deploymentData.timestamp = new Date().toISOString();

    // Save deployment data
    fs.writeFileSync(deploymentsPath, JSON.stringify(deploymentData, null, 2));
    console.log('💾 Deployment data saved to:', deploymentsPath);
    console.log();

    // Export ABI for frontend
    const abiPath = path.join(__dirname, '../../Frontend/contracts/bnbCustodialMarketplaceAbi.json');
    const artifact = await ethers.getContractFactory('BNBCustodialMarketplace');
    const abi = artifact.interface.formatJson();

    fs.writeFileSync(abiPath, abi);
    console.log('📄 ABI exported to:', abiPath);
    console.log();

    // Summary
    console.log('═══════════════════════════════════════════════════════');
    console.log('📊 DEPLOYMENT SUMMARY');
    console.log('═══════════════════════════════════════════════════════\n');
    console.log('Contract Addresses:');
    console.log('  BNB Prediction Market:      ', bnbMarketAddress);
    console.log('  BNB Custodial Marketplace:  ', bnbCustodialMarketplaceAddress);
    console.log();
    console.log('Configuration:');
    console.log('  Marketplace Fee:             ', marketplaceFeeBps / 100, '%');
    console.log('  Marketplace Approved:        ', isApproved ? '✅ YES' : '❌ NO');
    console.log();
    console.log('Frontend Integration:');
    console.log('  Add to .env.local:');
    console.log(`  NEXT_PUBLIC_BNB_CUSTODIAL_MARKETPLACE_ADDRESS=${bnbCustodialMarketplaceAddress}`);
    console.log();
    console.log('═══════════════════════════════════════════════════════');
    console.log('✅ DEPLOYMENT COMPLETE!');
    console.log('═══════════════════════════════════════════════════════\n');

    console.log('📝 Next Steps:');
    console.log('1. Update Frontend .env.local with the new marketplace address');
    console.log('2. Update the sell modal to use BNB Custodial Marketplace');
    console.log('3. Create a React hook for BNB Custodial Marketplace');
    console.log('4. Test the 3-step listing flow\n');
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error('\n❌ Error:', error);
        process.exit(1);
    });
