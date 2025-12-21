import { ethers } from 'hardhat';
import fs from 'fs';
import path from 'path';

async function main() {
    console.log('\n📝 Creating Test Market on NEW BNB Prediction Market\n');
    console.log('='.repeat(60));

    const [creator] = await ethers.getSigners();

    // Load deployment
    const latestDeploymentPath = path.join(process.cwd(), 'deployments', 'latest.json');
    const deployment = JSON.parse(fs.readFileSync(latestDeploymentPath, 'utf8'));

    const marketAddress = deployment.contracts.predictionMarket;

    console.log('\n📋 Info:\n');
    console.log(`Creator:         ${creator.address}`);
    console.log(`Market Contract: ${marketAddress}\n`);

    const predictionMarket = await ethers.getContractAt('PredictionMarketWithMultipliers', marketAddress);

    const initialYes = ethers.parseEther('0.01');
    const initialNo = ethers.parseEther('0.01');
    const endTime = Math.floor(Date.now() / 1000) + 86400; // 24 hours

    console.log('🎯 Creating market...');
    console.log(`Question:      "Will this work?"`)
    console.log(`End Time:      ${new Date(endTime * 1000).toLocaleString()}`);
    console.log(`Initial Yes:   ${ethers.formatEther(initialYes)} BNB`);
    console.log(`Initial No:    ${ethers.formatEther(initialNo)} BNB\n`);

    const tx = await predictionMarket.createMarket(
        "Will this work?",
        endTime,
        initialYes,
        initialNo,
        { value: initialYes + initialNo }
    );

    console.log(`Transaction hash: ${tx.hash}`);
    console.log('⏳ Waiting for confirmation...');

    const receipt = await tx.wait();

    // Get market ID
    const marketCreatedEvent = receipt?.logs.find((log: any) => {
        try {
            const parsed = predictionMarket.interface.parseLog(log);
            return parsed?.name === 'MarketCreated';
        } catch {
            return false;
        }
    });

    let marketId = 0;
    if (marketCreatedEvent) {
        const parsed = predictionMarket.interface.parseLog(marketCreatedEvent);
        marketId = Number(parsed?.args[0]);
    }

    console.log(`\n✅ Market created! ID: ${marketId}\n`);

    // Verify
    const market = await predictionMarket.markets(marketId);
    console.log('📊 Market Details:');
    console.log(`Owner:      ${market.creator}`);
    console.log(`Question:   ${market.question}`);
    console.log(`Status:     ${market.status}`);
    console.log(`Yes Pool:   ${ethers.formatEther(market.yesPool)} BNB`);
    console.log(`No Pool:    ${ethers.formatEther(market.noPool)} BNB`);

    console.log('\n' + '='.repeat(60));
    console.log('✅ Done! You can now list this market on the marketplace!');
    console.log('='.repeat(60));
    console.log(`\nMarket ID ${marketId} is ready to be listed!\n`);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error('\n❌ Failed:', error);
        process.exit(1);
    });
