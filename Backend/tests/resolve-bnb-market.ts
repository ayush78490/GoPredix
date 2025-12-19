import { ethers } from "hardhat";

/**
 * Script to check BNB market status and request/trigger resolution
 * 
 * Usage: npx hardhat run tests/resolve-bnb-market.ts --network bscTestnet
 */
async function main() {
    console.log("\n========================================");
    console.log("BNB MARKET RESOLUTION HELPER");
    console.log("========================================\n");

    const [signer] = await ethers.getSigners();
    console.log("Using account:", signer.address);

    // BNB Market Contract Address
    const BNB_MARKET_ADDRESS = "0x94d11A119315A872C9227e8dD0D0e78d21377720";

    const STATUS_NAMES = ['Open', 'Closed', 'ResolutionRequested', 'Resolved', 'Disputed'];
    const OUTCOME_NAMES = ['Undecided', 'Yes', 'No'];

    // Get BNB market contract
    const bnbMarket = await ethers.getContractAt(
        "contracts/Bazar.sol:PredictionMarketWithMultipliers",
        BNB_MARKET_ADDRESS
    );

    // Find the specific market (the dispute test market)
    const nextId = await bnbMarket.nextMarketId();
    console.log(`Total BNB Markets: ${nextId}\n`);

    // Check all markets to find ended ones that need resolution
    const endedMarkets: number[] = [];
    const resolutionRequestedMarkets: number[] = [];

    for (let i = 0; i < Number(nextId); i++) {
        try {
            const market = await bnbMarket.markets(BigInt(i));
            const status = Number(market.status);
            const statusName = STATUS_NAMES[status] || 'Unknown';
            const endTime = Number(market.endTime);
            const now = Math.floor(Date.now() / 1000);
            const isEnded = now >= endTime;

            console.log(`Market ${i}:`);
            console.log(`  Question: "${market.question.substring(0, 60)}..."`);
            console.log(`  Status: ${statusName} (${status})`);
            console.log(`  End Time: ${new Date(endTime * 1000).toLocaleString()}`);
            console.log(`  Has Ended: ${isEnded}`);
            console.log(`  Outcome: ${OUTCOME_NAMES[Number(market.outcome)]}`);

            if (isEnded && status === 0) {
                endedMarkets.push(i);
                console.log(`  [NEEDS RESOLUTION REQUEST]`);
            } else if (status === 2) {
                resolutionRequestedMarkets.push(i);
                console.log(`  [WAITING FOR AI RESOLUTION]`);
            }
            console.log("");
        } catch (e: any) {
            console.log(`Market ${i}: Error - ${e.message}`);
        }
    }

    console.log("\n========================================");
    console.log("SUMMARY");
    console.log("========================================");
    console.log(`Markets needing resolution request: ${endedMarkets.length}`);
    if (endedMarkets.length > 0) {
        console.log(`  Market IDs: ${endedMarkets.join(", ")}`);
    }
    console.log(`Markets waiting for AI resolution: ${resolutionRequestedMarkets.length}`);
    if (resolutionRequestedMarkets.length > 0) {
        console.log(`  Market IDs: ${resolutionRequestedMarkets.join(", ")}`);
    }

    // If there are ended markets that need resolution request, ask user
    if (endedMarkets.length > 0) {
        console.log("\n========================================");
        console.log("REQUEST RESOLUTION FOR ENDED MARKETS");
        console.log("========================================\n");

        for (const marketId of endedMarkets) {
            try {
                console.log(`Requesting resolution for market ${marketId}...`);
                const tx = await bnbMarket.requestResolution(
                    BigInt(marketId),
                    "Market has ended, requesting AI resolution"
                );
                console.log(`Transaction sent: ${tx.hash}`);
                const receipt = await tx.wait();
                console.log(`Resolution requested for market ${marketId}!`);
                console.log(`Gas used: ${receipt?.gasUsed?.toString()}`);
                console.log("");
            } catch (e: any) {
                console.log(`Failed to request resolution for market ${marketId}: ${e.message}`);
            }
        }
    }

    console.log("\n========================================");
    console.log("NEXT STEPS");
    console.log("========================================");
    console.log("1. After requestResolution(), market status changes to 'ResolutionRequested'");
    console.log("2. The resolution service will pick it up and call AI");
    console.log("3. AI determines YES/NO outcome");
    console.log("4. Resolution server calls resolveMarket() on-chain");
    console.log("5. Status changes to 'Resolved', dispute can now be created");
    console.log("");
    console.log("If resolution service is not running, start it with:");
    console.log("  cd server && node start-resolution-service.js");
    console.log("========================================\n");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
