
import { ethers } from "hardhat";

async function main() {
    console.log("Deploying CustodialMarketplace...");

    const PDX_TOKEN_ADDRESS = "0xeE943aCCAa07ED556DfAc9d3a76015050fA78BC8"; // User's existing PDX token
    const PREDICTION_MARKET_ADDRESS = "0x90FD905aB1F479399117F6EB6b3e3E58f94e26f1"; // Updated BNB market
    const MARKETPLACE_FEE_BPS = 250; // 2.5%

    const CustodialMarketplace = await ethers.getContractFactory("CustodialMarketplace");
    const marketplace = await CustodialMarketplace.deploy(
        PDX_TOKEN_ADDRESS,
        PREDICTION_MARKET_ADDRESS,
        MARKETPLACE_FEE_BPS
    );

    await marketplace.waitForDeployment();

    const address = await marketplace.getAddress();
    console.log(`CustodialMarketplace deployed to: ${address}`);

    console.log("Verifying contract...");
    // Verification usually requires waiting a bit, but we'll skip for now or user can do it manually.
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
