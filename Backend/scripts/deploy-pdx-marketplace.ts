import { ethers } from "hardhat";
import fs from "fs";
import path from "path";

async function main() {
    console.log("🚀 Deploying CustodialMarketplace for PDX Markets...");

    // Configuration
    const PDX_TOKEN_ADDRESS = "0xeE943aCCAa07ED556DfAc9d3a76015050fA78BC8"; // Same PDX Token
    const PDX_PREDICTION_MARKET_ADDRESS = "0x03C3eDae35228bF970d30Bf77E9Dce3A88A3dB4B"; // PDX Prediction Market (ACTUAL)
    const MARKETPLACE_FEE_BPS = 250; // 2.5%

    const CustodialMarketplace = await ethers.getContractFactory("CustodialMarketplace");
    const marketplace = await CustodialMarketplace.deploy(
        PDX_TOKEN_ADDRESS,
        PDX_PREDICTION_MARKET_ADDRESS,
        MARKETPLACE_FEE_BPS
    );

    await marketplace.waitForDeployment();
    const address = await marketplace.getAddress();

    console.log(`✅ PDX Custodial Marketplace deployed to: ${address}`);

    // Update latest.json
    const deploymentsDir = path.join(process.cwd(), 'deployments');
    const latestFile = path.join(deploymentsDir, 'latest.json');

    if (fs.existsSync(latestFile)) {
        const deploymentInfo = JSON.parse(fs.readFileSync(latestFile, 'utf8'));
        deploymentInfo.contracts.pdxCustodialMarketplace = address;
        fs.writeFileSync(latestFile, JSON.stringify(deploymentInfo, null, 2));
        console.log(`✅ Updated latest.json with pdxCustodialMarketplace`);
    }

    console.log("\nNext Steps:");
    console.log(`1. Add to .env.local: NEXT_PUBLIC_PDX_MARKETPLACE_ADDRESS=${address}`);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
