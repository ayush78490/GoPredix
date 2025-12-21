import { ethers } from "hardhat";
import * as fs from 'fs';
import * as path from 'path';

/**
 * Script to approve the BNB Native Marketplace on the BNB Prediction Market contract
 */
async function main() {
    console.log('🔧 Approving BNB Native Marketplace...\n');

    // Load deployment data
    const deploymentsPath = path.join(__dirname, '../deployments/latest.json');
    if (!fs.existsSync(deploymentsPath)) {
        throw new Error('Deployment file not found! Please deploy contracts first.');
    }

    const deploymentData = JSON.parse(fs.readFileSync(deploymentsPath, 'utf8'));
    const bnbMarketAddress = deploymentData.contracts.predictionMarket;
    const bnbMarketplaceAddress = deploymentData.contracts.bnbNativeMarketplace;

    console.log('📋 Contract Addresses:');
    console.log(`   BNB Prediction Market: ${bnbMarketAddress}`);
    console.log(`   BNB Native Marketplace: ${bnbMarketplaceAddress}\n`);

    // Get signer
    const [deployer] = await ethers.getSigners();
    console.log(`👤 Approver: ${deployer.address}\n`);

    // Connect to BNB Prediction Market contract
    const PredictionMarket = await ethers.getContractAt(
        'PredictionMarketWithMultipliers',
        bnbMarketAddress
    );

    // Check current approval status
    console.log('🔍 Checking current approval status...');
    const isCurrentlyApproved = await PredictionMarket.approvedMarketplaces(bnbMarketplaceAddress);
    console.log(`   Current status: ${isCurrentlyApproved ? '✅ APPROVED' : '❌ NOT APPROVED'}\n`);

    if (isCurrentlyApproved) {
        console.log('✅ BNB Native Marketplace is already approved!');
        console.log('   No action needed.\n');
        return;
    }

    // Approve the marketplace
    console.log('📝 Approving BNB Native Marketplace...');
    const tx = await PredictionMarket.setApprovedMarketplace(bnbMarketplaceAddress, true);

    console.log(`   Transaction hash: ${tx.hash}`);
    console.log('   Waiting for confirmation...');

    await tx.wait();

    console.log('✅ Transaction confirmed!\n');

    // Verify approval
    const isNowApproved = await PredictionMarket.approvedMarketplaces(bnbMarketplaceAddress);
    console.log('🔍 Verification:');
    console.log(`   BNB Native Marketplace is now: ${isNowApproved ? '✅ APPROVED' : '❌ NOT APPROVED'}\n`);

    if (isNowApproved) {
        console.log('🎉 SUCCESS! BNB Native Marketplace can now facilitate market transfers.\n');
        console.log('📝 What this means:');
        console.log('   ✅ Users can list their BNB markets on the marketplace');
        console.log('   ✅ Buyers can purchase markets and receive ownership');
        console.log('   ✅ Market ownership transfers will work correctly\n');
    } else {
        console.log('❌ ERROR: Approval failed. Please check contract ownership and try again.\n');
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error('\n❌ Error:', error);
        process.exit(1);
    });
