import { ethers } from "hardhat";

async function main() {
  const originalContractAddress = "0x651790f7A07d818D5a2152572C46e2e3C6E226E5";

  console.log("Deploying PredictionMarketViewer with original contract at:", originalContractAddress);

  const Viewer = await ethers.getContractFactory("PredictionMarketViewer");

  const viewer = await Viewer.deploy(originalContractAddress);

  // ethers v6 does not have .deployed() method; deployment is awaited via deploy()
  console.log("PredictionMarketViewer deployed to:", viewer.target);
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
