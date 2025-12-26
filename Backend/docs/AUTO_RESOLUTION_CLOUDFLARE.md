# Auto-Resolution Cloudflare Worker Deployment Guide

## Overview

This Cloudflare Worker automatically resolves prediction markets by:
1. Scanning all BNB and PDX markets every 5 minutes
2. Calling `requestResolution()` for markets that have ended
3. Calling the AI resolution API to get the outcome
4. Calling `resolveMarket()` on-chain with the AI result

## Prerequisites

- Cloudflare account
- Wrangler CLI installed: `npm install -g wrangler`
- Resolver wallet with BNB for gas fees
- AI resolution API deployed (Vercel/Cloudflare)

## Setup

### 1. Install Dependencies

```bash
cd Backend
npm install
```

### 2. Login to Cloudflare

```bash
wrangler login
```

### 3. Set Environment Secrets

```bash
# Set resolver private key
wrangler secret put RESOLVER_PRIVATE_KEY --config wrangler-auto-resolution.toml

# Set RPC URL
wrangler secret put RPC_URL --config wrangler-auto-resolution.toml

# Set AI resolution API URL
wrangler secret put RESOLUTION_API_URL --config wrangler-auto-resolution.toml

# Set BNB market address
wrangler secret put BNB_MARKET_ADDRESS --config wrangler-auto-resolution.toml

# Set PDX market address
wrangler secret put PDX_MARKET_ADDRESS --config wrangler-auto-resolution.toml
```

**Example values**:
- `RESOLVER_PRIVATE_KEY`: Your wallet private key (with BNB for gas)
- `RPC_URL`: `https://bsc-testnet-rpc.publicnode.com`
- `RESOLUTION_API_URL`: `https://your-api.vercel.app/api/resolveMarket`
- `BNB_MARKET_ADDRESS`: `0x90FD905aB1F479399117F6EB6b3e3E58f94e26f1`
- `PDX_MARKET_ADDRESS`: `0x151fE04C421E197B982A4F62a65Acd6F416af51a`

### 4. Deploy Worker

```bash
wrangler deploy --config wrangler-auto-resolution.toml
```

## Verification

### Check Cron Status

1. Go to Cloudflare Dashboard
2. Navigate to Workers & Pages
3. Click on `auto-resolution-worker`
4. Go to "Triggers" tab
5. Verify cron schedule is active: `*/5 * * * *`

### View Logs

```bash
wrangler tail --config wrangler-auto-resolution.toml
```

Or in Cloudflare Dashboard:
1. Go to your worker
2. Click "Logs" tab
3. Enable "Real-time Logs"

### Manual Trigger (Testing)

```bash
curl https://auto-resolution-worker.tarunsingh78490.workers.dev
```

**Deployed Worker URL**: https://auto-resolution-worker.tarunsingh78490.workers.dev

## How It Works

### Cron Execution (Every 5 Minutes)

1. **Scan Markets**: Fetches all BNB and PDX markets
2. **Request Resolution**: For markets with `status=0` and `endTime <= now`
   - Calls `requestResolution()` on-chain
   - Changes status from 0 → 2
3. **AI Resolution**: For markets with `status=2`
   - Calls AI resolution API with market question and end time
   - Gets outcome (1=YES, 2=NO) and confidence score
4. **On-Chain Resolution**: If AI confidence >= 70%
   - Calls `resolveMarket()` on-chain
   - Changes status from 2 → 3
   - Sets outcome and resolution reason

### Expected Logs

```
⏰ Cron triggered at: 2024-12-24T14:30:00.000Z
🔍 Scanning 6 BNB markets and 1 PDX markets...
📍 BNB Market 5: Requesting resolution...
✅ BNB Market 5: Resolution requested
🤖 BNB Market 5: Calling AI resolution API...
📊 BNB Market 5: AI Result - Outcome: 2, Confidence: 75%
✅ BNB Market 5: Resolved on-chain!
✨ Scan complete: 1 markets fully resolved
```

## Troubleshooting

### Worker Not Running

- Check cron trigger is enabled in Cloudflare Dashboard
- Verify secrets are set correctly
- Check worker logs for errors

### Markets Not Resolving

- Verify resolver wallet has BNB for gas
- Check AI resolution API is accessible
- Ensure market contract addresses are correct
- Check RPC URL is working

### Low AI Confidence

- AI will only resolve if confidence >= 70%
- Check AI API logs for reasoning
- Market questions should be clear and verifiable

## Monitoring

### Key Metrics

- **Cron Executions**: Should run every 5 minutes
- **Markets Resolved**: Track how many markets are auto-resolved
- **AI Confidence**: Monitor average confidence scores
- **Gas Usage**: Track resolver wallet balance

### Alerts

Set up Cloudflare alerts for:
- Worker errors
- High execution time
- Failed cron triggers

## Cost

- **Cloudflare Workers**: Free tier includes 100,000 requests/day
- **Cron Triggers**: Included in free tier
- **Gas Fees**: ~0.001 BNB per resolution (fund resolver wallet)

## Updating

To update the worker:

```bash
# Make changes to auto-resolution-worker.ts
wrangler deploy --config wrangler-auto-resolution.toml
```

## Stopping

To disable auto-resolution:

```bash
# Remove cron trigger
wrangler triggers delete auto-resolution-worker
```

Or disable in Cloudflare Dashboard → Worker → Triggers → Disable Cron
