/**
 * Marketplace Contract Diagnostic Tool
 * 
 * This script checks the marketplace contract configuration to verify
 * if it's pointing to the correct prediction market address.
 * 
 * Run: node scripts/diagnose-marketplace.mjs
 */

import { ethers } from "ethers"
import { readFileSync } from "fs"
import { fileURLToPath } from "url"
import { dirname, join } from "path"

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const MARKETPLACE_ABI = JSON.parse(
    readFileSync(join(__dirname, "..", "contracts", "MarketMarketplace.json"), "utf-8")
)

const RPC_URL = "https://data-seed-prebsc-1-s1.binance.org:8545/"
const MARKETPLACE_ADDRESS = "0xc92c18CD349c7C60EF1B8c5A83c9000a73E7F4A0"
const EXPECTED_PREDICTION_MARKET = "0x52Ca4B7673646B8b922ea00ccef6DD0375B14619"

async function diagnose() {
    console.log("🔍 Marketplace Contract Diagnostic")
    console.log("=".repeat(60))
    console.log(`\n📍 Marketplace Address: ${MARKETPLACE_ADDRESS}`)
    console.log(`✅ Expected Prediction Market: ${EXPECTED_PREDICTION_MARKET}`)
    console.log("")

    const provider = new ethers.JsonRpcProvider(RPC_URL)
    const marketplace = new ethers.Contract(
        MARKETPLACE_ADDRESS,
        MARKETPLACE_ABI,
        provider
    )

    try {
        // Try to read the predictionMarket storage variable
        console.log("📡 Reading marketplace contract configuration...")

        // Method 1: Try calling predictionMarket() if it's a public variable
        try {
            const predictionMarketAddr = await marketplace.predictionMarket()
            console.log(`\n🎯 Found predictionMarket address: ${predictionMarketAddr}`)

            if (predictionMarketAddr.toLowerCase() === EXPECTED_PREDICTION_MARKET.toLowerCase()) {
                console.log("✅ SUCCESS: Marketplace is configured with the correct prediction market!")
                console.log("\n💡 The issue must be something else. Let's check if the market exists...")

                // Check if market ID 1 exists
                const predictionMarket = new ethers.Contract(
                    predictionMarketAddr,
                    [
                        "function markets(uint256) external view returns (address creator, string memory question, string memory category, uint256 endTime, uint8 status, uint8 outcome, address yesToken, address noToken, uint256 yesPool, uint256 noPool, uint256 lpTotalSupply, uint256 totalBacking, uint256 platformFees, uint256 resolutionRequestedAt, address resolutionRequester, string memory resolutionReason, uint256 resolutionConfidence, uint256 disputeDeadline, address disputer, string memory disputeReason)"
                    ],
                    provider
                )

                try {
                    const market = await predictionMarket.markets(1)
                    if (market.creator === "0x0000000000000000000000000000000000000000") {
                        console.log("❌ Market ID 1 does NOT exist (creator is zero address)")
                    } else {
                        console.log(`✅ Market ID 1 EXISTS!`)
                        console.log(`   Creator: ${market.creator}`)
                        console.log(`   Question: ${market.question}`)
                        console.log(`   Status: ${market.status}`)
                    }
                } catch (e) {
                    console.log("⚠️  Could not fetch market ID 1:", e.message)
                }

            } else {
                console.log(`\n❌ MISMATCH DETECTED!`)
                console.log(`   Marketplace points to: ${predictionMarketAddr}`)
                console.log(`   Frontend expects:      ${EXPECTED_PREDICTION_MARKET}`)
                console.log(`\n🔧 SOLUTION: Redeploy the marketplace contract with the correct address`)
            }
        } catch (e) {
            console.log("⚠️  Could not read predictionMarket variable (not public or different name)")
            console.log("   Error:", e.message)

            // Method 2: Try reading from storage slots
            console.log("\n📡 Attempting to read from storage slots...")
            const slot0 = await provider.getStorage(MARKETPLACE_ADDRESS, 0)
            const slot1 = await provider.getStorage(MARKETPLACE_ADDRESS, 1)
            const slot2 = await provider.getStorage(MARKETPLACE_ADDRESS, 2)

            console.log(`   Slot 0: ${slot0}`)
            console.log(`   Slot 1: ${slot1}`)
            console.log(`   Slot 2: ${slot2}`)

            // Try to extract address from slots
            const addr0 = "0x" + slot0.slice(-40)
            const addr1 = "0x" + slot1.slice(-40)
            const addr2 = "0x" + slot2.slice(-40)

            console.log(`\n🔍 Potential addresses found in storage:`)
            console.log(`   From slot 0: ${addr0}`)
            console.log(`   From slot 1: ${addr1}`)
            console.log(`   From slot 2: ${addr2}`)

            if (addr0.toLowerCase() === EXPECTED_PREDICTION_MARKET.toLowerCase()) {
                console.log(`\n✅ Match found in slot 0!`)
            } else if (addr1.toLowerCase() === EXPECTED_PREDICTION_MARKET.toLowerCase()) {
                console.log(`\n✅ Match found in slot 1!`)
            } else if (addr2.toLowerCase() === EXPECTED_PREDICTION_MARKET.toLowerCase()) {
                console.log(`\n✅ Match found in slot 2!`)
            } else {
                console.log(`\n❌ No matching address found in storage slots 0-2`)
            }
        }

        // Check nextListingId
        console.log("\n📊 Checking marketplace state...")
        const nextId = await marketplace.nextListingId()
        console.log(`   Next Listing ID: ${nextId}`)
        console.log(`   Total listings: ${Number(nextId) - 1}`)

    } catch (error) {
        console.error("\n❌ Error during diagnosis:", error.message)
    }

    console.log("\n" + "=".repeat(60))
    console.log("✅ Diagnosis complete!")
}

diagnose().catch(console.error)
