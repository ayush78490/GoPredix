import { ethers } from 'hardhat';
import fs from 'fs';
import path from 'path';

async function main() {
    console.log('\n🚀 Deploying Updated BNB Prediction Market (with Marketplace Approval)\n');
    console.log('='.repeat(60));

    const [deployer] = await ethers.getSigners();
    const network = await ethers.provider.getNetwork();

    const balance = await ethers.provider.getBalance(deployer.address);
    console.log(`\n📊 Deployment Information:`);
    console.log(`   Network: ${network.name} (Chain ID: ${network.chainId})`);
    console.log(`   Deployer: ${deployer.address}`);
    console.log(`   Balance: ${ethers.formatEther(balance)} BNB\n`);

    // Configuration
    const FEE_BPS = 50;           // 0.5% platform fee
    const LP_FEE_BPS = 7000;      // 70% of fees to LPs
    const RESOLUTION_SERVER = deployer.address;

    console.log('⚙️  Configuration:');
    console.log(`   Platform Fee: ${FEE_BPS / 100}%`);
    console.log(`   LP Fee Share: ${LP_FEE_BPS / 100}%`);
    console.log(`   Resolution Server: ${RESOLUTION_SERVER}\n`);

    // Deploy BNB Prediction Market
    console.log('📦 Deploying BNB Prediction Market (Bazar)...\n');

    const PredictionMarket = await ethers.getContractFactory('PredictionMarketWithMultipliers');
    const predictionMarket = await PredictionMarket.deploy(
        FEE_BPS,
        LP_FEE_BPS,
        RESOLUTION_SERVER
    );
    await predictionMarket.waitForDeployment();
    const marketAddress = await predictionMarket.getAddress();

    console.log(`✅ BNB Prediction Market deployed to: ${marketAddress}\n`);

    // Deploy Helper Contract
    console.log('📦 Deploying Helper Contract...\n');

    const Helper = await ethers.getContractFactory('PredictionMarketHelper');
    const helper = await Helper.deploy(marketAddress);
    await helper.waitForDeployment();
    const helperAddress = await helper.getAddress();

    console.log(`✅ Helper Contract deployed to: ${helperAddress}\n`);

    // ==================== Save Deployment Information ====================
    console.log('💾 Saving deployment information...\n');

    const deployment = {
        network: 'BSC Testnet',
        chainId: Number(network.chainId),
        timestamp: new Date().toISOString(),
        deployer: deployer.address,
        contracts: {
            predictionMarket: marketAddress,
            helperContract: helperAddress
        },
        config: {
            feeBps: FEE_BPS,
            lpFeeBps: LP_FEE_BPS,
            resolutionServer: RESOLUTION_SERVER
        },
        lastUpdate: 'Updated BNB Prediction Market with Marketplace Approval'
    };

    const deploymentsDir = path.join(process.cwd(), 'deployments');
    if (!fs.existsSync(deploymentsDir)) {
        fs.mkdirSync(deploymentsDir, { recursive: true });
    }

    // Save timestamped version
    const deploymentFile = path.join(deploymentsDir, `deployment-bazar-fixed-${Date.now()}.json`);
    fs.writeFileSync(deploymentFile, JSON.stringify(deployment, null, 2));
    console.log(`✅ Deployment info saved to: ${deploymentFile}`);

    // Update latest.json
    const latestPath = path.join(deploymentsDir, 'latest.json');
    let latestDeployment: any = {};

    try {
        const existing = fs.readFileSync(latestPath, 'utf8');
        latestDeployment = JSON.parse(existing);
    } catch (error) {
        console.log('⚠️  No existing latest.json found, creating new one');
    }

    // Update only the BNB contracts
    latestDeployment = {
        ...latestDeployment,
        network: deployment.network,
        chainId: deployment.chainId,
        timestamp: deployment.timestamp,
        deployer: deployment.deployer,
        contracts: {
            ...latestDeployment.contracts,
            predictionMarket: marketAddress,
            helperContract: helperAddress
        },
        config: {
            ...latestDeployment.config,
            ...deployment.config
        },
        lastUpdate: deployment.lastUpdate
    };

    fs.writeFileSync(latestPath, JSON.stringify(latestDeployment, null, 2));
    console.log(`✅ Updated latest.json\n`);

    // ==================== Export ABI ====================
    console.log('📦 Exporting ABIs to frontend...\n');

    const frontendContractsDir = path.join(process.cwd(), '../Frontend/contracts');
    if (!fs.existsSync(frontendContractsDir)) {
        fs.mkdirSync(frontendContractsDir, { recursive: true });
    }

    // Save Prediction Market ABI
    const marketABI = PredictionMarket.interface.formatJson();
    fs.writeFileSync(
        path.join(frontendContractsDir, 'abi.json'),
        marketABI
    );
    console.log('✅ Saved abi.json');

    // Save Helper ABI
    const helperABI = Helper.interface.formatJson();
    fs.writeFileSync(
        path.join(frontendContractsDir, 'helperABI.json'),
        helperABI
    );
    console.log('✅ Saved helperABI.json\n');

    // ==================== Update Frontend Environment ====================
    console.log('📝 Updating frontend environment variables...\n');

    const frontendEnvPath = path.join(process.cwd(), '../Frontend/.env.local');
    let envContent = '';

    try {
        envContent = fs.readFileSync(frontendEnvPath, 'utf8');
    } catch (error) {
        console.log('⚠️  No existing .env.local found, creating new one...');
    }

    // Update BNB Prediction Market address
    const marketEnvVar = `NEXT_PUBLIC_PREDICTION_MARKET_ADDRESS=${marketAddress}`;
    if (envContent.includes('NEXT_PUBLIC_PREDICTION_MARKET_ADDRESS=')) {
        envContent = envContent.replace(
            /NEXT_PUBLIC_PREDICTION_MARKET_ADDRESS=.*/,
            marketEnvVar
        );
    } else {
        envContent += `\n# BNB Prediction Market\n${marketEnvVar}\n`;
    }

    // Update Helper Contract address
    const helperEnvVar = `NEXT_PUBLIC_HELPER_CONTRACT_ADDRESS=${helperAddress}`;
    if (envContent.includes('NEXT_PUBLIC_HELPER_CONTRACT_ADDRESS=')) {
        envContent = envContent.replace(
            /NEXT_PUBLIC_HELPER_CONTRACT_ADDRESS=.*/,
            helperEnvVar
        );
    } else {
        envContent += `# BNB Helper Contract\n${helperEnvVar}\n`;
    }

    fs.writeFileSync(frontendEnvPath, envContent);
    console.log('✅ Updated .env.local\n');

    // ==================== Deployment Summary ====================
    console.log('='.repeat(60));
    console.log('🎉 DEPLOYMENT COMPLETE!');
    console.log('='.repeat(60));
    console.log('\n📋 Contract Addresses:\n');
    console.log(`BNB Prediction Market:    ${marketAddress}`);
    console.log(`Helper Contract:          ${helperAddress}`);
    console.log('\n📊 Configuration:\n');
    console.log(`Platform Fee:             ${FEE_BPS / 100}%`);
    console.log(`LP Fee Share:             ${LP_FEE_BPS / 100}%`);
    console.log(`Resolution Server:        ${RESOLUTION_SERVER}`);
    console.log('\n' + '='.repeat(60));

    console.log('\n✨ Next Steps:\n');
    console.log('1. Approve the BNB Native Marketplace:');
    console.log(`   npx hardhat run scripts/approve-marketplace.ts --network bscTestnet`);
    console.log('\n2. Verify contracts on BSCScan:');
    console.log(`   npx hardhat verify --network bscTestnet ${marketAddress} ${FEE_BPS} ${LP_FEE_BPS} \"${RESOLUTION_SERVER}\"`);
    console.log('\n3. Test the complete flow:');
    console.log(`   npx hardhat run scripts/test-marketplace-flow.ts --network bscTestnet`);
    console.log('\n4. Restart your frontend:');
    console.log('   cd ../Frontend && npm run dev\n');
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error('\n❌ Deployment failed:', error);
        process.exit(1);
    });
