# Cloudflare Worker - Auto Market Resolution

The Cloudflare Worker for automatic market resolution is now located in `Backend/src/cloudflare-worker/`.

## 📁 Structure

```
Backend/
├── src/
│   └── cloudflare-worker/
│       └── index.ts          # Worker code
├── wrangler.toml             # Cloudflare configuration
└── .dev.vars                 # Local environment variables (gitignored)
```

## 🚀 Quick Start

### Local Testing

```bash
cd Backend

# Create .dev.vars if it doesn't exist
cp .dev.vars.example .dev.vars
# Edit .dev.vars and add your RESOLVER_PRIVATE_KEY

# Start local dev server
npx wrangler dev

# In another terminal, test it:
curl http://localhost:8787/trigger \
  -H "Authorization: Bearer gopredix-test-secret-2024"
```

### Deploy to Cloudflare

```bash
cd Backend

# Login to Cloudflare
npx wrangler login

# Set secrets
npx wrangler secret put RESOLVER_PRIVATE_KEY
npx wrangler secret put CRON_SECRET

# Deploy
npx wrangler deploy
```

## ⚙️ Configuration

Edit `wrangler.toml` to configure:
- Cron schedule (default: every 5 minutes)
- RPC URL
- Contract addresses

## 📊 Monitoring

```bash
# View logs
npx wrangler tail

# Manual trigger (for testing)
curl https://gopredix-market-resolver.YOUR_SUBDOMAIN.workers.dev/trigger \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

## 🔄 How It Works

1. **Cron Trigger**: Runs every 5 minutes automatically
2. **Scans Markets**: Checks all BNB and PDX markets
3. **Auto-Resolves**: Calls `requestResolution()` for ended markets
4. **Logs Results**: View in Cloudflare dashboard or via `wrangler tail`
