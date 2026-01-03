import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
    console.log("🚀 Redeploying PDX Prediction Market with Trade Tracking...\n");

    const [deployer] = await ethers.getSigners();
    console.log("Deploying with account:", deployer.address);
    console.log("Account balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "BNB\n");

    // Get PDX token address from environment
    const PDX_TOKEN_ADDRESS = process.env.PDX_TOKEN_ADDRESS;
    if (!PDX_TOKEN_ADDRESS) {
        throw new Error("PDX_TOKEN_ADDRESS not found in .env file");
    }

    // Deploy parameters (same as before)
    const FEE_BPS = 300; // 3% total fee
    const CREATOR_FEE_BPS = 6667; // ~66.67% of fees to creator (2% of 3%)
    const RESOLUTION_SERVER = deployer.address; // Using deployer as resolution server

    console.log("Deployment parameters:");
    console.log("- PDX Token:", PDX_TOKEN_ADDRESS);
    console.log("- Fee BPS:", FEE_BPS, "(3%)");
    console.log("- Creator Fee BPS:", CREATOR_FEE_BPS, "(66.67% of fees)");
    console.log("- Resolution Server:", RESOLUTION_SERVER);
    console.log();

    // Deploy PDXPredictionMarket
    console.log("📝 Deploying PDXPredictionMarket...");
    const PDXMarket = await ethers.getContractFactory("PDXPredictionMarket");
    const pdxMarket = await PDXMarket.deploy(PDX_TOKEN_ADDRESS, FEE_BPS, RESOLUTION_SERVER, CREATOR_FEE_BPS);
    await pdxMarket.waitForDeployment();
    const marketAddress = await pdxMarket.getAddress();
    console.log("✅ PDXPredictionMarket deployed to:", marketAddress);
    console.log();

    // Save deployment info
    const deploymentInfo = {
        network: "bsc-testnet",
        deployer: deployer.address,
        timestamp: new Date().toISOString(),
        contracts: {
            PDXPredictionMarket: marketAddress
        },
        parameters: {
            pdxToken: PDX_TOKEN_ADDRESS,
            feeBps: FEE_BPS,
            creatorFeeBps: CREATOR_FEE_BPS,
            resolutionServer: RESOLUTION_SERVER
        }
    };

    const deploymentsDir = path.join(__dirname, "../deployments");
    if (!fs.existsSync(deploymentsDir)) {
        fs.mkdirSync(deploymentsDir, { recursive: true });
    }

    const deploymentFile = path.join(deploymentsDir, `pdx-redeploy-${Date.now()}.json`);
    fs.writeFileSync(deploymentFile, JSON.stringify(deploymentInfo, null, 2));
    console.log("📄 Deployment info saved to:", deploymentFile);
    console.log();

    // Export ABI to frontend
    console.log("📦 Exporting ABI to frontend...");
    const artifactPath = path.join(__dirname, "../artifacts/contracts/PDXbazar.sol/PDXPredictionMarket.json");
    const frontendAbiPath = path.join(__dirname, "../../Frontend/contracts/PDXbazar.json");

    const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf-8"));
    fs.writeFileSync(frontendAbiPath, JSON.stringify(artifact.abi, null, 2));
    console.log("✅ ABI exported to:", frontendAbiPath);
    console.log();

    console.log("🎉 Deployment complete!");
    console.log();
    console.log("⚠️  IMPORTANT: Update your .env file with:");
    console.log(`NEXT_PUBLIC_PDX_MARKET_ADDRESS=${marketAddress}`);
    console.log();
    console.log("🔗 Verify on BSCScan:");
    console.log(`https://testnet.bscscan.com/address/${marketAddress}`);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
