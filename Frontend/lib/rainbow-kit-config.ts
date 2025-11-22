import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { 
  mainnet, 
  polygon, 
  bsc,
  bscTestnet
} from 'wagmi/chains';

export const config = getDefaultConfig({
  appName: 'GoPredix',
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'YOUR_PROJECT_ID',
  chains: [
    bscTestnet,
    bsc,
    mainnet,
    polygon,
  ],
  ssr: true,
});