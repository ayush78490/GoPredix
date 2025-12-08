# 🎯 GoPredix SDK

**The official SDK for building applications on GoPredix Prediction Markets**

[![npm version](https://img.shields.io/npm/v/@gopredix/core.svg)](https://www.npmjs.com/package/@gopredix/core)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

GoPredix SDK provides a complete toolkit for integrating prediction market functionality into your applications. Built for developers who want to create, trade, and manage prediction markets on BNB Smart Chain.

## 📦 Packages

- **[@gopredix/core](./packages/core)** - Core SDK with market and trading APIs
- **[@gopredix/react](./packages/react)** - React hooks and components
- **[@gopredix/api](./packages/api)** - REST API client wrapper

## 🚀 Quick Start

### Installation

```bash
npm install @gopredix/core @gopredix/react
# or
yarn add @gopredix/core @gopredix/react
```

### Basic Usage (Node.js)

```typescript
import { GoPredixClient } from '@gopredix/core';

// Initialize client
const client = new GoPredixClient({
  network: 'testnet',
});

// Fetch all markets
const markets = await client.markets.getAllMarkets('BNB');
console.log('Active markets:', markets.length);

// Get specific market
const market = await client.markets.getMarket(0, 'BNB');
console.log('Market:', market.question);
```

### React Usage

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
  const { markets, loading } = useMarkets('BNB');
  
  if (loading) return <div>Loading markets...</div>;
  
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

## 📚 Documentation

- [Core SDK Guide](./packages/core/README.md)
- [React SDK Guide](./packages/react/README.md)
- [API Reference](./docs/api-reference.md)
- [Examples](./examples)

## 🏗️ Development

```bash
# Install dependencies
npm install

# Build all packages
npm run build

# Run tests
npm run test

# Development mode
npm run dev
```

## 🌐 Resources

- **Website**: [www.gopredix.xyz](https://www.gopredix.xyz)
- **Documentation**: [docs.gopredix.xyz](https://docs.gopredix.xyz)
- **Discord**: [Join Community](https://discord.gg/gopredix)

## 📄 License

MIT License - see [LICENSE](./LICENSE) for details
