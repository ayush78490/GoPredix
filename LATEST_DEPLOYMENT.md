# Contract Deployment Log - Latest Update

## ✅ NEW CUSTODIAL MARKETPLACE DEPLOYED

**Deployment Date**: 2025-11-30T04:40:00+05:30
**Network**: BSC Testnet (Chain ID: 97)

### New Marketplace Contract
- **Address**: `0x8fc69AF69fd9Db85C4caA7A9D62170D7f2C919c5`
- **Points To**: New BNB Market (`0x12FD6C9B618949d940806B0E59e3c65507eC37E8`)
- **PDX Token**: `0xeE943aCCAa07ED556DfAc9d3a76015050fA78BC8`
- **Fee**: 2.5% (250 BPS)

### All Current Contract Addresses

#### BNB Market Contracts
- **BNB Market**: `0x12FD6C9B618949d940806B0E59e3c65507eC37E8` ✅
- **BNB Helper**: `0xC940106a30742F21daE111d41e8F41d482feda15` ✅

#### PDX Market Contracts
- **PDX Market**: `0x7d46139e1513571f19c9B87cE9A01D21cA9ef665` ✅
- **PDX Helper**: `0x0CCaDd82A453075B8C0193809cC3693ef58E46D1` ✅

#### Token
- **PDX Token**: `0xeE943aCCAa07ED556DfAc9d3a76015050fA78BC8` ✅

#### Marketplace
- **Custodial Marketplace**: `0x8fc69AF69fd9Db85C4caA7A9D62170D7f2C919c5` ✅ **NEWLY DEPLOYED**

### Previous Marketplace (Deprecated)
- **Old Address**: `0x41ccafD6242A35cE3fBBe75fc21a3A72dC7bBF53` ❌
- **Status**: DEPRECATED - Points to old BNB contract
- **Action**: No longer in use

### Important Notes
1. ✅ The new marketplace now correctly points to the NEW BNB market contract
2. ✅ You can now list markets created on the NEW BNB contract
3. ❌ Markets created on the OLD BNB contract (`0xd8E0D86F14b76b79Cc160534Eb9ECeDDf28632f1`) will NOT work with this marketplace
4. 🔄 **Action Required**: Restart your frontend dev server for changes to take effect

### Verification
- Transaction Hash: Check BSCScan Testnet
- Block Explorer: https://testnet.bscscan.com/address/0x8fc69AF69fd9Db85C4caA7A9D62170D7f2C919c5
