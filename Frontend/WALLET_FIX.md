# 🔧 Quick Fix: Wallet Not Detecting

## Problem
MetaMask is installed but shows QR code instead of detecting the extension.

## Solution

### 1. Get WalletConnect Project ID (Free)
1. Go to https://cloud.walletconnect.com/
2. Sign in / Create account
3. Create new project: **GoPredix**
4. Copy your Project ID

### 2. Add to `.env.local`
```bash
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id_here
```

### 3. Restart Server
```bash
npm run dev
```

### 4. Clear Browser Cache
- F12 → Application → Clear site data
- Refresh page

## Done! ✅
Now MetaMask should be detected properly.

---

## For Production (Vercel)
Add the same Project ID to Vercel environment variables:
- Variable: `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID`
- Value: `your_project_id_here`
