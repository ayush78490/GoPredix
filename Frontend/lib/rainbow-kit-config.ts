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
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'YOUR_PROJECT_ID',
  chains: [
    customBscTestnet,
    bsc,
    mainnet,
    polygon,
  ],
  ssr: true,
});