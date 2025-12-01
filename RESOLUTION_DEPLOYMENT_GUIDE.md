# Complete Resolution System Deployment Guide

## 🎉 What Was Built

I've created a complete automated resolution system with 4 main components:

### 1. ✅ AI Resolution Endpoint (`/server/api/resolveMarket.js`)
- Uses OpenAI GPT-4 to determine market outcomes
- Searches for factual evidence
- Returns YES/NO with confidence score
- Provides sources and reasoning

### 2. ✅ Resolution Automation Service (`/server/services/resolutionService.js`)
- Monitors blockchain for markets needing resolution
- Polls every 60 seconds
- Automatically calls AI endpoint
- Submits resolution to smart contract

### 3. ✅ Frontend UI Component (`/Frontend/components/ResolutionPanel.tsx`)
- "Request Resolution" button (when market ends)
- "Claim Payout" button (for winners)
- Shows resolution status and outcome
- Displays confidence score and reasoning

### 4. ✅ Startup Script (`/server/start-resolution-service.js`)
- Starts both BNB and PDX resolution services
- Handles graceful shutdown
- Monitors both market types simultaneously

---

## 📋 Deployment Steps

### **Step 1: Set Up Environment Variables**

1. Copy the example file:
```bash
cd /home/ayu/Documents/Predection-Market/server
cp .env.example .env
```

2. Edit `.env` and fill in:
```bash
# Your OpenAI API key
OPEN_AI_API_KEY=sk-...

# BSC Testnet RPC (or use your own)
BSC_TESTNET_RPC_URL=https://data-seed-prebsc-1-s1.binance.org:8545

# IMPORTANT: Private key of the wallet set as resolutionServer in your contracts
RESOLUTION_SERVER_PRIVATE_KEY=0x...

# Your deployed contract addresses
BNB_PREDICTION_MARKET_ADDRESS=0x52Ca4B7673646B8b922ea00ccef6DD0375B14619
PDX_PREDICTION_MARKET_ADDRESS=0x03C3eDae35228bF970d30Bf77E9Dce3A88A3dB4B
```

**CRITICAL:** The `RESOLUTION_SERVER_PRIVATE_KEY` must be the same address that was set as `resolutionServer` when you deployed your contracts!

---

### **Step 2: Deploy AI Resolution Endpoint to Vercel**

1. The endpoint is already in `/server/api/resolveMarket.js`

2. Push to GitHub:
```bash
cd /home/ayu/Documents/Predection-Market
git add server/api/resolveMarket.js
git commit -m "Add AI resolution endpoint"
git push
```

3. Vercel will auto-deploy it to:
   `https://sigma-predection.vercel.app/api/resolveMarket`

4. Test it:
```bash
curl -X POST https://sigma-predection.vercel.app/api/resolveMarket \
  -H "Content-Type: application/json" \
  -d '{
    "question": "Will Bitcoin reach $100k by Dec 2025?",
    "endTime": 1735689600,
    "marketId": "0"
  }'
```

---

### **Step 3: Run Resolution Service Locally (Testing)**

1. Install dependencies:
```bash
cd /home/ayu/Documents/Predection-Market/server
npm install
```

2. Start the resolution service:
```bash
npm run resolution
```

You should see:
```
🚀 Starting Resolution Services...
✅ Connected to network: bsc-testnet (Chain ID: 97)
📊 Initializing BNB Market Resolution Service...
✅ BNB Market Resolution Service active
📊 Initializing PDX Market Resolution Service...
✅ PDX Market Resolution Service active
🎉 All resolution services started successfully!
📡 Monitoring blockchain for resolution requests...
```

3. The service will now:
   - Check for markets every 60 seconds
   - Automatically resolve markets when resolution is requested
   - Submit outcomes to the blockchain

---

### **Step 4: Deploy Resolution Service (Production)**

**Option A: Run on a VPS/Server**

1. SSH into your server
2. Clone your repo
3. Install dependencies
4. Set up environment variables
5. Run with PM2:
```bash
npm install -g pm2
pm2 start start-resolution-service.js --name "resolution-service"
pm2 save
pm2 startup
```

**Option B: Run on Railway/Render**

1. Create new service on Railway.app or Render.com
2. Connect your GitHub repo
3. Set environment variables in dashboard
4. Set start command: `npm run resolution`
5. Deploy!

**Option C: Run Locally (Simple)**

Just keep the terminal running:
```bash
cd /home/ayu/Documents/Predection-Market/server
npm run resolution
```

---

### **Step 5: Add Frontend UI**

The `ResolutionPanel` component is already created. Now you need to add it to your market detail page.

**Edit `/Frontend/app/markets/[slug]/page.tsx`:**

1. Import the component at the top:
```typescript
import { ResolutionPanel } from '@/components/ResolutionPanel'
```

2. Add it to the page (after the trading section):
```typescript
{/* Resolution Panel */}
<ResolutionPanel
  marketId={market.numericId}
  status={market.status}
  outcome={market.outcome}
  endTime={market.endTime}
  paymentToken={market.paymentToken}
  yesBalance={positions?.yesBalance || '0'}
  noBalance={positions?.noBalance || '0'}
  resolutionConfidence={market.resolutionConfidence}
  resolutionReason={market.resolutionReason}
/>
```

---

### **Step 6: Test the Complete Flow**

1. **Create a test market** that ends in 1 minute
2. **Wait for market to end**
3. **Click "Request Resolution"** button
4. **Watch the logs** in your resolution service terminal
5. **See the market resolve** automatically
6. **Click "Claim Payout"** if you're a winner

---

## 🔧 Troubleshooting

### **Issue: Resolution service can't connect to blockchain**
**Solution:** Check your `BSC_TESTNET_RPC_URL` is correct

### **Issue: "not resolution server" error**
**Solution:** The private key in `.env` doesn't match the `resolutionServer` address set in your contract. Check with:
```bash
# Get address from private key
node -e "const ethers = require('ethers'); const wallet = new ethers.Wallet('YOUR_PRIVATE_KEY'); console.log(wallet.address)"
```

### **Issue: AI resolution returns low confidence**
**Solution:** This is normal for ambiguous questions. The service won't resolve markets with <70% confidence.

### **Issue: Markets not resolving automatically**
**Solution:** 
1. Check resolution service is running
2. Check logs for errors
3. Verify someone called `requestResolution()` first

---

## 📊 How It Works

```
1. Market ends
   ↓
2. User clicks "Request Resolution" (or cron job does it)
   ↓
3. Contract status → ResolutionRequested
   ↓
4. Resolution service detects it (polls every 60s)
   ↓
5. Service calls AI endpoint with question
   ↓
6. AI searches knowledge base and determines outcome
   ↓
7. AI returns: { outcome: 1 or 2, confidence: 85%, reason: "..." }
   ↓
8. Service calls contract.resolveMarket(marketId, outcome, reason, confidence)
   ↓
9. Contract status → Resolved
   ↓
10. Winners see "Claim Payout" button
   ↓
11. Winners click and receive funds!
```

---

## 🚀 Quick Start Commands

```bash
# 1. Set up environment
cd /home/ayu/Documents/Predection-Market/server
cp .env.example .env
# Edit .env with your keys

# 2. Install dependencies
npm install

# 3. Test AI endpoint locally
node -e "require('./api/resolveMarket')({ method: 'POST', body: { question: 'Test?', endTime: Date.now()/1000, marketId: 0 } }, { setHeader: ()=>{}, status: (s)=>({ json: console.log, end: ()=>{} }) })"

# 4. Start resolution service
npm run resolution

# 5. In another terminal, deploy to Vercel
git add .
git commit -m "Add complete resolution system"
git push
```

---

## ✅ Checklist

- [ ] Set up `.env` file with all required variables
- [ ] Verify `RESOLUTION_SERVER_PRIVATE_KEY` matches contract's `resolutionServer`
- [ ] Deploy AI endpoint to Vercel
- [ ] Test AI endpoint with curl
- [ ] Start resolution service locally
- [ ] Add `ResolutionPanel` to market detail page
- [ ] Create a test market and verify full flow
- [ ] Deploy resolution service to production (VPS/Railway/Render)
- [ ] Set up monitoring/alerts for the service

---

## 🎯 Next Steps

1. **Test thoroughly** with real markets
2. **Monitor the service** for errors
3. **Add cron job** to auto-request resolution (optional)
4. **Set up alerts** if service goes down
5. **Add dispute functionality** (future enhancement)

---

## 📞 Support

If you encounter issues:
1. Check the resolution service logs
2. Verify environment variables
3. Test AI endpoint manually
4. Check contract addresses are correct
5. Ensure wallet has BNB for gas fees

The system is now complete and ready to use! 🎉
