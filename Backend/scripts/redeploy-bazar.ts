import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
    console.log("🚀 Redeploying BNB Prediction Market with Trade Tracking...\n");

    const [deployer] = await ethers.getSigners();
    console.log("Deploying with account:", deployer.address);
    console.log("Account balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "BNB\n");

    // Deploy parameters (same as before)
    const FEE_BPS = 300; // 3% total fee
    const LP_FEE_BPS = 5000; // 50% of fees to LP
    const RESOLUTION_SERVER = deployer.address; // Using deployer as resolution server

    console.log("Deployment parameters:");
    console.log("- Fee BPS:", FEE_BPS, "(3%)");
    console.log("- LP Fee BPS:", LP_FEE_BPS, "(50% of fees)");
    console.log("- Resolution Server:", RESOLUTION_SERVER);
    console.log();

    // Deploy PredictionMarketWithMultipliers
    console.log("📝 Deploying PredictionMarketWithMultipliers...");
    const PredictionMarket = await ethers.getContractFactory("PredictionMarketWithMultipliers");
    const predictionMarket = await PredictionMarket.deploy(FEE_BPS, LP_FEE_BPS, RESOLUTION_SERVER);
    await predictionMarket.waitForDeployment();
    const marketAddress = await predictionMarket.getAddress();
    console.log("✅ PredictionMarketWithMultipliers deployed to:", marketAddress);
    console.log();

    // Save deployment info
    const deploymentInfo = {
        network: "bsc-testnet",
        deployer: deployer.address,
        timestamp: new Date().toISOString(),
        contracts: {
            PredictionMarketWithMultipliers: marketAddress
        },
        parameters: {
            feeBps: FEE_BPS,
            lpFeeBps: LP_FEE_BPS,
            resolutionServer: RESOLUTION_SERVER
        }
    };

    const deploymentsDir = path.join(__dirname, "../deployments");
    if (!fs.existsSync(deploymentsDir)) {
        fs.mkdirSync(deploymentsDir, { recursive: true });
    }

    const deploymentFile = path.join(deploymentsDir, `bazar-redeploy-${Date.now()}.json`);
    fs.writeFileSync(deploymentFile, JSON.stringify(deploymentInfo, null, 2));
    console.log("📄 Deployment info saved to:", deploymentFile);
    console.log();

    // Export ABI to frontend
    console.log("📦 Exporting ABI to frontend...");
    const artifactPath = path.join(__dirname, "../artifacts/contracts/Bazar.sol/PredictionMarketWithMultipliers.json");
    const frontendAbiPath = path.join(__dirname, "../../Frontend/contracts/Bazar.json");

    const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf-8"));
    fs.writeFileSync(frontendAbiPath, JSON.stringify(artifact.abi, null, 2));
    console.log("✅ ABI exported to:", frontendAbiPath);
    console.log();

    console.log("🎉 Deployment complete!");
    console.log();
    console.log("⚠️  IMPORTANT: Update your .env file with:");
    console.log(`NEXT_PUBLIC_PREDICTION_MARKET_ADDRESS=${marketAddress}`);
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
