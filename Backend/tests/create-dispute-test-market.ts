import { ethers } from "hardhat";

async function main() {
    console.log("\n========================================");
    console.log("CREATE BNB MARKET FOR DISPUTE TESTING");
    console.log("========================================\n");

    const [deployer] = await ethers.getSigners();
    console.log("Account:", deployer.address);

    // Contract addresses from latest.json
    const BNB_MARKET_ADDRESS = "0x90FD905aB1F479399117F6EB6b3e3E58f94e26f1";
    const BNB_HELPER_ADDRESS = "0x8E80772760816571a710B6388fCc25aBc0F21841";

    const bnbMarket = await ethers.getContractAt("contracts/Bazar.sol:PredictionMarketWithMultipliers", BNB_MARKET_ADDRESS);
    const bnbHelper = await ethers.getContractAt("contracts/helperContract.sol:PredictionMarketHelper", BNB_HELPER_ADDRESS);

    // Check balance
    const balance = await ethers.provider.getBalance(deployer.address);
    console.log("Balance:", ethers.formatEther(balance), "BNB\n");

    if (Number(ethers.formatEther(balance)) < 0.02) {
        console.log("❌ Insufficient BNB balance. Need at least 0.02 BNB");
        return;
    }

    // ======== STEP 1: CREATE MARKET ========
    console.log("=== STEP 1: CREATE MARKET ===\n");

    const question = "Will this dispute test market work correctly?";
    const endTime = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
    const initialYes = ethers.parseEther("0.005"); // 0.005 BNB for YES pool
    const initialNo = ethers.parseEther("0.005");  // 0.005 BNB for NO pool
    const totalLiquidity = initialYes + initialNo; // 0.01 BNB total

    console.log("Question:", question);
    console.log("End Time:", new Date(endTime * 1000).toLocaleString());
    console.log("Initial YES Pool:", ethers.formatEther(initialYes), "BNB");
    console.log("Initial NO Pool:", ethers.formatEther(initialNo), "BNB");
    console.log("Total Initial Liquidity:", ethers.formatEther(totalLiquidity), "BNB\n");

    console.log("Creating market...");
    const createTx = await bnbMarket.createMarket(
        question,
        BigInt(endTime),
        initialYes,
        initialNo,
        { value: totalLiquidity }
    );
    const createReceipt = await createTx.wait();
    console.log("✅ Market created! Tx:", createReceipt.hash);

    // Get market ID from event
    const nextMarketId = await bnbMarket.nextMarketId();
    const marketId = Number(nextMarketId) - 1;
    console.log("✅ Market ID:", marketId, "\n");

    // ======== STEP 2: VERIFY MARKET ========
    console.log("=== STEP 2: VERIFY MARKET ===\n");

    const market = await bnbMarket.markets(BigInt(marketId));
    console.log("Creator:", market.creator);
    console.log("Question:", market.question);
    console.log("Initial YES Pool:", ethers.formatEther(market.yesPool), "BNB");
    console.log("Initial NO Pool:", ethers.formatEther(market.noPool), "BNB");
    console.log("Status:", market.status, "(0=Active)");
    console.log("End Time:", new Date(Number(market.endTime) * 1000).toLocaleString(), "\n");

    // ======== STEP 3: BUY YES TOKENS ========
    console.log("=== STEP 3: BUY YES TOKENS ===\n");

    const buyAmount = ethers.parseEther("0.002"); // 0.002 BNB
    console.log("Buying YES tokens for:", ethers.formatEther(buyAmount), "BNB");

    // Calculate expected tokens
    const expectedTokens = await bnbHelper.calculatePurchaseReturn(
        BigInt(marketId),
        true, // YES
        buyAmount
    );
    console.log("Expected YES tokens:", ethers.formatEther(expectedTokens[0]));

    const buyTx = await bnbMarket.buyOutcome(
        BigInt(marketId),
        true, // YES
        BigInt(0), // min tokens (0 for testing)
        { value: buyAmount }
    );
    const buyReceipt = await buyTx.wait();
    console.log("✅ YES tokens purchased! Tx:", buyReceipt.hash, "\n");

    // ======== STEP 4: FINAL MARKET STATE ========
    console.log("=== STEP 4: FINAL MARKET STATE ===\n");

    const finalMarket = await bnbMarket.markets(BigInt(marketId));
    console.log("Final YES Pool:", ethers.formatEther(finalMarket.yesPool), "BNB");
    console.log("Final NO Pool:", ethers.formatEther(finalMarket.noPool), "BNB");

    const yesPrice = Number(finalMarket.yesPool) / (Number(finalMarket.yesPool) + Number(finalMarket.noPool)) * 100;
    const noPrice = 100 - yesPrice;
    console.log("YES Price:", yesPrice.toFixed(2), "%");
    console.log("NO Price:", noPrice.toFixed(2), "%\n");

    // ======== INSTRUCTIONS ========
    console.log("========================================");
    console.log("✅ MARKET SETUP COMPLETE!");
    console.log("========================================\n");
    console.log("📋 NEXT STEPS FOR DISPUTE TESTING:\n");
    console.log("1. Wait 1 hour for the market to end");
    console.log(`   Ends at: ${new Date(Number(finalMarket.endTime) * 1000).toLocaleString()}\n`);
    console.log("2. Request resolution (anyone can do this):");
    console.log(`   await market.requestResolution(${marketId}, "Market ended")\n`);
    console.log("3. Resolution server resolves the market");
    console.log(`   (Should resolve to YES or NO)\n`);
    console.log("4. Create a dispute if you disagree:");
    console.log(`   - Go to Frontend -> Disputes page`);
    console.log(`   - Find market ID: ${marketId}`);
    console.log(`   - Click "Create Dispute"`);
    console.log(`   - Stake minimum 0.01 BNB\n`);
    console.log("========================================");
    console.log(`Market ID: ${marketId}`);
    console.log(`Market Address: ${BNB_MARKET_ADDRESS}`);
    console.log(`Dispute Address: 0x8F05F7e4F78477F0DdC0d29A1B3B90D510227243`);
    console.log("========================================\n");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
