# Market Resolution & Payout Flow

## Overview
Both BNB and PDX markets follow a similar 3-step resolution process with a dispute period for fairness.

---

## 📋 Resolution Process

### **Step 1: Request Resolution** 
**Who:** Anyone (any user)  
**When:** After market end time has passed  
**Function:** `requestResolution(marketId, reason)`

```solidity
// BNB: Bazar.sol lines 541-553
// PDX: PDXbazar.sol lines 568-580

function requestResolution(uint256 id, string calldata reason) external {
    Market storage m = markets[id];
    require(m.status == MarketStatus.Open, "not open");
    require(block.timestamp >= m.endTime, "not ended");  // ✅ Must wait until market ends
    
    m.status = MarketStatus.ResolutionRequested;
    m.resolutionRequestedAt = block.timestamp;
    m.resolutionRequester = msg.sender;
    m.resolutionReason = reason;
    m.disputeDeadline = block.timestamp + DISPUTE_PERIOD;  // 7 days
    
    emit ResolutionRequested(id, msg.sender, block.timestamp);
}
```

**What happens:**
- Market status changes from `Open` → `ResolutionRequested`
- A 7-day dispute period begins
- Anyone can request resolution, but only the resolution server can actually resolve it

---

### **Step 2: Resolve Market**
**Who:** Resolution Server ONLY (authorized AI/oracle)  
**When:** After resolution is requested  
**Function:** `resolveMarket(marketId, outcomeIndex, reason, confidence)`

```solidity
// BNB: Bazar.sol lines 555-566
// PDX: PDXbazar.sol lines 582-593

function resolveMarket(uint256 id, uint8 outcomeIndex, string calldata reason, uint256 confidence) 
    external onlyServer {
    
    Market storage m = markets[id];
    require(m.status == MarketStatus.ResolutionRequested, "not requested");
    require(outcomeIndex <= 2, "invalid outcome");  // 0=Undecided, 1=Yes, 2=No
    
    m.outcome = Outcome(outcomeIndex);
    m.status = MarketStatus.Resolved;
    m.resolutionReason = reason;
    m.resolutionConfidence = confidence;
    
    emit MarketResolved(id, m.outcome, reason, confidence, msg.sender);
}
```

**Outcomes:**
- `0` = Undecided (shouldn't happen)
- `1` = YES wins
- `2` = NO wins

**What happens:**
- Market status changes from `ResolutionRequested` → `Resolved`
- Outcome is set (YES or NO)
- Resolution reason and confidence score are stored

---

### **Step 3: Claim Payout**
**Who:** Token holders (winners)  
**When:** After market is resolved  
**Function:** `claimRedemption(marketId)`

```solidity
// BNB: Bazar.sol lines 568-586
function claimRedemption(uint256 id) external nonReentrant {
    Market storage m = markets[id];
    require(m.status == MarketStatus.Resolved, "not resolved");
    
    uint256 yesTokens = m.yesToken.balanceOf(msg.sender);
    uint256 noTokens = m.noToken.balanceOf(msg.sender);
    
    if (m.outcome == Outcome.Yes) {
        require(yesTokens > 0, "no YES tokens");
        m.yesToken.burn(msg.sender, yesTokens);
        _transferBNB(msg.sender, yesTokens);  // 1:1 redemption
        emit RedemptionClaimed(id, msg.sender, yesTokens);
    } else if (m.outcome == Outcome.No) {
        require(noTokens > 0, "no NO tokens");
        m.noToken.burn(msg.sender, noTokens);
        _transferBNB(msg.sender, noTokens);  // 1:1 redemption
        emit RedemptionClaimed(id, msg.sender, noTokens);
    }
}

// PDX: PDXbazar.sol lines 595-613 (same logic, but transfers PDX instead of BNB)
```

**Payout Logic:**
- **If YES wins:** YES token holders redeem 1:1 (1 YES token = 1 BNB/PDX)
- **If NO wins:** NO token holders redeem 1:1 (1 NO token = 1 BNB/PDX)
- **Losers:** Get nothing (their tokens become worthless)
- Tokens are burned when redeemed

---

## 💰 Payout Examples

### Example 1: Simple Case
**Market:** "Will Bitcoin reach $100k by Dec 2025?"  
**Total Pool:** 100 BNB (60 BNB in YES pool, 40 BNB in NO pool)

**Alice's Position:**
- Bought 10 YES tokens for 5 BNB (got 2x multiplier)

**Bob's Position:**
- Bought 5 NO tokens for 3 BNB (got 1.67x multiplier)

**Outcome:** Bitcoin reaches $100k → **YES wins**

**Payouts:**
- **Alice:** Burns 10 YES tokens → Receives 10 BNB (profit: 5 BNB = 100% gain)
- **Bob:** Has 5 NO tokens → Worth 0 BNB (loss: 3 BNB = -100%)

---

### Example 2: Complex Case
**Market:** "Will TON reach 50M users by Dec 2025?"  
**Total Pool:** 200 PDX

**Charlie's trades:**
1. Bought 20 YES tokens for 8 PDX (2.5x multiplier)
2. Bought 10 NO tokens for 6 PDX (1.67x multiplier)
3. Total invested: 14 PDX

**Outcome:** TON reaches 50M users → **YES wins**

**Charlie's Payout:**
- Burns 20 YES tokens → Receives 20 PDX
- 10 NO tokens become worthless
- **Net profit:** 20 - 14 = 6 PDX (43% gain)

---

## 🔐 Security Features

### 1. **Dispute Period (7 days)**
- After resolution is requested, there's a 7-day window
- During this time, users can dispute if they believe the outcome is wrong
- Prevents rushed or incorrect resolutions

### 2. **Only Resolution Server Can Resolve**
```solidity
modifier onlyServer() {
    require(msg.sender == resolutionServer, "not resolution server");
    _;
}
```
- Prevents random users from resolving markets
- Resolution server is an AI/oracle that verifies outcomes

### 3. **Reentrancy Protection**
```solidity
modifier nonReentrant() {
    require(_lock == 1, "reentrancy");
    _lock = 2;
    _;
    _lock = 1;
}
```
- Prevents reentrancy attacks during payout claims

### 4. **Token Burning**
- Winning tokens are burned when redeemed
- Prevents double-claiming
- Ensures 1:1 payout ratio

---

## 🎯 Complete Flow Diagram

```
Market Created
    ↓
Trading Happens (users buy YES/NO tokens)
    ↓
Market End Time Passes
    ↓
[Step 1] Anyone calls requestResolution()
    ↓
Status: Open → ResolutionRequested
    ↓
7-day dispute period begins
    ↓
[Step 2] Resolution Server calls resolveMarket(outcome)
    ↓
Status: ResolutionRequested → Resolved
Outcome set to YES or NO
    ↓
[Step 3] Winners call claimRedemption()
    ↓
- Burn winning tokens
- Transfer BNB/PDX 1:1
- Losers get nothing
    ↓
Market Fully Settled ✅
```

---

## ⚠️ Important Notes

### **For Winners:**
1. ✅ You MUST call `claimRedemption()` to get your payout
2. ✅ Payout is 1:1 (1 winning token = 1 BNB/PDX)
3. ✅ Your tokens are burned when you claim
4. ✅ You can claim anytime after resolution (no deadline)

### **For Losers:**
1. ❌ Losing tokens become worthless
2. ❌ No refunds or partial payouts
3. ❌ Cannot claim anything

### **For Market Creators:**
1. 💰 Platform fees are collected during trading
2. 💰 Creator fees (if any) are paid during each trade
3. 💰 No additional fees during resolution/payout

---

## 🔧 Frontend Integration

To implement resolution UI, you need:

### 1. **Check if market can be resolved:**
```typescript
const canResolve = market.status === 0 && Date.now() / 1000 >= market.endTime
```

### 2. **Request resolution:**
```typescript
await contract.requestResolution(marketId, "Market ended, requesting resolution")
```

### 3. **Check resolution status:**
```typescript
const isResolved = market.status === 3  // MarketStatus.Resolved
```

### 4. **Claim payout:**
```typescript
// Check if user has winning tokens
const hasWinningTokens = market.outcome === 1 
    ? yesBalance > 0 
    : noBalance > 0

if (hasWinningTokens) {
    await contract.claimRedemption(marketId)
}
```

---

## 📊 Current Status

**Resolution Server Address:**
- BNB Markets: Check `resolutionServer` in deployed contract
- PDX Markets: Check `resolutionServer` in deployed contract

**Dispute Period:** 7 days (604,800 seconds)

**Minimum Liquidity:**
- BNB: 0.01 BNB
- PDX: 100 PDX

---

## 🚀 Next Steps

To fully implement resolution:

1. **Backend:** Set up resolution server (AI/oracle) to monitor markets
2. **Frontend:** Add UI for:
   - Requesting resolution
   - Viewing resolution status
   - Claiming payouts
3. **Automation:** Cron job to auto-request resolution when markets end
4. **Notifications:** Alert users when markets are resolved

