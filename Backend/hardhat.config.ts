import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import * as dotenv from "dotenv";

dotenv.config();

const { PRIVATE_KEY, RPC_URL, BSCSCAN_API_KEY } = process.env;

// Loosen the networks typing to avoid strict union mismatch with Hardhat's types
const networks: Record<string, any> = {
  hardhat: {},
  bnbTestnet: {
    url: RPC_URL || "https://data-seed-prebsc-1-b.binance.org:8545",
    accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
    chainId: 97,
  },
  bscTestnet: {
    url: "https://bsc-testnet-rpc.publicnode.com",
    accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
    chainId: 97,
  },
  localhost: {
    url: "http://127.0.0.1:8545",
  },
};

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
      viaIR: true,
    },
  },
  networks,
  etherscan: {
    apiKey: BSCSCAN_API_KEY || "",
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
};

export default config;
