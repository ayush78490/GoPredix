import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import {
  mainnet,
  polygon,
  bsc,
  bscTestnet
} from 'wagmi/chains';

// Define custom BSC Testnet with specific RPC
const customBscTestnet = {
  ...bscTestnet,
  rpcUrls: {
    default: { http: ['https://bsc-testnet.publicnode.com'] },
    public: { http: ['https://bsc-testnet.publicnode.com'] },
  },
} as const;

export const config = getDefaultConfig({
  appName: 'GoPredix',
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || (() => {
    throw new Error('NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID is not defined. Please add it to your .env file.');
  })(),
  chains: [
    customBscTestnet,
    bsc,
    mainnet,
    polygon,
  ],
  ssr: true,
});