# Trading Guide

Learn how to trade on GoPredix prediction markets using the SDK.

## Basic Trading

### Buying Outcome Tokens

```typescript
import { GoPredixClient } from '@gopredix/core';
import { ethers } from 'ethers';

// Setup client with wallet
const provider = new ethers.BrowserProvider(window.ethereum);
const signer = await provider.getSigner();

const client = new GoPredixClient({ network: 'testnet' });
await client.setSigner(signer);

// Buy YES tokens
const txHash = await client.trading.buyYes(
  0,      // marketId
  '0.1',  // amount in BNB
  'BNB',  // token type
  '0'     // minimum output (slippage protection)
);

console.log(`Transaction: ${txHash}`);
```

### Selling Tokens

```typescript
// Sell YES tokens
const txHash = await client.trading.sellYes(
  0,      // marketId
  '100',  // amount of YES tokens to sell
  'BNB',  // payment token
  '0.09'  // minimum BNB to receive
);
```

## Calculating Trade Output

Before trading, calculate the expected output:

```typescript
const multiplier = await client.trading.getBuyMultiplier(
  0,      // marketId
  '0.1',  // amount to invest
  true,   // isYes
  'BNB'
);

console.log(`Multiplier: ${multiplier.multiplier}x`);
console.log(`You will receive: ${multiplier.totalOut} tokens`);
console.log(`Fee: ${multiplier.totalFee} BNB`);
```

## Slippage Protection

Always set a minimum output to protect against slippage:

```typescript
// Get expected output
const { totalOut } = await client.trading.getBuyMultiplier(0, '0.1', true, 'BNB');

// Set 1% slippage tolerance
const minOut = (parseFloat(totalOut) * 0.99).toString();

// Execute trade with protection
await client.trading.buyYes(0, '0.1', 'BNB', minOut);
```

## Viewing Positions

```typescript
const positions = await client.trading.getUserPositions(userAddress, 'BNB');

positions.forEach(pos => {
  console.log(`Market #${pos.marketId}:`);
  console.log(`  YES: ${pos.yesBalance}`);
  console.log(`  NO: ${pos.noBalance}`);
  console.log(`  Invested: ${pos.totalInvested}`);
});
```

## Claiming Winnings

After a market resolves:

```typescript
const txHash = await client.trading.claimWinnings(marketId, 'BNB');
console.log(`Claimed winnings: ${txHash}`);
```

## React Hook Example

```tsx
import { useTrading, useMarket } from '@gopredix/react';

function TradeButton({ marketId }: { marketId: number }) {
  const { market } = useMarket(marketId, 'BNB');
  const { buyYes, loading } = useTrading();

  const handleTrade = async () => {
    try {
      const txHash = await buyYes(marketId, '0.1', 'BNB');
      alert(`Trade successful! TX: ${txHash}`);
    } catch (error) {
      alert(`Trade failed: ${error.message}`);
    }
  };

  return (
    <button 
      onClick={handleTrade}
      disabled={loading}
    >
      {loading ? 'Trading...' : `Buy YES (${market?.yesPrice}%)`}
    </button>
  );
}
```

## Best Practices

1. **Always calculate multipliers** before trading
2. **Set slippage protection** (1-5% tolerance)
3. **Check market status** before trading
4. **Handle errors gracefully**
5. **Wait for transaction confirmation**

## Error Handling

```typescript
try {
  await client.trading.buyYes(marketId, amount, 'BNB');
} catch (error) {
  if (error.code === 'INSUFFICIENT_FUNDS') {
    console.error('Not enough BNB');
  } else if (error.code === 'UNPREDICTABLE_GAS_LIMIT') {
    console.error('Transaction would fail');
  } else {
    console.error('Trade failed:', error.message);
  }
}
```
