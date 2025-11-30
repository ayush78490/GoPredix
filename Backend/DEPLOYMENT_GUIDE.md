# 🚀 Complete Contract Redeployment Guide

## Overview
This document outlines the complete redeployment of all prediction market contracts with corrected ABIs and configurations.

## Contracts Being Deployed

### 1. **BNB Prediction Market** (`PredictionMarketWithMultipliers`)
- Main contract for BNB-based prediction markets
- Features: Market creation, trading, liquidity provision, resolution
- **Key Fix**: Removed `category` parameter from `createMarket` function

### 2. **BNB Helper Contract** (`PredictionMarketHelper`)
- Provides view functions and batch operations
- Calculates multipliers, prices, and trading info
- User position tracking

### 3. **PDX Token** (`GPXToken`)
- ERC-20 token for PDX-based markets
- Initial supply minted to deployer
- Faucet-compatible

### 4. **PDX Faucet** (`PDXFaucet`)
- Allows users to claim test PDX tokens
- 10M PDX allocated for testing

### 5. **PDX Prediction Market** (`PDXPredictionMarket`)
- PDX token-based prediction markets
- Same functionality as BNB markets but uses PDX

### 6. **PDX Helper Contract** (`PDXPredictionMarketHelper`)
- Helper functions for PDX markets
- Mirrors BNB helper functionality

### 7. **Custodial Marketplace** (`CustodialMarketplace`)
- Enables market creators to sell their markets
- Three-step process: Initialize → Transfer → Confirm
- 2% marketplace fee

## Key Changes from Previous Deployment

### Contract Modifications
1. **Bazar.sol (BNB Prediction Market)**:
   - Removed `category` parameter from `createMarket()`
   - Updated function signature to 4 parameters
   - Default category set to empty string

2. **ABI Updates**:
   - Removed `category` from `createMarket` function
   - Changed `resolutionReason` from `string` to `bytes32`
   - Removed `disputeReason` from `markets` return values

### Frontend Integration
All ABIs will be automatically exported to:
```
Frontend/contracts/
├── abi.json (BNB Prediction Market)
├── helperAbi.json (BNB Helper)
├── pdxTokenAbi.json (PDX Token)
├── pdxBazarAbi.json (PDX Market)
├── pdxHelperAbi.json (PDX Helper)
└── custodialMarketplaceAbi.json (Marketplace)
```

## Configuration

### Contract Parameters
- **Fee BPS**: 50 (0.5%)
- **LP Fee BPS**: 7000 (70% to LPs)
- **Marketplace Fee**: 200 (2%)
- **Resolution Server**: Deployer address (configurable)

### Environment Variables
The `.env.local` file will be automatically updated with:
```
NEXT_PUBLIC_PREDICTION_MARKET_ADDRESS=<new_address>
NEXT_PUBLIC_HELPER_CONTRACT_ADDRESS=<new_address>
NEXT_PUBLIC_PDX_TOKEN_ADDRESS=<new_address>
NEXT_PUBLIC_PDX_FAUCET_ADDRESS=<new_address>
NEXT_PUBLIC_PDX_MARKET_ADDRESS=<new_address>
NEXT_PUBLIC_PDX_HELPER_CONTRACT_ADDRESS=<new_address>
NEXT_PUBLIC_CUSTODIAL_MARKETPLACE_ADDRESS=<new_address>
```

## Deployment Process

### Steps
1. ✅ Compile contracts
2. 🚀 Deploy BNB Prediction Market
3. 🚀 Deploy BNB Helper Contract
4. 🚀 Deploy PDX Token
5. 🚀 Deploy PDX Faucet
6. 💸 Transfer 10M PDX to faucet
7. 🚀 Deploy PDX Prediction Market
8. 🚀 Deploy PDX Helper Contract
9. 🚀 Deploy Custodial Marketplace
10. 💾 Save deployment info
11. 📝 Update frontend config
12. 📦 Export ABIs

### Verification
After deployment, verify:
- [ ] All contract addresses are populated
- [ ] Frontend `.env.local` is updated
- [ ] All ABI files are generated
- [ ] Deployment info saved to `deployments/latest.json`

## Post-Deployment Tasks

### 1. Restart Frontend
```bash
cd Frontend
npm run dev
```

### 2. Test PDX Faucet
```javascript
// Call faucet to get test tokens
await pdxFaucet.requestTokens()
```

### 3. Create Test Market
```javascript
// BNB Market
await predictionMarket.createMarket(
  "Will Bitcoin reach $100k by 2025?",
  endTime,
  initialYes,
  initialNo,
  { value: totalValue }
)
```

### 4. Test Trading
```javascript
// Buy YES tokens
await predictionMarket.buyYesWithBNBFor(
  marketId,
  userAddress,
  minYesOut,
  { value: bnbAmount }
)
```

## Troubleshooting

### Common Issues

1. **Gas Estimation Failed**
   - Ensure wallet has enough BNB
   - Check network connectivity
   - Verify contract parameters

2. **ABI Mismatch**
   - Ensure frontend is using latest ABIs
   - Clear cache and rebuild
   - Restart dev server

3. **Transaction Reverted**
   - Check liquidity requirements (min 0.01 BNB)
   - Verify end time is at least 1 hour in future
   - Ensure question length is 10-280 characters

## Testing Checklist

- [ ] Create BNB market
- [ ] Create PDX market  
- [ ] Buy YES/NO tokens
- [ ] Sell tokens
- [ ] Add liquidity
- [ ] Remove liquidity
- [ ] List market on marketplace
- [ ] Buy listed market
- [ ] Request resolution
- [ ] Claim redemption

## Files Modified

### Backend
- `contracts/Bazar.sol` - Removed category parameter
- `scripts/deploy-all.ts` - Comprehensive deployment script

### Frontend (Auto-updated)
- `.env.local` - Contract addresses
- `contracts/*.json` - All ABI files
- `hooks/use-predection-market.ts` - Already updated
- `components/createMarketModal.tsx` - Already updated

## Deployment Artifacts

All deployment information is saved to:
- `deployments/deployment-{timestamp}.json` - Timestamped record
- `deployments/latest.json` - Latest deployment
- `Frontend/.env.local` - Environment variables
- `Frontend/contracts/` - ABI exports

## Network Information

- **Network**: BSC Testnet
- **Chain ID**: 97
- **RPC URL**: https://data-seed-prebsc-1-s1.binance.org:8545
- **Explorer**: https://testnet.bscscan.com

## Support

If you encounter issues:
1. Check deployment logs in `deployment.log`
2. Review `deployments/latest.json` for addresses
3. Verify ABIs match deployed contracts
4. Ensure frontend `.env.local` is correct
5. Restart frontend server

---

**Last Updated**: 2025-11-30
**Status**: Deploying...
