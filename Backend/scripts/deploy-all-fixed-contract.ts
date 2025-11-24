import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  console.log("🚀 Starting deployment of all fixed contracts...\n");

  // ==================== CONFIGURATION ====================
  
  const PDX_TOKEN_ADDRESS = "0xeE943aCCAa07ED556DfAc9d3a76015050fA78BC8"; // ← UPDATE THIS
  const FEE_BPS = 200;           // 2% platform fee
  const LP_FEE_BPS = 5000;       // 50% of fees to LP
  const CREATOR_FEE_BPS = 5000;  // 50% of fees to creator

  // Get signers from hardhat (automatically injected)
  const [deployer] = await ethers.getSigners();

  console.log("📋 Configuration:");
  console.log("Deployer Address:", deployer.address);
  console.log("PDX Token:", PDX_TOKEN_ADDRESS);
  console.log("Platform Fee:", FEE_BPS / 100, "%");
  console.log("LP Fee Share:", LP_FEE_BPS / 100, "%");
  console.log("Creator Fee Share:", CREATOR_FEE_BPS / 100, "%\n");

  // Check balance
  const balance = await deployer.provider.getBalance(deployer.address);
  console.log("Account Balance:", ethers.formatEther(balance), "BNB\n");

  if (parseFloat(ethers.formatEther(balance)) < 0.1) {
    console.error("❌ Error: Insufficient balance for gas fees (need ~0.1 BNB)");
    process.exit(1);
  }

  // ==================== DEPLOY BNB MARKET ====================
  console.log("📦 [1/4] Deploying BNB Prediction Market (bazar.sol)...");
  const BNBMarketFactory = await ethers.getContractFactory("PredictionMarketWithMultipliers");
  const bnbMarket = await BNBMarketFactory.deploy(FEE_BPS, LP_FEE_BPS, deployer.address);
  await bnbMarket.waitForDeployment();
  const bnbMarketAddress = await bnbMarket.getAddress();
  console.log("✅ BNB Market deployed to:", bnbMarketAddress);
  console.log("   ⏳ Waiting for 2 confirmations...");
  await bnbMarket.deploymentTransaction()!.wait(2);
  console.log("   ✅ Confirmed\n");

  // ==================== DEPLOY BNB HELPER ====================
  console.log("📦 [2/4] Deploying BNB Helper (helpercontract.sol)...");
  const BNBHelperFactory = await ethers.getContractFactory("PredictionMarketHelper");
  const bnbHelper = await BNBHelperFactory.deploy(bnbMarketAddress);
  await bnbHelper.waitForDeployment();
  const bnbHelperAddress = await bnbHelper.getAddress();
  console.log("✅ BNB Helper deployed to:", bnbHelperAddress);
  console.log("   ⏳ Waiting for 2 confirmations...");
  await bnbHelper.deploymentTransaction()!.wait(2);
  console.log("   ✅ Confirmed\n");

  // ==================== DEPLOY PDX MARKET ====================
  console.log("📦 [3/4] Deploying PDX Prediction Market (pdxbazar.sol)...");
  const PDXMarketFactory = await ethers.getContractFactory("PDXPredictionMarket");
  const pdxMarket = await PDXMarketFactory.deploy(
    PDX_TOKEN_ADDRESS,
    FEE_BPS,
    deployer.address,
    CREATOR_FEE_BPS
  );
  await pdxMarket.waitForDeployment();
  const pdxMarketAddress = await pdxMarket.getAddress();
  console.log("✅ PDX Market deployed to:", pdxMarketAddress);
  console.log("   ⏳ Waiting for 2 confirmations...");
  await pdxMarket.deploymentTransaction()!.wait(2);
  console.log("   ✅ Confirmed\n");

  // ==================== DEPLOY PDX HELPER ====================
  console.log("📦 [4/4] Deploying PDX Helper (pdxhelpercontract.sol)...");
  const PDXHelperFactory = await ethers.getContractFactory("PDXPredictionMarketHelper");
  const pdxHelper = await PDXHelperFactory.deploy(pdxMarketAddress, PDX_TOKEN_ADDRESS);
  await pdxHelper.waitForDeployment();
  const pdxHelperAddress = await pdxHelper.getAddress();
  console.log("✅ PDX Helper deployed to:", pdxHelperAddress);
  console.log("   ⏳ Waiting for 2 confirmations...");
  await pdxHelper.deploymentTransaction()!.wait(2);
  console.log("   ✅ Confirmed\n");

  // ==================== VERIFY CONNECTIONS ====================
  console.log("🔍 Verifying contract connections...\n");

  // Verify BNB Helper connection
  console.log("BNB Helper Connection:");
  const bnbHelperMarketAddress = await bnbHelper.predictionMarket();
  console.log("  Helper points to:", bnbHelperMarketAddress);
  console.log("  Expected:", bnbMarketAddress);
  console.log("  Match:", bnbHelperMarketAddress === bnbMarketAddress ? "✅" : "❌\n");

  // Verify PDX Helper connection
  console.log("PDX Helper Connection:");
  const pdxHelperMarketAddress = await pdxHelper.predictionMarket();
  const pdxHelperPDXAddress = await pdxHelper.pdxToken();
  console.log("  Helper points to Market:", pdxHelperMarketAddress);
  console.log("  Expected:", pdxMarketAddress);
  console.log("  Match:", pdxHelperMarketAddress === pdxMarketAddress ? "✅" : "❌");
  console.log("\n  Helper points to PDX Token:", pdxHelperPDXAddress);
  console.log("  Expected:", PDX_TOKEN_ADDRESS);
  console.log("  Match:", pdxHelperPDXAddress === PDX_TOKEN_ADDRESS ? "✅" : "❌\n");

  // ==================== SUMMARY ====================
  console.log("=".repeat(70));
  console.log("🎉 DEPLOYMENT COMPLETE!");
  console.log("=".repeat(70));
  console.log("\n📝 Contract Addresses:\n");
  console.log("BNB Market (bazar):              ", bnbMarketAddress);
  console.log("BNB Helper (helpercontract):     ", bnbHelperAddress);
  console.log("PDX Market (pdxbazar):           ", pdxMarketAddress);
  console.log("PDX Helper (pdxhelpercontract):  ", pdxHelperAddress);
  console.log("PDX Token:                       ", PDX_TOKEN_ADDRESS);
  console.log("\n🔗 Contract Links:\n");
  console.log("✅ BNB Helper ───→ BNB Market");
  console.log("✅ PDX Helper ───→ PDX Market");
  console.log("✅ PDX Helper ───→ PDX Token");

  // Save to file
  const deploymentData = {
    timestamp: new Date().toISOString(),
    network: "BSC Testnet",
    deployer: deployer.address,
    contracts: {
      bnbMarket: {
        address: bnbMarketAddress,
        file: "bazar.sol",
        name: "PredictionMarketWithMultipliers"
      },
      bnbHelper: {
        address: bnbHelperAddress,
        file: "helpercontract.sol",
        name: "PredictionMarketHelper"
      },
      pdxMarket: {
        address: pdxMarketAddress,
        file: "pdxbazar.sol",
        name: "PDXPredictionMarket"
      },
      pdxHelper: {
        address: pdxHelperAddress,
        file: "pdxhelpercontract.sol",
        name: "PDXPredictionMarketHelper"
      },
      pdxToken: {
        address: PDX_TOKEN_ADDRESS,
        name: "PDX Token (existing)"
      }
    },
    configuration: {
      feeBps: FEE_BPS,
      lpFeeBps: LP_FEE_BPS,
      creatorFeeBps: CREATOR_FEE_BPS
    }
  };

  const deploymentFile = path.join(__dirname, `../deployments/deployment-${Date.now()}.json`);
  if (!fs.existsSync(path.dirname(deploymentFile))) {
    fs.mkdirSync(path.dirname(deploymentFile), { recursive: true });
  }
  fs.writeFileSync(deploymentFile, JSON.stringify(deploymentData, null, 2));
  console.log("\n📋 Deployment saved to:", deploymentFile);

  console.log("\n📋 Frontend Config (TypeScript):\n");
  console.log(`export const CONTRACTS = {
  BNB_MARKET: "${bnbMarketAddress}",
  BNB_HELPER: "${bnbHelperAddress}",
  PDX_MARKET: "${pdxMarketAddress}",
  PDX_HELPER: "${pdxHelperAddress}",
  PDX_TOKEN: "${PDX_TOKEN_ADDRESS}"
}`);

  console.log("\n✅ All contracts deployed and linked successfully!");
  console.log("=".repeat(70) + "\n");

}

main().catch((error) => {
  console.error("❌ Deployment Error:", error);
  process.exit(1);
});
