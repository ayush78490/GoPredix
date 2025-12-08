# API Reference

Complete API reference for GoPredix SDK.

## GoPredixClient

Main SDK client class.

### Constructor

```typescript
new GoPredixClient(config: GoPredixConfig)
```

**Parameters:**

- `config.network`: `'testnet'` | `'mainnet'` - Network to connect to
- `config.provider?`: Optional ethers Provider
- `config.signer?`: Optional ethers Signer
- `config.apiKey?`: Optional API key for backend services
- `config.rpcUrl?`: Optional custom RPC URL

**Example:**

```typescript
const client = new GoPredixClient({
  network: 'testnet',
  rpcUrl: 'https://custom-rpc.example.com',
});
```

### Methods

#### setSigner

```typescript
async setSigner(signer: ethers.Signer): Promise<void>
```

Set the signer for write operations.

#### getNetworkConfig

```typescript
getNetworkConfig(): NetworkConfig
```

Get current network configuration.

---

## MarketAPI

Access via `client.markets`

### getAllMarkets

```typescript
async getAllMarkets(
  token: 'BNB' | 'PDX',
  filters?: { status?: MarketStatus; category?: string }
): Promise<Market[]>
```

Fetch all markets with optional filters.

**Example:**

```typescript
// Get all markets
const markets = await client.markets.getAllMarkets('BNB');

// Get only open markets
const openMarkets = await client.markets.getAllMarkets('BNB', {
  status: MarketStatus.Open
});

// Get markets by category
const cryptoMarkets = await client.markets.getAllMarkets('BNB', {
  category: 'CRYPTO'
});
```

### getMarket

```typescript
async getMarket(id: number, token: 'BNB' | 'PDX'): Promise<Market | null>
```

Get single market by ID.

### createMarket

```typescript
async createMarket(
  params: CreateMarketParams,
  token: 'BNB' | 'PDX'
): Promise<number>
```

Create a new prediction market. Requires signer.

**Parameters:**

```typescript
interface CreateMarketParams {
  question: string;
  category?: string;
  endTime: number; // Unix timestamp
  initialYes: string; // Amount in BNB/PDX
  initialNo: string; // Amount in BNB/PDX
}
```

**Returns:** Market ID

### validateMarket

```typescript
async validateMarket(params: CreateMarketParams): Promise<ValidationResponse>
```

Validate market question with AI before creating.

---

## TradingAPI

Access via `client.trading`

### buyYes

```typescript
async buyYes(
  marketId: number,
  amount: string,
  token: 'BNB' | 'PDX',
  minOut?: string
): Promise<string>
```

Buy YES tokens. Requires signer.

**Returns:** Transaction hash

### buyNo

```typescript
async buyNo(
  marketId: number,
  amount: string,
  token: 'BNB' | 'PDX',
  minOut?: string
): Promise<string>
```

Buy NO tokens. Requires signer.

### sellYes / sellNo

```typescript
async sellYes(marketId: number, tokenAmount: string, token: 'BNB' | 'PDX', minOut?: string): Promise<string>
async sellNo(marketId: number, tokenAmount: string, token: 'BNB' | 'PDX', minOut?: string): Promise<string>
```

Sell outcome tokens.

### getUserPositions

```typescript
async getUserPositions(userAddress: string, token: 'BNB' | 'PDX'): Promise<Position[]>
```

Get all positions for a user.

---

## AccountAPI

Access via `client.accounts`

### getUserStats

```typescript
async getUserStats(userAddress: string, token: 'BNB' | 'PDX'): Promise<UserStats>
```

Get user statistics including total invested, P&L, etc.

### getBNBBalance / getPDXBalance

```typescript
async getBNBBalance(userAddress: string): Promise<string>
async getPDXBalance(userAddress: string): Promise<string>
```

Get token balances.

---

## Types

### Market

```typescript
interface Market {
  id: number;
  creator: string;
  question: string;
  category: string;
  endTime: number;
  status: MarketStatus;
  outcome: Outcome;
  yesToken: string;
  noToken: string;
  yesPool: string;
  noPool: string;
  totalBacking: string;
  paymentToken: 'BNB' | 'PDX';
  yesPrice?: number;
  noPrice?: number;
}
```

### Position

```typescript
interface Position {
  marketId: number;
  yesBalance: string;
  noBalance: string;
  totalInvested: string;
}
```

### Enums

```typescript
enum MarketStatus {
  Open = 0,
  Closed = 1,
  ResolutionRequested = 2,
  Resolved = 3,
  Disputed = 4,
}

enum Outcome {
  Undecided = 0,
  Yes = 1,
  No = 2,
}
```
