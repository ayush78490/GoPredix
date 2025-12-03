# Duplicate Market Detection - Quick Reference

## What Was Added

**File Modified:** `api/validateMarket.js`

**New Features:**
1. ✅ Checks if market already exists on blockchain (BNB & PDX contracts)
2. ✅ Detects exact duplicates (normalized text matching)
3. ✅ Detects similar questions (>90% similarity using Levenshtein distance)
4. ✅ AI-powered intent detection (prevents rephrased duplicates)
5. ✅ 5-minute caching to reduce blockchain RPC calls

## Cloudflare Deployment

**Requirements:**
Set these environment variables in Cloudflare Dashboard:
- `OPEN_AI_API_KEY`
- `BSC_TESTNET_RPC_URL`
- `BNB_PREDICTION_MARKET_ADDRESS`
- `PDX_PREDICTION_MARKET_ADDRESS`

**Deploy:**
```bash
npx wrangler deploy
```

## API Response

**When duplicate detected:**
```json
{
  "valid": false,
  "isDuplicate": true,
  "reason": "This market already exists: \"...\" (Market ID: X, Type: BNB/PDX)",
  "existingMarket": { "id": X, "question": "...", "type": "BNB" }
}
```

**When unique:**
```json
{
  "valid": true,
  "isDuplicate": false,
  "category": "CRYPTO",
  ...
}
```

## How It Works

1. **Fetch existing markets** from both BNB and PDX contracts
2. **Normalize questions** (lowercase, remove punctuation)
3. **Check exact match** - instant rejection if found
4. **Calculate similarity** - reject if >90% similar
5. **AI intent check** - for 50-90% similar questions, use OpenAI to detect same intent
6. **Cache results** for 5 minutes to optimize performance

## Testing

```bash
# Test existing endpoints
node test-validation-api.js
node test-resolution-api.js
```
