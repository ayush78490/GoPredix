import { ethers } from 'hardhat';

/**
 * Gas Price Monitor for BSC Deployment
 * Use this script to check current gas prices before deploying
 */

async function main() {
    console.log('🔍 BSC Gas Price Monitor\n');
    console.log('='.repeat(60));

    try {
        const provider = ethers.provider;
        const network = await provider.getNetwork();

        console.log(`\n📡 Network Information:`);
        console.log(`   Chain ID: ${network.chainId}`);
        console.log(`   Name: ${network.name}`);

        // Get current gas price
        const gasPrice = await provider.getFeeData();
        const gasPriceGwei = Number(ethers.formatUnits(gasPrice.gasPrice || 0n, 'gwei'));

        console.log(`\n⛽ Current Gas Price:`);
        console.log(`   ${gasPriceGwei.toFixed(4)} Gwei`);

        // BSC minimum gas price is 0.05 Gwei
        const minGasPrice = 0.05;
        const avgGasPrice = 0.81;
        const highGasPrice = 1.5;

        // Determine deployment recommendation
        let recommendation = '';
        let emoji = '';
        let color = '';

        if (gasPriceGwei <= 0.1) {
            recommendation = 'EXCELLENT - Deploy now! Best possible gas price';
            emoji = '🟢';
            color = 'green';
        } else if (gasPriceGwei <= 0.3) {
            recommendation = 'GOOD - Great time to deploy';
            emoji = '🟢';
            color = 'green';
        } else if (gasPriceGwei <= 0.5) {
            recommendation = 'FAIR - Acceptable for deployment';
            emoji = '🟡';
            color = 'yellow';
        } else if (gasPriceGwei <= 1.0) {
            recommendation = 'AVERAGE - Consider waiting for lower gas';
            emoji = '🟠';
            color = 'orange';
        } else {
            recommendation = 'HIGH - Wait for lower gas prices';
            emoji = '🔴';
            color = 'red';
        }

        console.log(`\n${emoji} Status: ${recommendation}\n`);

        // Calculate estimated deployment costs
        console.log('💰 Estimated Deployment Costs:\n');

        const contracts = [
            { name: 'BNB Prediction Market', gas: 3200000 },
            { name: 'BNB Helper Contract', gas: 2000000 },
            { name: 'Dispute Resolution', gas: 2000000 },
            { name: 'PDX Token', gas: 800000 },
            { name: 'PDX Market', gas: 3200000 },
            { name: 'PDX Helper', gas: 2400000 },
            { name: 'PDX Disputes', gas: 2000000 },
            { name: 'Custodial Marketplace', gas: 1200000 }
        ];

        let totalGas = 0;

        console.log('   Individual Contract Costs:');
        console.log('   ' + '-'.repeat(56));

        for (const contract of contracts) {
            const costBNB = (contract.gas * gasPriceGwei) / 1e9;
            totalGas += contract.gas;
            console.log(`   ${contract.name.padEnd(25)} ${costBNB.toFixed(6)} BNB`);
        }

        console.log('   ' + '-'.repeat(56));

        const totalCostBNB = (totalGas * gasPriceGwei) / 1e9;
        console.log(`   ${'TOTAL (All 8 contracts)'.padEnd(25)} ${totalCostBNB.toFixed(6)} BNB`);

        // Get BNB price (you can update this manually or integrate a price feed)
        const bnbPriceUSD = 872; // Update this as needed
        const totalCostUSD = totalCostBNB * bnbPriceUSD;

        console.log(`\n   At ~$${bnbPriceUSD}/BNB = $${totalCostUSD.toFixed(2)} USD`);

        // Show scenario costs
        console.log(`\n📊 Deployment Scenarios:\n`);

        const scenarios = [
            { name: 'Minimum (2 contracts)', contracts: ['BNB Prediction Market', 'BNB Helper Contract'], gas: 5200000 },
            { name: 'Production (3 contracts)', contracts: ['BNB Market', 'Helper', 'Disputes'], gas: 7200000 },
            { name: 'With Marketplace (5)', contracts: ['BNB Market', 'Helper', 'Disputes', 'Marketplace', 'PDX Token'], gas: 9200000 },
            { name: 'Full Platform (8)', contracts: ['All contracts'], gas: totalGas }
        ];

        for (const scenario of scenarios) {
            const costBNB = (scenario.gas * gasPriceGwei) / 1e9;
            const costUSD = costBNB * bnbPriceUSD;
            console.log(`   ${scenario.name.padEnd(30)} ${costBNB.toFixed(6)} BNB ($${costUSD.toFixed(2)})`);
        }

        // Show savings at minimum gas
        console.log(`\n💡 Potential Savings:\n`);

        const currentCost = totalCostBNB;
        const minCost = (totalGas * minGasPrice) / 1e9;
        const savings = currentCost - minCost;
        const savingsPercent = ((savings / currentCost) * 100);

        console.log(`   Current cost:         ${currentCost.toFixed(6)} BNB ($${(currentCost * bnbPriceUSD).toFixed(2)})`);
        console.log(`   At minimum gas:       ${minCost.toFixed(6)} BNB ($${(minCost * bnbPriceUSD).toFixed(2)})`);
        console.log(`   Potential savings:    ${savings.toFixed(6)} BNB ($${(savings * bnbPriceUSD).toFixed(2)})`);
        console.log(`   Savings percentage:   ${savingsPercent.toFixed(1)}%`);

        // Best times to deploy
        console.log(`\n⏰ Best Times to Deploy (UTC):\n`);
        console.log(`   🟢 Optimal: 2:00 AM - 6:00 AM UTC (lowest gas)`);
        console.log(`   🟢 Good: 10:00 PM - 2:00 AM UTC`);
        console.log(`   🟡 Fair: 6:00 AM - 9:00 AM UTC`);
        console.log(`   🟡 Fair: 6:00 PM - 10:00 PM UTC`);
        console.log(`   🔴 Avoid: 9:00 AM - 5:00 PM UTC (peak hours)`);

        console.log(`\n📅 Best Days:`);
        console.log(`   🟢 Saturday & Sunday (lowest traffic)`);
        console.log(`   🟡 Friday evening / Monday morning`);
        console.log(`   🔴 Tuesday-Thursday (highest traffic)`);

        // Current time
        const now = new Date();
        const hourUTC = now.getUTCHours();
        const dayUTC = now.getUTCDay(); // 0 = Sunday, 6 = Saturday

        console.log(`\n🕐 Current Time: ${now.toUTCString()}`);

        let timeRating = '';
        if ((hourUTC >= 2 && hourUTC <= 6) || (dayUTC === 0 || dayUTC === 6)) {
            timeRating = '🟢 Good time to deploy!';
        } else if (hourUTC >= 9 && hourUTC <= 17) {
            timeRating = '🔴 Peak hours - consider waiting';
        } else {
            timeRating = '🟡 Fair time to deploy';
        }

        console.log(`   ${timeRating}`);

        // Final recommendation
        console.log('\n' + '='.repeat(60));
        console.log('🎯 Final Recommendation:\n');

        if (gasPriceGwei <= 0.1 && (hourUTC >= 2 && hourUTC <= 6 || dayUTC === 0 || dayUTC === 6)) {
            console.log('   ✅ DEPLOY NOW! Perfect conditions:');
            console.log('   • Gas price is very low');
            console.log('   • Off-peak hours');
            console.log('   • Maximum cost savings');
        } else if (gasPriceGwei <= 0.3) {
            console.log('   ✅ GOOD TIME TO DEPLOY:');
            console.log('   • Gas price is reasonable');
            console.log('   • Good cost efficiency');
        } else if (gasPriceGwei <= 1.0) {
            console.log('   ⚠️  CONSIDER WAITING:');
            console.log('   • Gas price is average');
            console.log('   • Could save money by waiting');
            console.log(`   • Potential savings: $${(savings * bnbPriceUSD).toFixed(2)}`);
        } else {
            console.log('   ❌ WAIT FOR LOWER GAS:');
            console.log('   • Gas price is high');
            console.log('   • Significant savings possible');
            console.log(`   • Could save: $${(savings * bnbPriceUSD).toFixed(2)} (${savingsPercent.toFixed(0)}%)`);
        }

        console.log('\n' + '='.repeat(60));
        console.log('\n💡 Tip: Run this script again before deploying to check current gas prices\n');

    } catch (error) {
        console.error('❌ Error checking gas prices:', error);
        console.log('\n⚠️  Make sure you are connected to BSC network');
        console.log('   Check your hardhat.config.ts network configuration\n');
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
