# Auto-Resolution Service Configuration

## Production Setup

The auto-resolution service is now deployed as a **Cloudflare Worker** that runs automatically every 5 minutes.

### Cloudflare Worker URL
```
https://auto-resolution-worker.tarunsingh78490.workers.dev
```

### What It Does
- Scans all BNB and PDX markets every 5 minutes
- Calls `requestResolution()` for ended markets
- Calls AI resolution API (`https://sigma-predection.vercel.app/api/resolveMarket`)
- Calls `resolveMarket()` on-chain with AI result

### Environment Variables

The Cloudflare Worker uses these secrets (already configured):
- `RESOLVER_PRIVATE_KEY` - Wallet for gas fees
- `RPC_URL` - BSC Testnet RPC
- `RESOLUTION_API_URL` - AI resolution API
- `BNB_MARKET_ADDRESS` - BNB market contract
- `PDX_MARKET_ADDRESS` - PDX market contract

### Monitoring

View live logs:
```bash
cd Backend
wrangler tail --config wrangler-auto-resolution.toml
```

Test manually:
```bash
curl https://auto-resolution-worker.tarunsingh78490.workers.dev
```

### Local Development

For local testing, the old `auto-resolution-monitor.ts` script can still be used:
```bash
cd Backend
npx ts-node scripts/auto-resolution-monitor.ts
```

But in production, the **Cloudflare Worker handles everything automatically** - no manual intervention needed!
