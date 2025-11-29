# Marketplace Fix Instructions

The original Marketplace contract was unable to transfer market ownership because the Prediction Market contract does not support third-party transfers (no approval mechanism). 

To fix this, I have created a **Custodial Marketplace** contract. This contract requires the Seller to transfer ownership to the Marketplace contract *before* the sale can be finalized.

## What has been done:

1.  **Created `CustodialMarketplace.sol`**: A new smart contract that handles the secure transfer of market ownership.
    *   Location: `Backend/contracts/CustodialMarketplace.sol`
2.  **Created Deployment Script**: A script to deploy the new contract.
    *   Location: `Backend/scripts/deploy-custodial-marketplace.ts`
3.  **Updated Frontend Code**:
    *   `Frontend/lib/web3/config.ts`: Added new ABI and address placeholder.
    *   `Frontend/hooks/use-market-marketplace.ts`: Updated to use the new contract and added `transferOwnership` / `confirmTransfer` functions.
    *   `Frontend/components/sell-market-modal.tsx`: Updated the UI to guide the user through the 3-step listing process (List -> Transfer -> Confirm).

## 🚨 ACTION REQUIRED: Deploy the Contract

I could not deploy the contract because I do not have access to your private key. Please follow these steps to deploy it and update the frontend:

1.  **Open a terminal** in the `Backend` directory.
2.  **Run the deployment script**:
    ```bash
    npx hardhat run scripts/deploy-custodial-marketplace.ts --network bnbTestnet
    ```
    *Note: Ensure your `.env` file in `Backend` contains `PRIVATE_KEY` and `RPC_URL`.*

3.  **Copy the Deployed Address**: The script will output something like:
    ```
    CustodialMarketplace deployed to: 0x123...abc
    ```

4.  **Update Frontend Config**:
    *   Open `Frontend/lib/web3/config.ts`.
    *   Find `CUSTODIAL_MARKETPLACE_ADDRESS`.
    *   Replace `0x0000...` with your new contract address.

5.  **Restart Frontend**:
    *   Restart your Next.js server (`npm run dev`) to ensure the config is reloaded.

## How the new Listing Process works:

1.  **Initialize Listing**: User enters price and clicks "List". This creates a record in the marketplace.
2.  **Transfer Ownership**: User clicks "Transfer Ownership". This triggers a transaction on the Prediction Market to transfer the market to the Marketplace contract.
3.  **Confirm & Activate**: User clicks "Confirm". The Marketplace checks it has received ownership and activates the listing.

Buying works as normal, but now the Marketplace contract (which owns the market) can successfully transfer it to the Buyer.
