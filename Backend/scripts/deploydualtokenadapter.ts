import { ethers } from "ethers";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

// ==================== TYPES ====================

interface DeploymentConfig {
    PDX_TOKEN_ADDRESS: string;
    BAZAR_CONTRACT_ADDRESS: string;
    PANCAKESWAP_ROUTER_TESTNET: string;
    TBNB_ADDRESS: string;
}

interface DeploymentInfo {
    network: string;
    timestamp: string;
    deployer: string;
    adapter: {
        address: string;
        name: string;
    };
    config: DeploymentConfig;
}

// ==================== READ CONTRACT ARTIFACTS ====================

function readContractArtifact(): { abi: any; bytecode: string } {
    const artifactPath = path.join(
        process.cwd(),
        "artifacts/contracts/dualtokenadapter.sol/TestnetDualTokenAdapter.json"
    );

    if (!fs.existsSync(artifactPath)) {
        throw new Error(
            `❌ Artifact file not found at ${artifactPath}\n   Run: npx hardhat compile`
        );
    }

    const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf-8"));
    return {
        abi: artifact.abi,
        bytecode: artifact.bytecode,
    };
}

// ==================== MAIN DEPLOYMENT FUNCTION ====================

async function main(): Promise<void> {
    console.log("🚀 Starting deployment...\n");

    // ==================== CONFIGURATION ====================
    const config: DeploymentConfig = {
        PDX_TOKEN_ADDRESS: process.env.PDX_TOKEN_ADDRESS || "0x...",
        BAZAR_CONTRACT_ADDRESS: process.env.BAZAR_CONTRACT_ADDRESS || "0x...",
        PANCAKESWAP_ROUTER_TESTNET:
            process.env.PANCAKESWAP_ROUTER ||
            "0xd99d1c33f9fc3444f8101754abc46c52416f2d4a",
        TBNB_ADDRESS:
            process.env.TBNB_ADDRESS || "0xae13d989dac2f0deff460ac112a837c12d6e4cab",
    };

    // ==================== VALIDATION ====================
    console.log("📋 Configuration:");
    console.log(`   PDX Token: ${config.PDX_TOKEN_ADDRESS}`);
    console.log(`   Bazar Contract: ${config.BAZAR_CONTRACT_ADDRESS}`);
    console.log(`   PancakeSwap Router: ${config.PANCAKESWAP_ROUTER_TESTNET}`);
    console.log(`   TBNB: ${config.TBNB_ADDRESS}\n`);

    if (
        config.PDX_TOKEN_ADDRESS === "0x..." ||
        config.BAZAR_CONTRACT_ADDRESS === "0x..."
    ) {
        throw new Error(
            "❌ Please set PDX_TOKEN_ADDRESS and BAZAR_CONTRACT_ADDRESS in .env file"
        );
    }

    // ==================== SETUP PROVIDER & SIGNER ====================
        const rpcUrl =
    process.env.BSC_TESTNET_RPC_URL ||
    "https://bsc-testnet-rpc.publicnode.com";
        const privateKey = process.env.PRIVATE_KEY;
    
        if (!privateKey) {
            throw new Error(
                "❌ PRIVATE_KEY not set in .env file. Please add your private key."
            );
        }
    
        const provider = new ethers.JsonRpcProvider(rpcUrl);
        const signer = new ethers.Wallet(privateKey, provider);
    
        console.log("👤 Deploying with account:", signer.address);

    try {
        const balance = await provider.getBalance(signer.address);
        console.log(
            "💰 Account balance:",
            ethers.formatEther(balance),
            "BNB\n"
        );
    } catch (error) {
        console.log("⚠️  Could not fetch balance\n");
    }

    // ==================== DEPLOY ADAPTER ====================
    console.log("📦 Deploying TestnetDualTokenAdapter...\n");

    try {
        // Read compiled contract artifact from Hardhat
        const { abi, bytecode } = readContractArtifact();

        // Create contract factory
        const factory = new ethers.ContractFactory(abi, bytecode, signer);

        // Deploy
        const adapter = await factory.deploy(
            config.PDX_TOKEN_ADDRESS,
            config.BAZAR_CONTRACT_ADDRESS,
            config.PANCAKESWAP_ROUTER_TESTNET,
            config.TBNB_ADDRESS
        );

        console.log("⏳ Waiting for deployment transaction...");
        const deploymentTx = await adapter.deploymentTransaction();

        console.log("✅ TestnetDualTokenAdapter deployed successfully!");
        console.log(`📍 Adapter Address: ${((adapter as any).target ?? (adapter as any).address)}`);
        console.log(
            `📝 Transaction Hash: ${deploymentTx?.hash}\n`
        );

        // ==================== VERIFY DEPLOYMENT ====================
        console.log("🔍 Verifying deployment...\n");

        try {
            const pdxToken = await (adapter as any).pdxToken();
            const predictionMarket = await (adapter as any).predictionMarket();
            const dexRouter = await (adapter as any).dexRouter();
            const tbnb = await (adapter as any).TBNB();
            const owner = await (adapter as any).owner();
            const slippage = await (adapter as any).slippageTolerance();

            console.log("Verification Results:");
            console.log(`   ✓ PDX Token: ${pdxToken}`);
            console.log(`   ✓ Prediction Market: ${predictionMarket}`);
            console.log(`   ✓ DEX Router: ${dexRouter}`);
            console.log(`   ✓ TBNB: ${tbnb}`);
            console.log(`   ✓ Owner: ${owner}`);
            console.log(`   ✓ Slippage Tolerance: ${slippage}%\n`);
        } catch (verifyError) {
            if (verifyError instanceof Error) {
                console.log(
                    "⚠️  Verification error:",
                    verifyError.message,
                    "\n"
                );
            }
        }

        // ==================== SAVE DEPLOYMENT INFO ====================
        const deploymentInfo: DeploymentInfo = {
            network: "bscTestnet",
            timestamp: new Date().toISOString(),
            deployer: signer.address,
            adapter: {
                address: ((adapter as any).target ?? (adapter as any).address),
                name: "TestnetDualTokenAdapter",
            },
            config: config,
        };

        const deploymentsDir = path.join(process.cwd(), "deployments");
        if (!fs.existsSync(deploymentsDir)) {
            fs.mkdirSync(deploymentsDir, { recursive: true });
        }

        const deploymentPath = path.join(
            deploymentsDir,
            "adapter-deployment.json"
        );
        fs.writeFileSync(
            deploymentPath,
            JSON.stringify(deploymentInfo, null, 2)
        );
        console.log(`💾 Deployment info saved to: ${deploymentPath}\n`);

        // ==================== NEXT STEPS ====================
        console.log(
            "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        );
        console.log("✅ DEPLOYMENT SUCCESSFUL!\n");
        console.log("📌 Important Addresses:");
        console.log(`   Adapter: ${((adapter as any).target ?? (adapter as any).address)}\n`);

        console.log("🔧 Next Steps:");
        console.log("   1. Copy the adapter address above");
        console.log("   2. Update your frontend config:");
        console.log(
            `      export const ADAPTER_ADDRESS = "${((adapter as any).target ?? (adapter as any).address)}";`
        );
        console.log("   3. Test with a small transaction first");
        console.log("   4. Verify on testnet block explorer\n");

        console.log("📚 Available Functions:");
        console.log("   - createMarketWithBNB()");
        console.log("   - createMarketWithPDX()");
        console.log("   - buyYesWithBNB() / buyYesWithPDX()");
        console.log("   - buyNoWithBNB() / buyNoWithPDX()");
        console.log("   - sellYesForBNB() / sellYesForPDX()");
        console.log("   - sellNoForBNB() / sellNoForPDX()");
        console.log("   - createStopLossOrder()");
        console.log("   - createTakeProfitOrder()");
        console.log("   - addLiquidity() / removeLiquidity()");
        console.log("   - claimRedemption()\n");

        console.log("🔗 Block Explorer:");
        console.log(
            `   https://testnet.bscscan.com/address/${((adapter as any).target ?? (adapter as any).address)}`
        );
        console.log(
            "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
        );
    } catch (error) {
        if (error instanceof Error) {
            console.error("❌ Deployment failed:", error.message);
            if (error.message.includes("insufficient funds")) {
                console.error(
                    "💡 Tip: Make sure you have enough testnet BNB for gas fees"
                );
            }
        }
        throw error;
    }
}

// ==================== EXECUTION ====================

main()
    .then(() => {
        console.log("✨ Deployment complete!");
        process.exit(0);
    })
    .catch((error) => {
        console.error("Error:", error);
        process.exit(1);
    });