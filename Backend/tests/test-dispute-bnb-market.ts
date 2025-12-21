import { ethers } from "hardhat";

async function main() {
    console.log("\n========================================");
    console.log("RESOLVE & TEST BNB DISPUTE");
    console.log("========================================\n");

    const [deployer] = await ethers.getSigners();
    console.log("Account:", deployer.address);

    const BNB_MARKET_ADDRESS = "0x94d11A119315A872C9227e8dD0D0e78d21377720";
    const BNB_DISPUTE_ADDRESS = "0x8F05F7e4F78477F0DdC0d29A1B3B90D510227243";
    const MARKET_ID = 0;

    const bnbMarket = await ethers.getContractAt("contracts/Bazar.sol:PredictionMarketWithMultipliers", BNB_MARKET_ADDRESS);
    const bnbDispute = await ethers.getContractAt("contracts/DisputeResolution.sol:DisputeResolution", BNB_DISPUTE_ADDRESS);

    // Check balance
    const balance = await ethers.provider.getBalance(deployer.address);
    console.log("Balance:", ethers.formatEther(balance), "BNB\n");

    // ======== STEP 1: Check & Resolve Market ========
    console.log("=== STEP 1: RESOLVE MARKET 0 ===\n");

    const marketBefore = await bnbMarket.markets(BigInt(MARKET_ID));
    console.log("Market Question:", marketBefore.question.substring(0, 50) + "...");
    console.log("Market Status:", marketBefore.status, "(0=Open, 2=ResolutionRequested, 3=Resolved)");
    console.log("End Time:", new Date(Number(marketBefore.endTime) * 1000).toLocaleString());

    const now = Math.floor(Date.now() / 1000);
    console.log("Current Time:", new Date(now * 1000).toLocaleString());
    console.log("Has Ended:", Number(marketBefore.endTime) < now);

    if (Number(marketBefore.status) === 0) {
        // Request resolution
        console.log("\nRequesting resolution...");
        try {
            const reqTx = await bnbMarket.requestResolution(BigInt(MARKET_ID), "Market ended, requesting resolution");
            await reqTx.wait();
            console.log("✅ Resolution requested!");
        } catch (e: any) {
            console.log("Error:", e.reason || e.message?.substring(0, 100));
        }
    }

    // Check if we can resolve (must be the resolution server)
    const resolutionServer = await bnbMarket.resolutionServer();
    console.log("\nResolution Server:", resolutionServer);
    console.log("Current Account:", deployer.address);
    console.log("Is Resolution Server:", resolutionServer.toLowerCase() === deployer.address.toLowerCase());

    if (Number(marketBefore.status) <= 2 && resolutionServer.toLowerCase() === deployer.address.toLowerCase()) {
        // Resolve market
        console.log("\nResolving market as YES...");
        try {
            const resolveTx = await bnbMarket.resolveMarket(BigInt(MARKET_ID), 1, "Resolved as YES for testing", 95);
            await resolveTx.wait();
            console.log("✅ Market resolved!");
        } catch (e: any) {
            console.log("Error:", e.reason || e.message?.substring(0, 100));
        }
    } else if (Number(marketBefore.status) <= 2) {
        console.log("\n⚠️ Cannot resolve market - not the resolution server");
        console.log("   Start the resolution service: cd server && node start-resolution-service.js");
    }

    // Verify resolution
    const marketAfter = await bnbMarket.markets(BigInt(MARKET_ID));
    console.log("\nMarket Status After:", marketAfter.status, "(3=Resolved)");
    console.log("Market Outcome:", marketAfter.outcome, "(1=YES, 2=NO)");

    if (Number(marketAfter.status) !== 3) {
        console.log("\n⚠️ Market not resolved yet. Creating dispute anyway (DisputeResolution contract allows this)...");
    }

    // ======== STEP 2: Create Dispute ========
    console.log("\n=== STEP 2: CREATE DISPUTE ===\n");

    const disputeStake = ethers.parseEther("0.015"); // 0.015 BNB (slightly more than minimum)
    const minStake = await bnbDispute.minimumDisputeStake();
    console.log("Minimum Dispute Stake:", ethers.formatEther(minStake), "BNB");
    console.log("Using Stake:", ethers.formatEther(disputeStake), "BNB");

    // Check for existing active dispute
    const existingDisputeId = await bnbDispute.marketDisputes(BNB_MARKET_ADDRESS, MARKET_ID);
    if (Number(existingDisputeId) > 0) {
        const existingDispute = await bnbDispute.disputes(existingDisputeId);
        if (Number(existingDispute.status) === 1) { // Active
            console.log("\n⚠️ Active dispute already exists! ID:", existingDisputeId.toString());
            console.log("Skipping to dispute resolution...");

            // Go to authority resolve
            await authorityResolveAndClaim(bnbDispute, Number(existingDisputeId), deployer);
            return;
        }
    }

    // Create dispute
    console.log("\nCreating dispute on Market", MARKET_ID, "...");
    try {
        const disputeTx = await bnbDispute.createDispute(
            BNB_MARKET_ADDRESS,
            BigInt(MARKET_ID),
            "I believe this market was resolved incorrectly. The evidence suggests the outcome should be different.",
            { value: disputeStake }
        );
        const disputeReceipt = await disputeTx.wait();

        // Get dispute ID from event
        let disputeId = 0n;
        for (const log of disputeReceipt?.logs || []) {
            try {
                const parsed = bnbDispute.interface.parseLog({ topics: log.topics as string[], data: log.data });
                if (parsed?.name === "DisputeCreated") {
                    disputeId = parsed.args[0];
                    break;
                }
            } catch { }
        }

        console.log("✅ Dispute created! ID:", disputeId.toString());

        // Get dispute info
        const disputeInfo = await bnbDispute.getDisputeInfo(disputeId);
        console.log("\nDispute Details:");
        console.log("  Market Contract:", disputeInfo[0]);
        console.log("  Market ID:", disputeInfo[1].toString());
        console.log("  Disputer:", disputeInfo[2]);
        console.log("  Reason:", disputeInfo[3].substring(0, 50) + "...");
        console.log("  Stake:", ethers.formatEther(disputeInfo[4]), "BNB");
        console.log("  Status:", disputeInfo[5], "(1=Active)");
        console.log("  Outcome:", disputeInfo[6], "(0=Pending)");
        console.log("  Accept Stake:", ethers.formatEther(disputeInfo[7]), "BNB");
        console.log("  Reject Stake:", ethers.formatEther(disputeInfo[8]), "BNB");
        console.log("  Voting End:", new Date(Number(disputeInfo[9]) * 1000).toLocaleString());

        // Authority resolve and claim
        await authorityResolveAndClaim(bnbDispute, Number(disputeId), deployer);

    } catch (e: any) {
        console.log("❌ Dispute error:", e.reason || e.message?.substring(0, 200));
    }
}

async function authorityResolveAndClaim(bnbDispute: any, disputeId: number, deployer: any) {
    // ======== STEP 3: Authority Resolve ========
    console.log("\n=== STEP 3: AUTHORITY RESOLVE DISPUTE ===\n");

    const authority = await bnbDispute.resolutionAuthority();
    console.log("Resolution Authority:", authority);
    console.log("Current Account:", deployer.address);
    console.log("Is Authority:", authority.toLowerCase() === deployer.address.toLowerCase());

    if (authority.toLowerCase() === deployer.address.toLowerCase()) {
        // Check dispute status
        const disputeInfo = await bnbDispute.disputes(BigInt(disputeId));
        const status = Number(disputeInfo.status);

        if (status === 1) { // Active
            console.log("\nResolving dispute as authority...");
            try {
                const authTx = await bnbDispute.authorityResolveDispute(BigInt(disputeId), true, "Dispute accepted by authority after review");
                await authTx.wait();
                console.log("✅ Dispute resolved!");
            } catch (e: any) {
                console.log("❌ Error:", e.reason || e.message?.substring(0, 100));
                return;
            }
        } else if (status === 3) { // Already resolved
            console.log("Dispute already resolved, proceeding to claim...");
        } else {
            console.log("Dispute status:", status, "- cannot resolve");
            return;
        }

        // ======== STEP 4: Claim Stakes ========
        console.log("\n=== STEP 4: CLAIM STAKES ===\n");

        const balBefore = await ethers.provider.getBalance(deployer.address);
        console.log("Balance before:", ethers.formatEther(balBefore), "BNB");

        console.log("Claiming stake...");
        try {
            const claimTx = await bnbDispute.claimStake(BigInt(disputeId));
            const claimReceipt = await claimTx.wait();
            console.log("✅ Stake claimed!");
            console.log("Gas used:", claimReceipt?.gasUsed?.toString());

            const balAfter = await ethers.provider.getBalance(deployer.address);
            console.log("Balance after:", ethers.formatEther(balAfter), "BNB");

            // Calculate difference (considering gas cost)
            const diff = parseFloat(ethers.formatEther(balAfter)) - parseFloat(ethers.formatEther(balBefore));
            console.log("Net change:", diff.toFixed(6), "BNB (includes gas cost)");
        } catch (e: any) {
            console.log("❌ Claim error:", e.reason || e.message?.substring(0, 100));
        }
    } else {
        console.log("\n⚠️ Cannot resolve - not the resolution authority");
        console.log("   The owner needs to call setResolutionAuthority(" + deployer.address + ")");
    }

    console.log("\n========================================");
    console.log("✅ COMPLETE BNB DISPUTE TEST FINISHED!");
    console.log("========================================\n");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
