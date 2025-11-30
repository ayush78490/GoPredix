import { ethers } from 'hardhat';
import fs from 'fs';
import path from 'path';

async function main() {
    console.log('🚀 Starting comprehensive contract deployment...\n');

    const [deployer] = await ethers.getSigners();
    console.log(`📝 Deploying contracts with account: ${deployer.address}`);
    console.log(`💰 Account balance: ${ethers.formatEther(await ethers.provider.getBalance(deployer.address))} BNB\n`);

    // Configuration
    const FEE_BPS = 50; // 0.5%
    const LP_FEE_BPS = 7000; // 70% of fees go to LPs
    const RESOLUTION_SERVER = deployer.address; // Use deployer as resolution server for now

    const deployedContracts = {};
    const abiExports = {};

    // ==================== STEP 1: Deploy BNB Prediction Market ====================
    console.log('📦 Step 1: Deploying BNB Prediction Market...');
    const PredictionMarket = await ethers.getContractFactory('PredictionMarketWithMultipliers');
    const predictionMarket = await PredictionMarket.deploy(FEE_BPS, LP_FEE_BPS, RESOLUTION_SERVER);
    await predictionMarket.waitForDeployment();
    const predictionMarketAddress = await predictionMarket.getAddress();
    console.log(`✅ BNB Prediction Market deployed to: ${predictionMarketAddress}\n`);

    deployedContracts.predictionMarket = predictionMarketAddress;
    abiExports.predictionMarket = PredictionMarket.interface.formatJson();

    // ==================== STEP 2: Deploy BNB Helper Contract ====================
    console.log('📦 Step 2: Deploying BNB Helper Contract...');
    const HelperContract = await ethers.getContractFactory('PredictionMarketHelper');
    const helperContract = await HelperContract.deploy(predictionMarketAddress);
    await helperContract.waitForDeployment();
    const helperContractAddress = await helperContract.getAddress();
    console.log(`✅ BNB Helper Contract deployed to: ${helperContractAddress}\n`);

    deployedContracts.helperContract = helperContractAddress;
    abiExports.helperContract = HelperContract.interface.formatJson();

    // ==================== STEP 3: Deploy PDX Token ====================
    console.log('📦 Step 3: Deploying PDX Token...');
    const PDXToken = await ethers.getContractFactory('GPXToken');
    const pdxToken = await PDXToken.deploy();
    await pdxToken.waitForDeployment();
    const pdxTokenAddress = await pdxToken.getAddress();
    console.log(`✅ PDX Token deployed to: ${pdxTokenAddress}\n`);

    deployedContracts.pdxToken = pdxTokenAddress;
    abiExports.pdxToken = PDXToken.interface.formatJson();

    // ==================== STEP 4: Deploy PDX Faucet ====================
    console.log('📦 Step 4: Deploying PDX Faucet...');
    const PDXFaucet = await ethers.getContractFactory('PDXFaucet');
    const pdxFaucet = await PDXFaucet.deploy(pdxTokenAddress);
    await pdxFaucet.waitForDeployment();
    const pdxFaucetAddress = await pdxFaucet.getAddress();
    console.log(`✅ PDX Faucet deployed to: ${pdxFaucetAddress}\n`);

    deployedContracts.pdxFaucet = pdxFaucetAddress;
    abiExports.pdxFaucet = PDXFaucet.interface.formatJson();

    // Transfer PDX tokens to faucet for testing
    console.log('💸 Transferring PDX tokens to faucet...');
    const transferAmount = ethers.parseUnits('10000000', 18); // 10M PDX
    await pdxToken.transfer(pdxFaucetAddress, transferAmount);
    console.log(`✅ Transferred ${ethers.formatUnits(transferAmount, 18)} PDX to faucet\n`);

    // ==================== STEP 5: Deploy PDX Prediction Market ====================
    console.log('📦 Step 5: Deploying PDX Prediction Market...');
    const PDXBazar = await ethers.getContractFactory('PDXPredictionMarket');
    const pdxBazar = await PDXBazar.deploy(pdxTokenAddress, FEE_BPS, RESOLUTION_SERVER, LP_FEE_BPS);
    await pdxBazar.waitForDeployment();
    const pdxBazarAddress = await pdxBazar.getAddress();
    console.log(`✅ PDX Prediction Market deployed to: ${pdxBazarAddress}\n`);

    deployedContracts.pdxBazar = pdxBazarAddress;
    abiExports.pdxBazar = PDXBazar.interface.formatJson();

    // ==================== STEP 6: Deploy PDX Helper Contract ====================
    console.log('📦 Step 6: Deploying PDX Helper Contract...');
    const PDXHelperContract = await ethers.getContractFactory('PDXPredictionMarketHelper');
    const pdxHelperContract = await PDXHelperContract.deploy(pdxBazarAddress, pdxTokenAddress);
    await pdxHelperContract.waitForDeployment();
    const pdxHelperContractAddress = await pdxHelperContract.getAddress();
    console.log(`✅ PDX Helper Contract deployed to: ${pdxHelperContractAddress}\n`);

    deployedContracts.pdxHelperContract = pdxHelperContractAddress;
    abiExports.pdxHelperContract = PDXHelperContract.interface.formatJson();

    // ==================== STEP 7: Deploy Marketplace Contracts ====================
    console.log('📦 Step 7: Deploying Custodial Marketplace for BNB markets...');
    const MARKETPLACE_FEE_BPS = 200; // 2% marketplace fee

    const CustodialMarketplace = await ethers.getContractFactory('CustodialMarketplace');
    const custodialMarketplace = await CustodialMarketplace.deploy(
        pdxTokenAddress,
        predictionMarketAddress,
        MARKETPLACE_FEE_BPS
    );
    await custodialMarketplace.waitForDeployment();
    const custodialMarketplaceAddress = await custodialMarketplace.getAddress();
    console.log(`✅ Custodial Marketplace deployed to: ${custodialMarketplaceAddress}\n`);

    deployedContracts.custodialMarketplace = custodialMarketplaceAddress;
    abiExports.custodialMarketplace = CustodialMarketplace.interface.formatJson();

    // ==================== STEP 8: Save Deployment Information ====================
    console.log('💾 Saving deployment information...\n');

    const deploymentInfo = {
        network: 'BSC Testnet',
        chainId: 97,
        timestamp: new Date().toISOString(),
        deployer: deployer.address,
        contracts: deployedContracts,
        config: {
            feeBps: FEE_BPS,
            lpFeeBps: LP_FEE_BPS,
            marketplaceFeeBps: MARKETPLACE_FEE_BPS,
            resolutionServer: RESOLUTION_SERVER
        }
    };

    // Save deployment info
    const deploymentsDir = path.join(process.cwd(), 'deployments');
    if (!fs.existsSync(deploymentsDir)) {
        fs.mkdirSync(deploymentsDir, { recursive: true });
    }

    const deploymentFile = path.join(deploymentsDir, `deployment-${Date.now()}.json`);
    fs.writeFileSync(deploymentFile, JSON.stringify(deploymentInfo, null, 2));
    console.log(`✅ Deployment info saved to: ${deploymentFile}`);

    // Save latest deployment
    const latestFile = path.join(deploymentsDir, 'latest.json');
    fs.writeFileSync(latestFile, JSON.stringify(deploymentInfo, null, 2));
    console.log(`✅ Latest deployment saved to: ${latestFile}`);

    // ==================== STEP 9: Generate Frontend Config ====================
    console.log('\n📝 Generating frontend configuration...\n');

    const frontendEnv = `# Contract Addresses - Auto-generated on ${new Date().toISOString()}
NEXT_PUBLIC_CHAIN_ID=97
NEXT_PUBLIC_RPC_URL=https://data-seed-prebsc-1-s1.binance.org:8545

# BNB Market Contracts
NEXT_PUBLIC_PREDICTION_MARKET_ADDRESS=${predictionMarketAddress}
NEXT_PUBLIC_HELPER_CONTRACT_ADDRESS=${helperContractAddress}

# PDX Token & Markets
NEXT_PUBLIC_PDX_TOKEN_ADDRESS=${pdxTokenAddress}
NEXT_PUBLIC_PDX_FAUCET_ADDRESS=${pdxFaucetAddress}
NEXT_PUBLIC_PDX_MARKET_ADDRESS=${pdxBazarAddress}
NEXT_PUBLIC_PDX_HELPER_CONTRACT_ADDRESS=${pdxHelperContractAddress}

# Marketplace
NEXT_PUBLIC_CUSTODIAL_MARKETPLACE_ADDRESS=${custodialMarketplaceAddress}

# Configuration
NEXT_PUBLIC_DEPLOYER_ADDRESS=${deployer.address}
NEXT_PUBLIC_RESOLUTION_SERVER=${RESOLUTION_SERVER}
`;

    const envFilePath = path.join(process.cwd(), '../Frontend/.env.local');
    fs.writeFileSync(envFilePath, frontendEnv);
    console.log(`✅ Frontend .env.local updated at: ${envFilePath}\n`);

    // ==================== STEP 10: Export ABIs ====================
    console.log('📦 Exporting ABIs to frontend...\n');

    const frontendContractsDir = path.join(process.cwd(), '../Frontend/contracts');
    if (!fs.existsSync(frontendContractsDir)) {
        fs.mkdirSync(frontendContractsDir, { recursive: true });
    }

    // Save main prediction market ABI
    fs.writeFileSync(
        path.join(frontendContractsDir, 'abi.json'),
        abiExports.predictionMarket
    );
    console.log('✅ Saved abi.json (BNB Prediction Market)');

    // Save helper contract ABI
    fs.writeFileSync(
        path.join(frontendContractsDir, 'helperAbi.json'),
        abiExports.helperContract
    );
    console.log('✅ Saved helperAbi.json');

    // Save PDX token ABI
    fs.writeFileSync(
        path.join(frontendContractsDir, 'pdxTokenAbi.json'),
        abiExports.pdxToken
    );
    console.log('✅ Saved pdxTokenAbi.json');

    // Save PDX Bazar ABI
    fs.writeFileSync(
        path.join(frontendContractsDir, 'pdxBazarAbi.json'),
        abiExports.pdxBazar
    );
    console.log('✅ Saved pdxBazarAbi.json');

    // Save PDX Helper ABI
    fs.writeFileSync(
        path.join(frontendContractsDir, 'pdxHelperAbi.json'),
        abiExports.pdxHelperContract
    );
    console.log('✅ Saved pdxHelperAbi.json');

    // Save Custodial Marketplace ABI
    fs.writeFileSync(
        path.join(frontendContractsDir, 'custodialMarketplaceAbi.json'),
        abiExports.custodialMarketplace
    );
    console.log('✅ Saved custodialMarketplaceAbi.json');

    // ==================== DEPLOYMENT SUMMARY ====================
    console.log('\n' + '='.repeat(60));
    console.log('🎉 DEPLOYMENT COMPLETE!');
    console.log('='.repeat(60));
    console.log('\n📋 Contract Addresses:\n');
    console.log(`BNB Prediction Market:       ${predictionMarketAddress}`);
    console.log(`BNB Helper Contract:         ${helperContractAddress}`);
    console.log(`PDX Token:                   ${pdxTokenAddress}`);
    console.log(`PDX Faucet:                  ${pdxFaucetAddress}`);
    console.log(`PDX Prediction Market:       ${pdxBazarAddress}`);
    console.log(`PDX Helper Contract:         ${pdxHelperContractAddress}`);
    console.log(`Custodial Marketplace:       ${custodialMarketplaceAddress}`);
    console.log('\n' + '='.repeat(60));
    console.log('\n✨ Next Steps:\n');
    console.log('1. Frontend .env.local has been updated automatically');
    console.log('2. ABIs have been exported to Frontend/contracts/');
    console.log('3. Restart your frontend dev server: npm run dev');
    console.log('4. Test PDX faucet to get tokens');
    console.log('5. Create markets and test trading\n');
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error('❌ Deployment failed:', error);
        process.exit(1);
    });
