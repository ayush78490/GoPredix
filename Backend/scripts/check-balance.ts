import { ethers } from 'hardhat';

async function main() {
    console.log('🔍 Checking wallet balance on BSC Mainnet...\\n');

    const [deployer] = await ethers.getSigners();
    const balance = await ethers.provider.getBalance(deployer.address);
    const network = await ethers.provider.getNetwork();

    console.log('📍 Network:', network.name, '(Chain ID:', network.chainId.toString(), ')');
    console.log('👤 Deployer Address:', deployer.address);
    console.log('💰 Balance:', ethers.formatEther(balance), 'BNB');
    console.log('');

    const balanceBNB = parseFloat(ethers.formatEther(balance));
    const requiredBNB = 0.05;

    if (balanceBNB >= requiredBNB) {
        console.log('✅ Sufficient balance for deployment!');
        console.log(`   Required: ${requiredBNB} BNB`);
        console.log(`   Available: ${balanceBNB.toFixed(4)} BNB`);
    } else {
        console.log('❌ Insufficient balance for deployment!');
        console.log(`   Required: ${requiredBNB} BNB`);
        console.log(`   Available: ${balanceBNB.toFixed(4)} BNB`);
        console.log(`   Needed: ${(requiredBNB - balanceBNB).toFixed(4)} BNB`);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
