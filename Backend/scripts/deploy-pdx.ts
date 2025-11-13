import { ethers } from "hardhat";
import * as fs from "fs";

async function main(): Promise<string> {
  console.log("\n========================================");
  console.log("🚀 PDX Token Deployment");
  console.log("========================================\n");

  const [deployer] = await ethers.getSigners();
  
  console.log(`📍 Deploying with account: ${deployer.address}`);
  
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log(`💰 Account balance: ${ethers.formatEther(balance)} BNB`);
  
  if (balance.toString() === "0") {
    console.error("❌ Insufficient BNB balance. Get testnet BNB from faucet.");
    console.log("📌 https://testnet.binance.org/faucet");
    process.exit(1);
  }

  console.log("\n⏳ Deploying GPXToken contract...\n");

  const GPXToken = await ethers.getContractFactory("GPXToken");
  const gpxToken = await GPXToken.deploy();
  
  await gpxToken.waitForDeployment();
  const gpxAddress = await gpxToken.getAddress();
  
  console.log("✅ GPX Token deployed successfully!\n");
  console.log(`📍 Contract Address: ${gpxAddress}`);
  
  const name = await gpxToken.name();
  const symbol = await gpxToken.symbol();
  const decimals = await gpxToken.decimals();
  const totalSupply = await gpxToken.totalSupply();
  const deployerBalance = await gpxToken.balanceOf(deployer.address);
  
  console.log("\n========== Token Details ==========");
  console.log(`📛 Name: ${name}`);
  console.log(`🏷️  Symbol: ${symbol}`);
  console.log(`📊 Decimals: ${decimals}`);
  console.log(`📈 Total Supply: ${ethers.formatEther(totalSupply)} ${symbol}`);
  console.log(`💳 Deployer Balance: ${ethers.formatEther(deployerBalance)} ${symbol}`);
  console.log("\n=====================================\n");

  const deployment = {
    network: "BSC Testnet",
    chainId: 97,
    contractAddress: gpxAddress,
    contractName: "GPXToken",
    deployerAddress: deployer.address,
    tokenName: name,
    tokenSymbol: symbol,
    totalSupply: ethers.formatEther(totalSupply),
    deploymentDate: new Date().toISOString(),
  };
  
  fs.writeFileSync(
    "deployment-gpx.json",
    JSON.stringify(deployment, null, 2)
  );
  
  console.log("📄 Deployment info saved to: deployment-gpx.json\n");
  
  console.log("========== NEXT STEPS ==========");
  console.log(`\n1️⃣  Copy contract address: ${gpxAddress}`);
  console.log("2️⃣  Use in GPXPredictionMarket constructor");
  console.log("3️⃣  Verify on BSCScan:");
  console.log(`    npx hardhat verify --network bscTestnet ${gpxAddress}\n`);
  console.log("📌 View on BSCScan:");
  console.log(`    https://testnet.bscscan.com/token/${gpxAddress}\n`);

  return gpxAddress;
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Error:", error);
    process.exitCode = 1;
  });
