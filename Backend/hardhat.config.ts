import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "hardhat-contract-sizer";
import * as dotenv from "dotenv";

dotenv.config();

const { PRIVATE_KEY, RPC_URL, BSCSCAN_API_KEY } = process.env;

// Network configuration
const networks: Record<string, any> = {
  hardhat: {
    // Allow unlimited contract size for local testing only
    allowUnlimitedContractSize: true,
  },
  bnbTestnet: {
    url: RPC_URL || "https://bsc-testnet.infura.io/v3/e9e8495ff6db41b49acc14fd59a0a0c3",
    accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
    chainId: 97,
  },
  bscTestnet: {
    url: "https://bsc-testnet.infura.io/v3/e9e8495ff6db41b49acc14fd59a0a0c3",
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
        runs: 1,  // ✓ OPTIMIZED: Set to 1 for minimum bytecode size
      },
      viaIR: true, // enable IR pipeline per request
    },
  },
  
  // ✓ Contract sizer plugin to track size during compilation
  contractSizer: {
    alphaSort: true,
    runOnCompile: true,
    disambiguatePaths: false,
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