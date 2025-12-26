# Production Deployment URLs

## Cloudflare Workers

### Auto-Resolution Worker
- **URL**: https://auto-resolution-worker.tarunsingh78490.workers.dev
- **Purpose**: Automatically resolves prediction markets every 5 minutes
- **Cron Schedule**: `*/5 * * * *` (every 5 minutes)
- **Status**: ✅ Active and running
- **Deployed**: 2025-12-24

**Features**:
- Scans all BNB and PDX markets
- Calls `requestResolution()` for ended markets
- Calls AI resolution API
- Calls `resolveMarket()` on-chain with AI result

**Test**:
```bash
curl https://auto-resolution-worker.tarunsingh78490.workers.dev
```

**Monitor**:
```bash
wrangler tail --config wrangler-auto-resolution.toml
```

## Vercel Deployments

### AI Resolution API
- **URL**: https://sigma-predection.vercel.app/api/resolveMarket
- **Purpose**: AI-powered market outcome determination
- **Status**: ✅ Active

### Frontend
- **URL**: https://www.gopredix.xyz
- **Status**: ✅ Active

## Environment Variables

### Cloudflare Worker Secrets
- `RESOLVER_PRIVATE_KEY`: Wallet private key for gas fees
- `RPC_URL`: https://bsc-testnet-rpc.publicnode.com
- `RESOLUTION_API_URL`: https://sigma-predection.vercel.app/api/resolveMarket
- `BNB_MARKET_ADDRESS`: 0x90FD905aB1F479399117F6EB6b3e3E58f94e26f1
- `PDX_MARKET_ADDRESS`: 0x151fE04C421E197B982A4F62a65Acd6F416af51a

## Monitoring

### Cloudflare Dashboard
- Workers & Pages → auto-resolution-worker
- View logs, metrics, and cron execution history

### Manual Testing
```bash
# Test auto-resolution worker
curl https://auto-resolution-worker.tarunsingh78490.workers.dev

# Expected response
{
  "success": true,
  "timestamp": "2025-12-24T16:31:38.362Z",
  "results": [...],
  "resolvedCount": 0
}
```
