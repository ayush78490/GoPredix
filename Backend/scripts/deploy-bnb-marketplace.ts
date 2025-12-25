import { ethers } from 'hardhat';

async function main() {
    console.log('🚀 Deploying BNB Custodial Marketplace...\n');

    const [deployer] = await ethers.getSigners();
    console.log(`📝 Deploying with account: ${deployer.address}`);
    console.log(`💰 Account balance: ${ethers.formatEther(await ethers.provider.getBalance(deployer.address))} BNB\n`);

    // Use the already deployed BNB Prediction Market address
    const BNB_PREDICTION_MARKET = '0x9067477bcBAD226572212b56c034F42D402026DF';
    const MARKETPLACE_FEE_BPS = 200; // 2% marketplace fee

    console.log('📦 Deploying BNB Custodial Marketplace...');
    const BNBCustodialMarketplace = await ethers.getContractFactory('BNBCustodialMarketplace');
    const bnbMarketplace = await BNBCustodialMarketplace.deploy(
        BNB_PREDICTION_MARKET,
        MARKETPLACE_FEE_BPS
    );
    await bnbMarketplace.waitForDeployment();
    const bnbMarketplaceAddress = await bnbMarketplace.getAddress();
    console.log(`✅ BNB Custodial Marketplace deployed to: ${bnbMarketplaceAddress}\n`);

    console.log('============================================================');
    console.log('🎉 DEPLOYMENT COMPLETE!');
    console.log('============================================================');
    console.log(`\nBNB Custodial Marketplace: ${bnbMarketplaceAddress}`);
    console.log(`BNB Prediction Market:     ${BNB_PREDICTION_MARKET}`);
    console.log(`Marketplace Fee:           ${MARKETPLACE_FEE_BPS / 100}%\n`);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error('❌ Deployment failed:', error);
        process.exit(1);
    });
