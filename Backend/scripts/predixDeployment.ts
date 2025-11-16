// scripts/minimal-deploy.ts
import { ethers } from "hardhat";

async function main() {
  console.log("🚀 Starting minimal deployment...");

  const [deployer] = await ethers.getSigners();
  console.log("📝 Deploying with account:", deployer.address);

  const PDX_TOKEN_ADDRESS = process.env.PDX_TOKEN_ADDRESS || "0xeE943aCCAa07ED556DfAc9d3a76015050fA78BC8";
  const FEE_BPS = 200;
  const LP_FEE_BPS = 5000;
  const RESOLUTION_SERVER = deployer.address;

  // Try deploying PredictionMarket first (smaller contract)
  console.log("\n📊 Deploying PredictionMarket...");
  try {
    const PredictionMarket = await ethers.getContractFactory("PredictionMarket");
    const predictionMarket = await PredictionMarket.deploy();
    await predictionMarket.waitForDeployment();
    const predictionMarketAddress = await predictionMarket.getAddress();
    console.log("✅ PredictionMarket deployed to:", predictionMarketAddress);
  } catch (error) {
    console.log("❌ PredictionMarket deployment failed:", error);
  }

  // Try deploying MarketFactory separately
  console.log("\n📦 Deploying MarketFactory...");
  try {
    const MarketFactory = await ethers.getContractFactory("MarketFactory");
    const marketFactory = await MarketFactory.deploy(
      PDX_TOKEN_ADDRESS,
      FEE_BPS,
      LP_FEE_BPS,
      RESOLUTION_SERVER
    );
    await marketFactory.waitForDeployment();
    const factoryAddress = await marketFactory.getAddress();
    console.log("✅ MarketFactory deployed to:", factoryAddress);
  } catch (error) {
    console.log("❌ MarketFactory deployment failed:", error);
  }
}

main().catch(console.error);