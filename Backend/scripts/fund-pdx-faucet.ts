import { ethers } from "hardhat";
import * as fs from "fs";

async function main() {
  console.log("\n💰 Funding PDX Faucet...\n");

  const pdxDeployment = JSON.parse(fs.readFileSync("deployment-gpx.json", "utf-8"));
  const faucetDeployment = JSON.parse(fs.readFileSync("deployment-pdx-faucet.json", "utf-8"));

  const PDX_ADDRESS = pdxDeployment.contractAddress;
  const FAUCET_ADDRESS = faucetDeployment.faucetAddress;
  
  const pdxToken = await ethers.getContractAt("GPXToken", PDX_ADDRESS);
  
  const transferAmount = ethers.parseEther("10000"); // 10,000 PDX
  
  console.log(`📤 Transferring 10,000 PDX to faucet...`);
  const tx = await pdxToken.transfer(FAUCET_ADDRESS, transferAmount);
  console.log(`⏳ Waiting for confirmation...`);
  await tx.wait();
  
  const faucetBalance = await pdxToken.balanceOf(FAUCET_ADDRESS);
  
  console.log(`\n✅ Faucet funded successfully!`);
  console.log(`📍 Faucet Address: ${FAUCET_ADDRESS}`);
  console.log(`💰 Faucet Balance: ${ethers.formatEther(faucetBalance)} PDX`);
  console.log(`📊 Can serve: ${Number(faucetBalance) / Number(ethers.parseEther("100"))} users\n`);
}

main().catch(console.error);
    console.log("📄 Funding complete.");