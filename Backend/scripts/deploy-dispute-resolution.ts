/**
 * Deployment Script for DisputeResolution Contract
 * 
 * Deploys the DisputeResolution contract to BSC Testnet or Mainnet
 * 
 * Usage:
 *   npx hardhat run scripts/deploy-dispute-resolution.ts --network bnbTestnet
 */

import { ethers } from "hardhat";

async function main() {
    console.log("\n🚀 Deploying DisputeResolution Contract");
    console.log("=".repeat(70));

    const [deployer] = await ethers.getSigners();

    console.log("\n📋 Deployment Info:");
    console.log("Deployer Address:", deployer.address);
    console.log("Deployer Balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "BNB");

    // Network info
    const network = await ethers.provider.getNetwork();
    console.log("Network:", network.name);
    console.log("Chain ID:", network.chainId.toString());

    // Resolution Authority Address
    // IMPORTANT: Change this to your actual resolution authority address
    // This can be a multi-sig wallet or DAO contract
    const RESOLUTION_AUTHORITY = deployer.address; // Using deployer for testing

    console.log("\n⚙️  Configuration:");
    console.log("Resolution Authority:", RESOLUTION_AUTHORITY);

    // Deploy DisputeResolution
    console.log("\n🔨 Deploying DisputeResolution contract...");

    const DisputeResolutionFactory = await ethers.getContractFactory("DisputeResolution");
    const disputeResolution = await DisputeResolutionFactory.deploy(RESOLUTION_AUTHORITY);

    await disputeResolution.waitForDeployment();
    const contractAddress = await disputeResolution.getAddress();

    console.log("\n✅ DisputeResolution deployed!");
    console.log("📍 Contract Address:", contractAddress);

    // Get contract parameters
    const owner = await disputeResolution.owner();
    const resolutionAuthority = await disputeResolution.resolutionAuthority();
    const minDisputeStake = await disputeResolution.minimumDisputeStake();
    const minVoteStake = await disputeResolution.minimumVoteStake();
    const votingPeriod = await disputeResolution.votingPeriod();
    const platformFee = await disputeResolution.platformFeePercent();

    console.log("\n📊 Contract Details:");
    console.log("Owner:", owner);
    console.log("Resolution Authority:", resolutionAuthority);
    console.log("Minimum Dispute Stake:", ethers.formatEther(minDisputeStake), "BNB");
    console.log("Minimum Vote Stake:", ethers.formatEther(minVoteStake), "BNB");
    console.log("Voting Period:", Number(votingPeriod) / (24 * 60 * 60), "days");
    console.log("Platform Fee:", platformFee.toString() + "%");

    // Save deployment info
    const deploymentInfo = {
        network: network.name,
        chainId: network.chainId.toString(),
        contractAddress: contractAddress,
        deployer: deployer.address,
        resolutionAuthority: RESOLUTION_AUTHORITY,
        deploymentTime: new Date().toISOString(),
        parameters: {
            minimumDisputeStake: ethers.formatEther(minDisputeStake),
            minimumVoteStake: ethers.formatEther(minVoteStake),
            votingPeriodDays: Number(votingPeriod) / (24 * 60 * 60),
            platformFeePercent: platformFee.toString()
        }
    };

    console.log("\n📝 Deployment Info:");
    console.log(JSON.stringify(deploymentInfo, null, 2));

    // Verification command
    if (network.chainId === 97n || network.chainId === 56n) {
        console.log("\n📌 To verify on BSCScan, run:");
        console.log(`npx hardhat verify --network ${network.name} ${contractAddress} ${RESOLUTION_AUTHORITY}`);
    }

    console.log("\n" + "=".repeat(70));
    console.log("✅ Deployment Complete!");
    console.log("=".repeat(70));
    console.log("\n📋 Next Steps:");
    console.log("1. Save the contract address:", contractAddress);
    console.log("2. Verify the contract on BSCScan (if on testnet/mainnet)");
    console.log("3. Update your frontend with the new contract address");
    console.log("4. Test the dispute functionality using the test script");
    console.log("\nTest command:");
    console.log(`npx hardhat run scripts/test-dispute-resolution.ts --network ${network.name}`);
    console.log("\n");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("\n❌ Deployment Error:", error);
        process.exit(1);
    });
