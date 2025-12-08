# Getting Started with GoPredix SDK

Welcome to the GoPredix SDK! This guide will help you get up and running in minutes.

## Installation

Choose your package based on your needs:

### For Node.js / Backend

```bash
npm install @gopredix/core
# or
yarn add @gopredix/core
```

### For React Applications

```bash
npm install @gopredix/core @gopredix/react
# or
yarn add @gopredix/core @gopredix/react
```

## Quick Start

### Node.js Example

```typescript
import { GoPredixClient } from '@gopredix/core';

// Initialize the client
const client = new GoPredixClient({
  network: 'testnet', // or 'mainnet'
});

// Fetch all markets
const markets = await client.markets.getAllMarkets('BNB');

console.log(`Found ${markets.length} markets`);

// Get specific market
const market = await client.markets.getMarket(0, 'BNB');

console.log(market.question);
console.log(`YES: ${market.yesPrice}% | NO: ${market.noPrice}%`);
```

### React Example

```tsx
import { GoPredixProvider, useMarkets } from '@gopredix/react';

function App() {
  return (
    <GoPredixProvider config={{ network: 'testnet' }}>
      <MarketList />
    </GoPredixProvider>
  );
}

function MarketList() {
  const { markets, loading, error } = useMarkets('BNB');

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      {markets.map(market => (
        <div key={market.id}>
          <h3>{market.question}</h3>
          <p>YES: {market.yesPrice}% | NO: {market.noPrice}%</p>
        </div>
      ))}
    </div>
  );
}
```

## Trading with Wallet

To perform write operations (trading, creating markets), you need to connect a wallet:

```typescript
import { ethers } from 'ethers';

// Browser with MetaMask
const provider = new ethers.BrowserProvider(window.ethereum);
const signer = await provider.getSigner();

client.setSigner(signer);

// Now you can trade
const txHash = await client.trading.buyYes(0, '0.1', 'BNB');
console.log(`Transaction: ${txHash}`);
```

## Next Steps

- [API Reference](./api-reference/README.md)
- [Trading Guide](./guides/trading.md)
- [Creating Markets](./guides/creating-markets.md)
- [React Hooks](./guides/react-hooks.md)
