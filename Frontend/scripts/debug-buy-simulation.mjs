import { ethers } from "ethers";

const RPC_URL = "https://data-seed-prebsc-1-s1.binance.org:8545/";
const MARKETPLACE_ADDRESS = "0xb8C6305725803028659dDBeeAAcd699A9C1A1819";
const SELLER_KEY = process.env.DEPLOYER_PRIVATE_KEY || "2e76f7afbbdf13594af5999c82454516fbb1ebaf17128b337f6e575927970436";

async function main() {
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const sellerWallet = new ethers.Wallet(SELLER_KEY, provider);
    const randomWallet = ethers.Wallet.createRandom().connect(provider);

    console.log(`Funding random wallet ${randomWallet.address}...`);
    try {
        const tx = await sellerWallet.sendTransaction({
            to: randomWallet.address,
            value: ethers.parseEther("0.005")
        });
        await tx.wait();
        console.log("Funded.");
    } catch (e) {
        console.error("Funding failed:", e.message);
        return;
    }

    const marketplace = new ethers.Contract(MARKETPLACE_ADDRESS, ["function buyMarket(uint256)"], randomWallet);

    console.log("Attempting buyMarket(1)...");
    try {
        // We expect this to fail because Random Wallet has no PDX allowance
        const tx = await marketplace.buyMarket(1, { gasLimit: 500000 });
        console.log("Transaction sent:", tx.hash);
        await tx.wait();
    } catch (error) {
        console.log("❌ Reverted.");

        // Check for specific revert reasons
        if (error.reason) {
            console.log(`✅ Reason: "${error.reason}"`);
            if (error.reason.includes("PDX transfer failed") || error.reason.includes("insufficient allowance")) {
                console.log("🎉 SUCCESS! The contract reached the transfer step. markets() call worked!");
            } else if (error.reason.includes("market not open")) {
                console.log("⚠️ Market Not Open. markets() call worked but status is wrong.");
            }
        } else {
            console.log("⚠️ No Reason string. Likely decoding error or panic.");
            console.log("Error:", error);
        }
    }
}

main();
