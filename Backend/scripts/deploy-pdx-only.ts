import { ethers } from 'hardhat';
import fs from 'fs';
import path from 'path';

async function main() {
    console.log('🚀 Starting PDX-only contract deployment...\n');

    const [deployer] = await ethers.getSigners();
    console.log(`📝 Deploying contracts with account: ${deployer.address}`);
    console.log(`💰 Account balance: ${ethers.formatEther(await ethers.provider.getBalance(deployer.address))} BNB\n`);

    // Configuration
    const FEE_BPS = 50; // 0.5% platform fee
    const CREATOR_FEE_BPS = 10000; // 100% of fees (will be split 2% creator, 1% platform in contract)
    const RESOLUTION_SERVER = deployer.address;

    const deployedContracts: Record<string, string> = {};

    // ==================== STEP 1: Deploy PDX Token ====================
    console.log('📦 Step 1: Deploying PDX Token...');
    const PDXToken = await ethers.getContractFactory('GPXToken');
    const pdxToken = await PDXToken.deploy();
    await pdxToken.waitForDeployment();
    const pdxTokenAddress = await pdxToken.getAddress();
    console.log(`✅ PDX Token deployed to: ${pdxTokenAddress}\n`);

    deployedContracts.pdxToken = pdxTokenAddress;

    // ==================== STEP 2: Deploy PDX Faucet ====================
    console.log('📦 Step 2: Deploying PDX Faucet...');
    const PDXFaucet = await ethers.getContractFactory('PDXFaucet');
    const pdxFaucet = await PDXFaucet.deploy(pdxTokenAddress);
    await pdxFaucet.waitForDeployment();
    const pdxFaucetAddress = await pdxFaucet.getAddress();
    console.log(`✅ PDX Faucet deployed to: ${pdxFaucetAddress}\n`);

    deployedContracts.pdxFaucet = pdxFaucetAddress;

    // Transfer PDX tokens to faucet for testing
    console.log('💸 Transferring PDX tokens to faucet...');
    const transferAmount = ethers.parseUnits('10000000', 18); // 10M PDX
    await pdxToken.transfer(pdxFaucetAddress, transferAmount);
    console.log(`✅ Transferred ${ethers.formatUnits(transferAmount, 18)} PDX to faucet\n`);

    // ==================== STEP 3: Deploy PDX Prediction Market ====================
    console.log('📦 Step 3: Deploying PDX Prediction Market...');
    const PDXBazar = await ethers.getContractFactory('PDXPredictionMarket');
    const pdxBazar = await PDXBazar.deploy(
        pdxTokenAddress,
        FEE_BPS,
        RESOLUTION_SERVER,
        CREATOR_FEE_BPS
    );
    await pdxBazar.waitForDeployment();
    const pdxBazarAddress = await pdxBazar.getAddress();
    console.log(`✅ PDX Prediction Market deployed to: ${pdxBazarAddress}\n`);

    deployedContracts.pdxBazar = pdxBazarAddress;

    // ==================== STEP 4: Deploy PDX Helper Contract ====================
    console.log('📦 Step 4: Deploying PDX Helper Contract...');
    const PDXHelperContract = await ethers.getContractFactory('PDXPredictionMarketHelper');
    const pdxHelperContract = await PDXHelperContract.deploy(pdxBazarAddress, pdxTokenAddress);
    await pdxHelperContract.waitForDeployment();
    const pdxHelperContractAddress = await pdxHelperContract.getAddress();
    console.log(`✅ PDX Helper Contract deployed to: ${pdxHelperContractAddress}\n`);

    deployedContracts.pdxHelperContract = pdxHelperContractAddress;

    // ==================== STEP 5: Deploy PDX Custodial Marketplace ====================
    console.log('📦 Step 5: Deploying PDX Custodial Marketplace...');
    const MARKETPLACE_FEE_BPS = 200; // 2% marketplace fee

    const PDXCustodialMarketplace = await ethers.getContractFactory('CustodialMarketplace');
    const pdxCustodialMarketplace = await PDXCustodialMarketplace.deploy(
        pdxTokenAddress,
        pdxBazarAddress,
        MARKETPLACE_FEE_BPS
    );
    await pdxCustodialMarketplace.waitForDeployment();
    const pdxCustodialMarketplaceAddress = await pdxCustodialMarketplace.getAddress();
    console.log(`✅ PDX Custodial Marketplace deployed to: ${pdxCustodialMarketplaceAddress}\n`);

    deployedContracts.pdxCustodialMarketplace = pdxCustodialMarketplaceAddress;

    // ==================== STEP 6: Deploy PDX Dispute Resolution ====================
    console.log('📦 Step 6: Deploying PDX Dispute Resolution...');
    const PDXDisputeResolution = await ethers.getContractFactory('DisputeResolution');
    const pdxDisputeResolution = await PDXDisputeResolution.deploy(
        RESOLUTION_SERVER
    );
    await pdxDisputeResolution.waitForDeployment();
    const pdxDisputeResolutionAddress = await pdxDisputeResolution.getAddress();
    console.log(`✅ PDX Dispute Resolution deployed to: ${pdxDisputeResolutionAddress}\n`);

    deployedContracts.pdxDisputeResolution = pdxDisputeResolutionAddress;

    // ==================== STEP 7: Save Deployment Information ====================
    console.log('💾 Saving deployment information...\n');

    const deploymentInfo = {
        network: 'BSC Testnet',
        chainId: 97,
        timestamp: new Date().toISOString(),
        deployer: deployer.address,
        contracts: deployedContracts,
        config: {
            feeBps: FEE_BPS,
            creatorFeeBps: CREATOR_FEE_BPS,
            marketplaceFeeBps: MARKETPLACE_FEE_BPS,
            resolutionServer: RESOLUTION_SERVER
        }
    };

    // Save deployment info
    const deploymentsDir = path.join(process.cwd(), 'deployments');
    if (!fs.existsSync(deploymentsDir)) {
        fs.mkdirSync(deploymentsDir, { recursive: true });
    }

    const deploymentFile = path.join(deploymentsDir, `pdx-deployment-${Date.now()}.json`);
    fs.writeFileSync(deploymentFile, JSON.stringify(deploymentInfo, null, 2));
    console.log(`✅ Deployment info saved to: ${deploymentFile}`);

    // Save as pdx-latest
    const latestFile = path.join(deploymentsDir, 'pdx-latest.json');
    fs.writeFileSync(latestFile, JSON.stringify(deploymentInfo, null, 2));
    console.log(`✅ Latest PDX deployment saved to: ${latestFile}`);

    // ==================== STEP 8: Export ABIs ====================
    console.log('\n📦 Exporting ABIs to frontend...\n');

    const frontendContractsDir = path.join(process.cwd(), '../Frontend/contracts');
    if (!fs.existsSync(frontendContractsDir)) {
        fs.mkdirSync(frontendContractsDir, { recursive: true });
    }

    // Save PDX Bazar ABI
    const PDXBazarABI = PDXBazar.interface.formatJson();
    fs.writeFileSync(
        path.join(frontendContractsDir, 'PDXbazar.json'),
        PDXBazarABI
    );
    console.log('✅ Saved PDXbazar.json');

    // Save PDX Helper ABI
    const PDXHelperABI = PDXHelperContract.interface.formatJson();
    fs.writeFileSync(
        path.join(frontendContractsDir, 'PDXhelperContract.json'),
        PDXHelperABI
    );
    console.log('✅ Saved PDXhelperContract.json');

    // Save PDX Token ABI
    const PDXTokenABI = PDXToken.interface.formatJson();
    fs.writeFileSync(
        path.join(frontendContractsDir, 'gpx.json'),
        PDXTokenABI
    );
    console.log('✅ Saved gpx.json');

    // ==================== DEPLOYMENT SUMMARY ====================
    console.log('\n' + '='.repeat(70));
    console.log('🎉 PDX DEPLOYMENT COMPLETE!');
    console.log('='.repeat(70));
    console.log('\n📋 Contract Addresses:\n');
    console.log(`PDX Token:                   ${pdxTokenAddress}`);
    console.log(`PDX Faucet:                  ${pdxFaucetAddress}`);
    console.log(`PDX Prediction Market:       ${pdxBazarAddress}`);
    console.log(`PDX Helper Contract:         ${pdxHelperContractAddress}`);
    console.log(`PDX Custodial Marketplace:   ${pdxCustodialMarketplaceAddress}`);
    console.log(`PDX Dispute Resolution:      ${pdxDisputeResolutionAddress}`);
    console.log('\n' + '='.repeat(70));

    console.log('\n📝 Environment Variables for Frontend .env:\n');
    console.log(`NEXT_PUBLIC_PDX_TOKEN_ADDRESS=${pdxTokenAddress}`);
    console.log(`NEXT_PUBLIC_PDX_FAUCET_ADDRESS=${pdxFaucetAddress}`);
    console.log(`NEXT_PUBLIC_PDX_MARKET_ADDRESS=${pdxBazarAddress}`);
    console.log(`NEXT_PUBLIC_PDX_HELPER_ADDRESS=${pdxHelperContractAddress}`);
    console.log(`NEXT_PUBLIC_PDX_CUSTODIAL_MARKETPLACE=${pdxCustodialMarketplaceAddress}`);
    console.log(`NEXT_PUBLIC_PDX_DISPUTE_RESOLUTION_ADDRESS=${pdxDisputeResolutionAddress}`);

    console.log('\n' + '='.repeat(70));
    console.log('\n✨ Next Steps:\n');
    console.log('1. Copy the environment variables above to Frontend/.env');
    console.log('2. Restart your frontend dev server');
    console.log('3. Use the PDX faucet to get test tokens');
    console.log('4. Create PDX markets and test trading\n');
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error('❌ Deployment failed:', error);
        process.exit(1);
    });
