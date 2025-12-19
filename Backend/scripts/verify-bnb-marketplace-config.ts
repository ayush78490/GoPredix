import { ethers } from 'hardhat';

async function main() {
    console.log('\n🔍 Checking BNB Native Marketplace Configuration\n');
    console.log('='.repeat(60));

    // BNB Native Marketplace address from latest deployment
    const marketplaceAddress = '0x5248726b31C080178e2e9689a8Ad65ac33A91b12';

    // Connect to the marketplace contract
    const marketplace = await ethers.getContractAt('BNBNativeMarketplace', marketplaceAddress);

    // Get the prediction market address it's configured with
    const predictionMarketAddress = await marketplace.predictionMarket();

    console.log('\n📋 Contract Configuration:\n');
    console.log(`BNB Native Marketplace:  ${marketplaceAddress}`);
    console.log(`Prediction Market:       ${predictionMarketAddress}`);

    // Compare with deployed addresses
    console.log('\n📊 Expected Addresses:\n');
    console.log(`BNB Prediction Market:   0x90FD905aB1F479399117F6EB6b3e3E58f94e26f1`);
    console.log(`PDX Prediction Market:   0x151fE04C421E197B982A4F62a65Acd6F416af51a`);

    console.log('\n✅ Result:\n');
    if (predictionMarketAddress === '0x90FD905aB1F479399117F6EB6b3e3E58f94e26f1') {
        console.log('✅ CORRECT! Marketplace is pointing to BNB Prediction Market');
    } else if (predictionMarketAddress === '0x151fE04C421E197B982A4F62a65Acd6F416af51a') {
        console.log('❌ WRONG! Marketplace is pointing to PDX Prediction Market');
    } else {
        console.log(`⚠️  UNKNOWN! Marketplace is pointing to: ${predictionMarketAddress}`);
    }

    // Get marketplace fee
    const feeBps = await marketplace.marketplaceFeeBps();
    console.log(`\nMarketplace Fee:         ${Number(feeBps) / 100}%`);

    // Get owner
    const owner = await marketplace.owner();
    console.log(`Marketplace Owner:       ${owner}`);

    console.log('\n' + '='.repeat(60));
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error('\n❌ Error:', error);
        process.exit(1);
    });
