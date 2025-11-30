# Contract Address Migration Summary

## Old vs New Contract Addresses

### BNB Market Contracts
- **Old BNB Market**: `0xd8E0D86F14b76b79Cc160534Eb9ECeDDf28632f1` (DEPRECATED)
- **New BNB Market**: `0x12FD6C9B618949d940806B0E59e3c65507eC37E8` ✅ CURRENT

- **Old BNB Helper**: Various old addresses (DEPRECATED)  
- **New BNB Helper**: `0xC940106a30742F21daE111d41e8F41d482feda15` ✅ CURRENT

### PDX Market Contracts
- **Old PDX Market**: `0xD306247522C299563A1fD853638023E72B1F760F` (DEPRECATED)
- **New PDX Market**: `0x7d46139e1513571f19c9B87cE9A01D21cA9ef665` ✅ CURRENT

- **Old PDX Helper**: `0x19eCc539BB79EaaAb28bF95fa3C344E12FEFE07d` (DEPRECATED)
- **New PDX Helper**: `0x0CCaDd82A453075B8C0193809cC3693ef58E46D1` ✅ CURRENT

### Token Contracts
- **PDX Token**: `0xeE943aCCAa07ED556DfAc9d3a76015050fA78BC8` ✅ (Unchanged)

### Marketplace Contract
- **Old Marketplace**: `0xeC6B4D31324d3dbE59382fF39139Fa236299841B` (DEPRECATED)
- **Custodial Marketplace**: `0x41ccafD6242A35cE3fBBe75fc21a3A72dC7bBF53` ✅ CURRENT

## Deployment Information
- **Network**: BSC Testnet
- **Chain ID**: 97
- **Latest Deployment**: 2025-11-23T19:05:09.065Z
- **Deployment File**: `Backend/deployments/deployment-1763924709065.json`

## Files Updated
1. ✅ `Frontend/.env.local` - Updated with all new addresses
2. ✅ `Frontend/lib/web3/config.ts` - Refactored to use environment variables
3. ✅ `Backend/scripts/deploy-custodial-marketplace.ts` - Updated BNB market address
4. ✅ `Backend/scripts/helperDeploy.ts` - Updated BNB market address

## Configuration
All contract addresses are now centralized in `Frontend/.env.local`:
```bash
NEXT_PUBLIC_PREDICTION_MARKET_ADDRESS=0x12FD6C9B618949d940806B0E59e3c65507eC37E8
NEXT_PUBLIC_HELPER_CONTRACT_ADDRESS=0xC940106a30742F21daE111d41e8F41d482feda15
NEXT_PUBLIC_PDX_MARKET_ADDRESS=0x7d46139e1513571f19c9B87cE9A01D21cA9ef665
NEXT_PUBLIC_PDX_HELPER_ADDRESS=0x0CCaDd82A453075B8C0193809cC3693ef58E46D1
NEXT_PUBLIC_PDX_TOKEN_ADDRESS=0xeE943aCCAa07ED556DfAc9d3a76015050fA78BC8
NEXT_PUBLIC_CUSTODIAL_MARKETPLACE_ADDRESS=0x41ccafD6242A35cE3fBBe75fc21a3A72dC7bBF53
```

## Old Deployment Files (For Reference Only)
- `Backend/deployments/deployment-1763911938145.json` - Contains old addresses from 2025-11-23T15:32:18

## Important Notes
- All frontend code now reads addresses from environment variables via `process.env`
- No hardcoded addresses remain in the codebase
- The old deployment file is kept for historical reference but should NOT be used
- Always use the latest deployment file: `deployment-1763924709065.json`
