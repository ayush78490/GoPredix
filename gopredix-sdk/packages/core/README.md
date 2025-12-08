# @gopredix/core

Core SDK for GoPredix Prediction Markets

## Installation

```bash
npm install @gopredix/core
# or
yarn add @gopredix/core
```

## Quick Start

```typescript
import { GoPredixClient } from '@gopredix/core';
import { ethers } from 'ethers';

// Initialize read-only client
const client = new GoPredixClient({
  network: 'testnet',
});

// Fetch markets
const markets = await client.markets.getAllMarkets('BNB');

// For write operations, add a signer
const provider = new ethers.BrowserProvider(window.ethereum);
const signer = await provider.getSigner();
await client.setSigner(signer);

// Create a market
const marketId = await client.markets.createMarket({
  question: 'Will BTC reach $100k by end of 2024?',
  endTime: Math.floor(Date.now() / 1000) + 86400 * 30,
  initialYes: '0.5',
  initialNo: '0.5',
}, 'BNB');

// Buy YES tokens
await client.trading.buyYes(marketId, '0.1', 'BNB');
```

## API Reference

### GoPredixClient

Main SDK client that provides access to all APIs.

**Constructor Options:**
- `network`: 'testnet' | 'mainnet'
- `provider`: Optional custom ethers provider
- `signer`: Optional ethers signer
- `apiKey`: Optional API key for backend services
- `rpcUrl`: Optional custom RPC URL

### Markets API

- `getAllMarkets(token, filters?)` - Get all markets
- `getMarket(id, token)` - Get single market
- `createMarket(params, token)` - Create new market
- `validateMarket(params)` - Validate market with AI
- `getActiveMarkets(token)` - Get only open markets
- `getMarketsByCategory(category, token)` - Filter by category
- `getMarketsCreatedBy(address, token)` - Get user's created markets

### Trading API

- `buyYes(marketId, amount, token, minOut?)` - Buy YES tokens
- `buyNo(marketId, amount, token, minOut?)` - Buy NO tokens
- `sellYes(marketId, amount, token, minOut?)` - Sell YES tokens
- `sellNo(marketId, amount, token, minOut?)` - Sell NO tokens
- `getBuyMultiplier(marketId, amount, isYes, token)` - Calculate output
- `getUserPositions(address, token)` - Get user's positions
- `claimWinnings(marketId, token)` - Claim resolved market winnings

### Accounts API

- `getUserStats(address, token)` - Get user statistics
- `getBNBBalance(address)` - Get BNB balance
- `getPDXBalance(address)` - Get PDX token balance

## Types

All TypeScript types are exported:

```typescript
import type { 
  Market, 
  MarketStatus, 
  Position,
  CreateMarketParams 
} from '@gopredix/core';
```

## License

MIT
