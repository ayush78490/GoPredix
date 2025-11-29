const hre = require("hardhat");

async function main() {
  console.log("🚀 Deploying PredictionMarketHelper...");

  // Your already deployed PredictionMarket address
  const PREDICTION_MARKET_ADDRESS = "0xd8E0D86F14b76b79Cc160534Eb9ECeDDf28632f1";

  // Get the contract factory
  const PredictionMarketHelper = await hre.ethers.getContractFactory("PredictionMarketHelper");

  // Deploy with the main contract address as constructor parameter
  const helper = await PredictionMarketHelper.deploy(PREDICTION_MARKET_ADDRESS);

  await helper.waitForDeployment();

  const helperAddress = await helper.getAddress();

  console.log("✅ PredictionMarketHelper deployed to:", helperAddress);
  console.log("📝 Connected to PredictionMarket at:", PREDICTION_MARKET_ADDRESS);

  // Verify it's connected correctly
  console.log("\n🔍 Verifying connection...");
  const connectedMarket = await helper.predictionMarket();
  console.log("Connected to market:", connectedMarket);

  if (connectedMarket.toLowerCase() === PREDICTION_MARKET_ADDRESS.toLowerCase()) {
    console.log("✅ Connection verified!");
  } else {
    console.log("❌ Connection mismatch!");
  }

  console.log("\n📋 Add this to your .env file:");
  console.log(`NEXT_PUBLIC_HELPER_CONTRACT_ADDRESS=${helperAddress}`);

  // Wait for block confirmations for verification
  console.log("\n⏳ Waiting for block confirmations...");
  await helper.deploymentTransaction().wait(5);

  console.log("\n📝 Verify contract with:");
  console.log(`npx hardhat verify --network bscTestnet ${helperAddress} ${PREDICTION_MARKET_ADDRESS}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });