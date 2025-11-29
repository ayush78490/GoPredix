/**
 * Redeploy MarketMarketplace with Correct Configuration
 * 
 * This will deploy a new marketplace contract pointing to the correct
 * prediction market address that your frontend uses.
 * 
 * IMPORTANT: You need a DEPLOYER_PRIVATE_KEY with BNB for gas!
 * 
 * Run: DEPLOYER_PRIVATE_KEY=your_key node scripts/deploy-marketplace.mjs
 */

import { ethers } from "ethers"
import { readFileSync } from "fs"
import { fileURLToPath } from "url"
import { dirname, join } from "path"

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const MARKETPLACE_JSON = JSON.parse(
    readFileSync(join(__dirname, "..", "contracts", "MarketMarketplace.json"), "utf-8")
)

// Configuration
const RPC_URL = "https://data-seed-prebsc-1-s1.binance.org:8545/"
const PREDICTION_MARKET_ADDRESS = "0x52Ca4B7673646B8b922ea00ccef6DD0375B14619"  // BNB market
const PDX_TOKEN_ADDRESS = "0xeE943aCCAa07ED556DfAc9d3a76015050fA78BC8"  // PDX token (Correct Address)
const MARKETPLACE_FEE_BPS = 200  // 2%

async function deploy() {
    console.log("🚀 Deploying MarketMarketplace Contract")
    console.log("=".repeat(60))

    // Check for private key
    const DEPLOYER_PRIVATE_KEY = process.env.DEPLOYER_PRIVATE_KEY
    if (!DEPLOYER_PRIVATE_KEY) {
        console.error("\n❌ ERROR: DEPLOYER_PRIVATE_KEY environment variable not set!")
        console.log("\nUsage:")
        console.log("  DEPLOYER_PRIVATE_KEY=your_key node scripts/deploy-marketplace.mjs")
        process.exit(1)
    }

    console.log("\n📋 Deployment Configuration:")
    console.log(`   Network: BSC Testnet`)
    console.log(`   Prediction Market: ${PREDICTION_MARKET_ADDRESS}`)
    console.log(`   PDX Token: ${PDX_TOKEN_ADDRESS}`)
    console.log(`   Marketplace Fee: ${MARKETPLACE_FEE_BPS / 100}%`)

    const provider = new ethers.JsonRpcProvider(RPC_URL)
    const deployer = new ethers.Wallet(DEPLOYER_PRIVATE_KEY, provider)

    console.log(`\n👤 Deployer Address: ${deployer.address}`)

    // Check balance
    const balance = await provider.getBalance(deployer.address)
    console.log(`💰 Balance: ${ethers.formatEther(balance)} BNB`)

    if (balance < ethers.parseEther("0.01")) {
        console.error("\n❌ ERROR: Insufficient BNB for deployment!")
        console.log("   You need at least 0.01 BNB for gas fees")
        process.exit(1)
    }

    console.log("\n📡 Deploying contract...")

    try {
        const factory = new ethers.ContractFactory(
            MARKETPLACE_JSON.abi || MARKETPLACE_JSON,
            MARKETPLACE_JSON.bytecode,
            deployer
        )

        const marketplace = await factory.deploy(
            PDX_TOKEN_ADDRESS,
            PREDICTION_MARKET_ADDRESS,
            MARKETPLACE_FEE_BPS
        )

        console.log(`\n⏳ Transaction sent: ${marketplace.deploymentTransaction().hash}`)
        console.log(`   Waiting for confirmation...`)

        await marketplace.waitForDeployment()
        const address = await marketplace.getAddress()

        console.log(`\n✅ MarketMarketplace deployed successfully!`)
        console.log(`   Address: ${address}`)
        console.log(`   TX Hash: ${marketplace.deploymentTransaction().hash}`)

        // Verify configuration
        console.log(`\n🔍 Verifying contract configuration...`)
        const predictionMarket = await marketplace.predictionMarket()
        const pdxToken = await marketplace.pdxToken()
        const feeBps = await marketplace.marketplaceFeeBps()

        console.log(`   Prediction Market: ${predictionMarket}`)
        console.log(`   PDX Token: ${pdxToken}`)
        console.log(`   Fee BPS: ${feeBps}`)

        if (predictionMarket.toLowerCase() === PREDICTION_MARKET_ADDRESS.toLowerCase()) {
            console.log(`   ✅ Prediction Market address is CORRECT!`)
        } else {
            console.log(`   ❌ WARNING: Prediction Market address mismatch!`)
        }

        // Update config file instruction
        console.log(`\n📝 Next Steps:`)
        console.log(`\n1. Update Frontend/lib/web3/config.ts:`)
        console.log(`   export const MARKET_MARKETPLACE_ADDRESS = "${address}"`)
        console.log(`\n2. Restart your frontend dev server`)
        console.log(`\n3. Try listing a market again!`)

        console.log(`\n${"=".repeat(60)}`)
        console.log(`🎉 Deployment Complete!`)

    } catch (error) {
        console.error(`\n❌ Deployment failed:`, error.message)
        process.exit(1)
    }
}

deploy().catch(error => {
    console.error("Fatal error:", error)
    process.exit(1)
})
