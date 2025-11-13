import { ethers } from "hardhat";
import * as fs from "fs";

async function main() {
  console.log("\n========================================");
  console.log("🚀 PDX Faucet Deployment");
  console.log("========================================\n");

  const [deployer] = await ethers.getSigners();
  console.log(`📍 Deployer: ${deployer.address}`);

  // Read PDX token deployment
  const pdxDeployment = JSON.parse(
    fs.readFileSync("deployment-gpx.json", "utf-8")
  );

  const PDX_TOKEN_ADDRESS = pdxDeployment.contractAddress;
  console.log(`\n📋 PDX Token: ${PDX_TOKEN_ADDRESS}`);

  console.log(`\n⏳ Deploying PDXFaucet...\n`);

  const PDXFaucet = await ethers.getContractFactory("PDXFaucet");
  const faucet = await PDXFaucet.deploy(PDX_TOKEN_ADDRESS);

  await faucet.waitForDeployment();
  const faucetAddress = await faucet.getAddress();

  console.log("✅ PDX Faucet deployed successfully!\n");
  console.log(`📍 Faucet Address: ${faucetAddress}`);

  // Get initial settings
  const claimAmount = await faucet.claimAmount();
  const cooldownTime = await faucet.cooldownTime();

  console.log("\n========== Faucet Settings ==========");
  console.log(`💰 Claim Amount: ${ethers.formatEther(claimAmount)} PDX`);
  console.log(`⏱️  Cooldown: ${Number(cooldownTime) / 3600} hours`);
  console.log("=====================================\n");

  const deployment = {
    network: "BSC Testnet",
    chainId: 97,
    faucetAddress,
    pdxTokenAddress: PDX_TOKEN_ADDRESS,
    claimAmount: ethers.formatEther(claimAmount),
    cooldownHours: Number(cooldownTime) / 3600,
    deploymentDate: new Date().toISOString(),
  };

  fs.writeFileSync(
    "deployment-pdx-faucet.json",
    JSON.stringify(deployment, null, 2)
  );

  console.log("📄 Deployment info saved to: deployment-pdx-faucet.json");

  console.log("\n========== NEXT STEPS ==========");
  console.log(`\n1️⃣  Transfer PDX to faucet (e.g., 10,000 PDX):`);
  console.log(`    pdxToken.transfer("${faucetAddress}", amount)`);
  console.log(`\n2️⃣  Users can claim 100 PDX every 24 hours`);
  console.log(`\n3️⃣  Verify on BSCScan:`);
  console.log(`    npx hardhat verify --network bscTestnet ${faucetAddress} ${PDX_TOKEN_ADDRESS}\n`);
  console.log("=====================================\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Error:", error);
    process.exitCode = 1;
  });
