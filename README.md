# 🎯 GoPredix - Decentralized Prediction Markets

**GoPredix** is a decentralized prediction market platform built on BNB Smart Chain Testnet, enabling users to create and trade on prediction markets for real-world events.

[![Live Demo](https://img.shields.io/badge/Live-www.gopredix.xyz-blue)](https://www.gopredix.xyz)
[![BNB Chain](https://img.shields.io/badge/Network-BNB%20Testnet-yellow)](https://testnet.bscscan.com/)
[![License](https://img.shields.io/badge/License-MIT-green)](LICENSE)

---

## 📖 What is GoPredix?

GoPredix is a **decentralized prediction market** where users can:

- **Create Markets** - Pose yes/no questions about future events
- **Trade Positions** - Buy YES or NO tokens based on your predictions
- **Earn Rewards** - Profit from accurate predictions when markets resolve
- **Provide Liquidity** - Support markets and earn fees from trades

Markets use an **Automated Market Maker (AMM)** with a constant product formula, ensuring continuous liquidity and dynamic pricing based on supply and demand.

---

## 🌟 Key Features

### For Traders
- **Dual Token Support** - Trade with BNB or PDX tokens
- **Real-time Pricing** - Dynamic odds based on market sentiment
- **Low Fees** - 0.5% trading fee on all transactions
- **Instant Settlement** - Claim winnings immediately after market resolution

### For Market Creators
- **AI-Powered Validation** - Automatic question quality checks
- **Flexible Duration** - Set custom market end times
- **Initial Liquidity** - Seed markets with your own capital
- **Creator Incentives** - Earn from market activity

### Platform Features
- **Twitter Integration** - Connect your social identity
- **Leaderboard** - Track top traders and market creators
- **PDX Faucet** - Get free test tokens to start trading
- **Mobile Responsive** - Trade on any device
- **Wallet Support** - MetaMask, WalletConnect, and more

---

## 🏗️ Architecture

### Smart Contracts (Solidity)
- **PredictionMarket.sol** - Core market logic with BNB payments
- **PDXPredictionMarket.sol** - PDX token-based markets
- **HelperContracts** - View functions and market queries
- **PDXFaucet.sol** - Test token distribution

### Frontend (Next.js)
- **React 18** with TypeScript
- **RainbowKit** for wallet connections
- **Wagmi** for blockchain interactions
- **Supabase** for off-chain data storage
- **NextAuth** for Twitter OAuth
- **TailwindCSS** for styling

### Backend Services
- **Supabase** - Market metadata and user data
- **BNB RPC** - Blockchain interaction with fallback providers
- **Twitter API** - Social authentication

---

## 🎮 How It Works

### Creating a Market

1. **Connect Wallet** - Use MetaMask or any Web3 wallet
2. **Pose a Question** - Create a yes/no question about a future event
3. **Set Parameters** - Choose end time and initial liquidity
4. **AI Validation** - System validates question quality
5. **Deploy Market** - Smart contract creates the market on-chain

### Trading on Markets

1. **Browse Markets** - Explore active prediction markets
2. **Analyze Odds** - View current YES/NO token prices
3. **Buy Tokens** - Purchase YES or NO based on your prediction
4. **Track Position** - Monitor your holdings in real-time
5. **Claim Winnings** - Redeem tokens after market resolves

### Market Resolution

1. **Market Closes** - Trading stops at predetermined end time
2. **Oracle Input** - Trusted source provides outcome
3. **Settlement** - Winners can claim their rewards
4. **Redemption** - Exchange winning tokens for underlying assets

---

## 💰 Tokenomics

### PDX Token
- **Symbol**: PDX
- **Network**: BNB Smart Chain Testnet
- **Use Cases**: Trading, market creation, governance
- **Faucet**: 100 PDX per claim (24-hour cooldown)

### Fee Structure
- **Trading Fee**: 0.5% on all trades
- **Market Creation**: Free (requires initial liquidity)
- **Redemption**: No fee for claiming winnings

---

## 🚀 Getting Started

### For Users

1. **Get a Wallet** - Install MetaMask or compatible wallet
2. **Add BNB Testnet** - Configure network in your wallet
3. **Get Test BNB** - Use BNB faucet for gas fees
4. **Get PDX Tokens** - Visit `/faucetPDX` for free tokens
5. **Start Trading** - Browse markets and make predictions

### For Developers

See individual README files in:
- `/Backend` - Smart contract development
- `/Frontend` - Web application setup
- `/server` - Backend services

---

## 🛠️ Technology Stack

**Blockchain**
- Solidity 0.8.x
- Hardhat (development framework)
- OpenZeppelin (security libraries)
- BNB Smart Chain Testnet

**Frontend**
- Next.js 14 (App Router)
- TypeScript
- RainbowKit + Wagmi
- Ethers.js v6
- TailwindCSS

**Backend**
- Supabase (PostgreSQL)
- NextAuth.js
- Twitter OAuth 2.0
- Node.js

**Infrastructure**
- Vercel (hosting)
- Multiple RPC providers (reliability)
- IPFS (future: decentralized storage)

---

## 📊 Market Mechanics

### Automated Market Maker (AMM)

GoPredix uses a **constant product formula** similar to Uniswap:

```
x × y = k
```

Where:
- `x` = YES token supply
- `y` = NO token supply  
- `k` = constant product

**Price Discovery**: As users buy YES tokens, the price increases. Buying NO tokens decreases YES price.

**Liquidity**: Initial liquidity is provided by market creators. All trades happen against this pool.

**Arbitrage**: Prices naturally converge to market consensus through arbitrage opportunities.

---

## 💎 Economic Architecture & Platform Flows

### Ecosystem Overview

GoPredix operates a **dual-token economy** with distinct economic models for BNB and PDX markets. The platform features automated market making, trading fees, market ownership transfers, and a decentralized stake-based dispute resolution system.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        GOPREDIX ECONOMIC ECOSYSTEM                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   ┌─────────────┐         ┌─────────────┐         ┌─────────────┐          │
│   │   TRADERS   │◄───────►│   MARKETS   │◄───────►│  CREATORS   │          │
│   │   (Users)   │  Trade  │  (AMM Pool) │ Provide │ (Liquidity) │          │
│   └─────────────┘         └─────────────┘         └─────────────┘          │
│          │                       │                       ▲                  │
│          │ 0.5% Fee             │ Resolution             │ Rewards         │
│          ▼                       ▼                       │                  │
│   ┌─────────────┐         ┌─────────────┐               │                  │
│   │  PLATFORM   │         │  RESOLUTION │───────────────┘                  │
│   │  TREASURY   │         │   SERVER    │                                  │
│   └─────────────┘         └─────────────┘                                  │
│          │                       │                                          │
│          │                       ▼                                          │
│          │                ┌─────────────┐         ┌─────────────┐          │
│          │                │  DISPUTES   │◄───────►│   VOTERS    │          │
│          │                │ (Stake-Vote)│         │  (Community)│          │
│          │                └─────────────┘         └─────────────┘          │
│          │                       │                                          │
│          │                       ▼                                          │
│          │                ┌─────────────┐                                  │
│          └───────────────►│ MARKETPLACE │                                  │
│                           │  (PDX Only) │                                  │
│                           └─────────────┘                                  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 📊 Complete Trading Flow (How Betting Actually Works)

### Market Creation Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           MARKET CREATION FLOW                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  CREATOR                                                                    │
│    │                                                                        │
│    ├─► 1. Connect Wallet (MetaMask/WalletConnect)                          │
│    │                                                                        │
│    ├─► 2. Choose Market Type                                               │
│    │      ├─ BNB Market (requires min 0.1 BNB initial liquidity)           │
│    │      └─ PDX Market (requires min 100 PDX initial liquidity)           │
│    │                                                                        │
│    ├─► 3. Define Market Parameters                                         │
│    │      ├─ Question: "Will X happen before Y?"                           │
│    │      ├─ Category: Sports/Politics/Crypto/Entertainment                │
│    │      ├─ End Time: Must be at least 1 hour in future                   │
│    │      ├─ Initial YES Pool: e.g., 0.05 BNB or 50 PDX                    │
│    │      └─ Initial NO Pool: e.g., 0.05 BNB or 50 PDX                     │
│    │                                                                        │
│    ├─► 4. AI Validation                                                    │
│    │      └─ Question quality checked                                      │
│    │                                                                        │
│    ├─► 5. Transaction Execution                                            │
│    │      ├─ For BNB: Send BNB to contract                                 │
│    │      ├─ For PDX: Approve + Transfer PDX to contract                   │
│    │      └─ Contract creates YES and NO outcome tokens                    │
│    │                                                                        │
│    └─► 6. Market Goes Live                                                 │
│           ├─ Market ID assigned                                            │
│           ├─ Initial AMM pool created (x × y = k)                          │
│           └─ Trading opens immediately                                     │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### BNB Market Trading Flow (Complete Betting Process)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       BNB MARKET BETTING FLOW                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  TRADER (Buying YES tokens)                                                │
│    │                                                                        │
│    ├─► 1. Browse Active Markets                                            │
│    │      └─ View current prices and multipliers                           │
│    │                                                                        │
│    ├─► 2. Select Position                                                  │
│    │      ├─ Choose: YES or NO                                             │
│    │      ├─ Current YES price: 0.60 (60% probability)                     │
│    │      ├─ Current YES multiplier: 1.67x                                 │
│    │      └─ Decide bet amount: 1.0 BNB                                    │
│    │                                                                        │
│    ├─► 3. Transaction Processing                                           │
│    │      │                                                                 │
│    │      ├─ User sends: 1.0 BNB                                           │
│    │      │                                                                 │
│    │      ├─ Contract calculates fees:                                     │
│    │      │   ├─ Trading Fee: 0.005 BNB (0.5% of 1.0)                      │
│    │      │   ├─ LP Fee (70%): 0.0035 BNB → Back to pool                   │
│    │      │   ├─ Platform Fee (30%): 0.0015 BNB → Treasury                 │
│    │      │   └─ After fee: 0.995 BNB for trade                            │
│    │      │                                                                 │
│    │      ├─ AMM Calculation (Constant Product):                           │
│    │      │   ├─ Before: YES Pool = 10 BNB, NO Pool = 5 BNB               │
│    │      │   ├─ User wants YES, so:                                       │
│    │      │   │   • 0.995 BNB minted as YES tokens directly                │
│    │      │   │   • 0.995 BNB added to NO pool                             │
│    │      │   │   • Calculate NO → YES swap output                         │
│    │      │   │   • Output = (0.995 × 10) / (5 + 0.995) = 1.66 YES        │
│    │      │   └─ Total YES tokens: 0.995 + 1.66 = 2.655 YES               │
│    │      │                                                                 │
│    │      ├─ Pool Update:                                                  │
│    │      │   ├─ YES Pool: 10 + 0.9985 - 1.66 = 9.3385 BNB                │
│    │      │   ├─ NO Pool: 5 + 0.995 = 5.995 BNB                            │
│    │      │   ├─ Total Backing: +1.0 BNB                                   │
│    │      │   └─ LP Fee: 0.0035 BNB added to pool                          │
│    │      │                                                                 │
│    │      └─ Token Minting:                                                │
│    │          ├─ User receives: 2.655 YES tokens                           │
│    │          └─ Tokens stored in user's wallet                            │
│    │                                                                        │
│    ├─► 4. Price Impact                                                     │
│    │      ├─ New YES Price: 9.34/(9.34+5.995) = 60.9% (↑ from 60%)        │
│    │      ├─ New YES Multiplier: 1.64x (↓ from 1.67x)                      │
│    │      └─ Market updates in real-time                                   │
│    │                                                                        │
│    └─► 5. User Position                                                    │
│           ├─ Holds: 2.655 YES tokens                                       │
│           ├─ Cost: 1.0 BNB                                                 │
│           └─ If YES wins: Redeem 2.655 YES → 2.655 BNB (1.655 BNB profit) │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### PDX Market Trading Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       PDX MARKET BETTING FLOW                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  TRADER (Buying NO tokens)                                                 │
│    │                                                                        │
│    ├─► 1. Get PDX Tokens                                                   │
│    │      ├─ Claim from faucet (100 PDX, 24hr cooldown)                    │
│    │      └─ Or buy on DEX                                                 │
│    │                                                                        │
│    ├─► 2. Approve PDX Spending                                             │
│    │      └─ Approve contract to spend PDX (one-time per contract)         │
│    │                                                                        │
│    ├─► 3. Place Bet                                                        │
│    │      ├─ Choose NO position                                            │
│    │      ├─ Current NO price: 0.35 (35% probability)                      │
│    │      ├─ Current NO multiplier: 2.86x                                  │
│    │      └─ Bet amount: 500 PDX                                           │
│    │                                                                        │
│    ├─► 4. Transaction Processing                                           │
│    │      │                                                                 │
│    │      ├─ User's PDX transferred: 500 PDX                               │
│    │      │                                                                 │
│    │      ├─ Fee Distribution (PDX Model):                                 │
│    │      │   ├─ Total Fee: 2.5 PDX (0.5% of 500)                          │
│    │      │   ├─ Creator Share (70%): 1.75 PDX → Market creator            │
│    │      │   │   └─ ⚡ Instantly paid to creator's wallet                  │
│    │      │   ├─ Platform Share (30%): 0.75 PDX → Treasury                 │
│    │      │   └─ After fee: 497.5 PDX for trade                            │
│    │      │                                                                 │
│    │      ├─ AMM Calculation:                                              │
│    │      │   ├─ Before: YES Pool = 1500 PDX, NO Pool = 800 PDX           │
│    │      │   ├─ User wants NO, so:                                        │
│    │      │   │   • 497.5 PDX minted as NO tokens directly                 │
│    │      │   │   • 497.5 PDX added to YES pool                            │
│    │      │   │   • Calculate YES → NO swap output                         │
│    │      │   │   • Output = (497.5 × 800)/(1500 + 497.5) = 199.4 NO      │
│    │      │   └─ Total NO tokens: 497.5 + 199.4 = 696.9 NO                │
│    │      │                                                                 │
│    │      └─ User receives: 696.9 NO tokens                                │
│    │                                                                        │
│    └─► 5. Outcome Scenarios                                                │
│           ├─ If NO wins: Redeem 696.9 NO → 696.9 PDX (196.9 PDX profit)   │
│           └─ If YES wins: Tokens become worthless (500 PDX loss)           │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 💰 Complete Economic Flow Diagrams

### BNB Market Money Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      BNB MARKET ECONOMIC FLOW                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  USER SENDS 100 BNB                                                         │
│         │                                                                   │
│         ├──────────────────► TRADING FEE: 0.5 BNB (0.5%)                   │
│         │                           │                                       │
│         │                           ├─► LP SHARE (70%): 0.35 BNB           │
│         │                           │   └─► Added to Liquidity Pool        │
│         │                           │                                       │
│         │                           └─► PLATFORM (30%): 0.15 BNB           │
│         │                               └─► Protocol Treasury               │
│         │                                                                   │
│         └──────────────────► EFFECTIVE TRADE: 99.5 BNB                     │
│                                       │                                     │
│                                       ├─► Minted as outcome tokens          │
│                                       │                                     │
│                                       └─► Added to AMM pool                 │
│                                           ├─ YES Pool: +X BNB               │
│                                           └─ NO Pool: -Y BNB                │
│                                                                             │
│  MARKET RESOLUTION                                                          │
│         │                                                                   │
│         ├──────────────────► Winners redeem tokens 1:1                     │
│         │                    └─► 1 YES token = 1 BNB                       │
│         │                                                                   │
│         └──────────────────► Losers get nothing                            │
│                              └─► 1 NO token = 0 BNB                        │
│                                                                             │
│  ACCUMULATED FEES                                                           │
│         │                                                                   │
│         └──────────────────► Owner withdraws platform fees                 │
│                              └─► Periodic withdrawal to treasury           │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### PDX Market Money Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      PDX MARKET ECONOMIC FLOW                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  USER SENDS 1000 PDX                                                        │
│         │                                                                   │
│         ├──────────────────► TRADING FEE: 5 PDX (0.5%)                     │
│         │                           │                                       │
│         │                           ├─► CREATOR SHARE (70%): 3.5 PDX       │
│         │                           │   └─► ⚡ INSTANT payout to creator    │
│         │                           │                                       │
│         │                           └─► PLATFORM (30%): 1.5 PDX             │
│         │                               └─► Protocol Treasury               │
│         │                                                                   │
│         └──────────────────► EFFECTIVE TRADE: 995 PDX                      │
│                                       │                                     │
│                                       ├─► Minted as outcome tokens          │
│                                       │                                     │
│                                       └─► Added to AMM pool                 │
│                                           ├─ YES Pool: +X PDX               │
│                                           └─ NO Pool: -Y PDX                │
│                                                                             │
│  WHY CREATOR REWARDS?                                                       │
│         │                                                                   │
│         ├──────────────────► Incentivizes quality market creation          │
│         │                                                                   │
│         ├──────────────────► Rewards popular/active markets                │
│         │                                                                   │
│         └──────────────────► More trading = more creator earnings          │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## ⚖️ Dispute Resolution Flow (Complete Process)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    DISPUTE RESOLUTION COMPLETE FLOW                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  PHASE 1: MARKET RESOLUTION                                                │
│    │                                                                        │
│    ├─► Market End Time Reached                                             │
│    │                                                                        │
│    ├─► Anyone calls: requestResolution()                                   │
│    │      ├─ Market status → ResolutionRequested                           │
│    │      ├─ 7-day dispute window starts                                   │
│    │      └─ Resolution reason provided                                    │
│    │                                                                        │
│    ├─► Resolution Server calls: resolveMarket()                            │
│    │      ├─ Outcome set: YES/NO/INVALID                                   │
│    │      ├─ Confidence score provided                                     │
│    │      └─ Market status → Resolved                                      │
│    │                                                                        │
│    └─► Dispute Period Active (7 days)                                      │
│                                                                             │
│  PHASE 2: DISPUTE CREATION (Optional - if someone disagrees)               │
│    │                                                                        │
│    ├─► Disputer sees incorrect outcome                                     │
│    │                                                                        │
│    ├─► Disputer calls: createDispute()                                     │
│    │      │                                                                 │
│    │      ├─ For BNB markets:                                              │
│    │      │   ├─ Stakes minimum 0.01 BNB                                   │
│    │      │   └─ Sends BNB to DisputeResolution contract                   │
│    │      │                                                                 │
│    │      ├─ For PDX markets:                                              │
│    │      │   ├─ Stakes minimum 10 PDX                                     │
│    │      │   ├─ Approves PDX spending                                     │
│    │      │   └─ Transfers PDX to PDXDisputeResolution contract            │
│    │      │                                                                 │
│    │      ├─ Provides dispute reason (max 500 chars)                       │
│    │      │                                                                 │
│    │      └─ Disputer's stake AUTO-COUNTS as "Accept Dispute" vote         │
│    │                                                                        │
│    └─► 3-Day Voting Period Begins                                          │
│                                                                             │
│  PHASE 3: COMMUNITY VOTING                                                 │
│    │                                                                        │
│    ├─► Community reviews dispute reason                                    │
│    │                                                                        │
│    ├─► Voters call: voteOnDispute(disputeId, acceptDispute, stakeAmount)  │
│    │      │                                                                 │
│    │      ├─ For BNB: Min 0.001 BNB stake                                  │
│    │      ├─ For PDX: Min 1 PDX stake                                      │
│    │      │                                                                 │
│    │      ├─ Vote "True" = Accept Dispute (support challenger)             │
│    │      │   └─ Believes original outcome is wrong                        │
│    │      │                                                                 │
│    │      └─ Vote "False" = Reject Dispute (support original)              │
│    │          └─ Believes original outcome is correct                      │
│    │                                                                        │
│    ├─► Example Voting:                                                     │
│    │      ├─ Disputer: 10 PDX (auto-counted as Accept)                     │
│    │      ├─ Alice: Stakes 30 PDX to Accept                                │
│    │      ├─ Bob: Stakes 20 PDX to Reject                                  │
│    │      ├─ Carol: Stakes 15 PDX to Accept                                │
│    │      └─ Dave: Stakes 25 PDX to Reject                                 │
│    │                                                                        │
│    └─► Voting Period Ends After 3 Days                                     │
│                                                                             │
│  PHASE 4: RESOLUTION CALCULATION                                           │
│    │                                                                        │
│    ├─► Anyone calls: finalizeDispute(disputeId)                            │
│    │                                                                        │
│    ├─► Contract Calculates:                                                │
│    │      │                                                                 │
│    │      ├─ Total Accept Stakes:                                          │
│    │      │   └─ Disputer (10) + Alice (30) + Carol (15) = 55 PDX         │
│    │      │                                                                 │
│    │      ├─ Total Reject Stakes:                                          │
│    │      │   └─ Bob (20) + Dave (25) = 45 PDX                             │
│    │      │                                                                 │
│    │      ├─ Winner Determination:                                         │
│    │      │   └─ 55 > 45 → Accept wins (Dispute is accepted)               │
│    │      │                                                                 │
│    │      └─ Market outcome CHANGES to disputer's claim                    │
│    │                                                                        │
│    └─► Dispute Status → Resolved                                           │
│                                                                             │
│  PHASE 5: REWARD DISTRIBUTION                                              │
│    │                                                                        │
│    ├─► Winners Call: claimStake(disputeId)                                 │
│    │      │                                                                 │
│    │      ├─ Calculation for Each Winner:                                  │
│    │      │   │                                                             │
│    │      │   ├─ Total Winning Stakes: 55 PDX                              │
│    │      │   ├─ Total Losing Stakes: 45 PDX                               │
│    │      │   ├─ Platform Fee: 45 × 5% = 2.25 PDX                          │
│    │      │   ├─ Distributable: 45 - 2.25 = 42.75 PDX                      │
│    │      │   │                                                             │
│    │      │   ├─ Disputer (staked 10 PDX):                                 │
│    │      │   │   ├─ Share: (10/55) × 42.75 = 7.77 PDX                     │
│    │      │   │   └─ Gets: 10 + 7.77 = 17.77 PDX                           │
│    │      │   │                                                             │
│    │      │   ├─ Alice (staked 30 PDX):                                    │
│    │      │   │   ├─ Share: (30/55) × 42.75 = 23.32 PDX                    │
│    │      │   │   └─ Gets: 30 + 23.32 = 53.32 PDX                          │
│    │      │   │                                                             │
│    │      │   └─ Carol (staked 15 PDX):                                    │
│    │      │       ├─ Share: (15/55) × 42.75 = 11.66 PDX                    │
│    │      │       └─ Gets: 15 + 11.66 = 26.66 PDX                          │
│    │      │                                                                 │
│    │      └─ Losers (Bob \u0026 Dave):                                          │
│    │          ├─ Bob: Lost 20 PDX (gets 0)                                 │
│    │          └─ Dave: Lost 25 PDX (gets 0)                                │
│    │                                                                        │
│    └─► Platform Treasury:                                                  │
│           └─► Receives 2.25 PDX (5% fee)                                   │
│                                                                             │
│  FINAL OUTCOME                                                              │
│    │                                                                        │
│    ├─► Market outcome updated based on dispute result                      │
│    │                                                                        │
│    └─► Winners can now claim correct outcome tokens                        │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Dispute Parameters Summary

| Parameter | BNB Markets | PDX Markets |
|-----------|-------------|-------------|
| **Minimum Dispute Stake** | 0.01 BNB | 10 PDX |
| **Minimum Vote Stake** | 0.001 BNB | 1 PDX |
| **Voting Period** | 3 days | 3 days |
| **Platform Fee** | 5% of losing stakes | 5% of losing stakes |
| **Vote Weight** | By stake amount | By stake amount |
| **Disputer Auto-vote** | Counts as Accept | Counts as Accept |

---

## 🏪 Marketplace Flow (Market Ownership Transfer)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                   CUSTODIAL MARKETPLACE COMPLETE FLOW                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  SELLER (Wants to sell market ownership)                                   │
│    │                                                                        │
│    ├─► STEP 1: List Market                                                 │
│    │      ├─ Call: listMarket(marketId, priceInPDX)                        │
│    │      ├─ Example: List market #42 for 1000 PDX                         │
│    │      ├─ Requirements:                                                 │
│    │      │   ├─ Must be current market creator                            │
│    │      │   ├─ Market must be in "Open" status                           │
│    │      │   └─ Market not already listed                                 │
│    │      └─ Listing created (but not yet active)                          │
│    │                                                                        │
│    ├─► STEP 2: Transfer Ownership to Marketplace                           │
│    │      ├─ Call on PredictionMarket contract:                            │
│    │      │   └─ transferMarketOwnership(42, marketplaceAddress)           │
│    │      ├─ Marketplace contract becomes temporary owner                  │
│    │      └─ This is CUSTODIAL - marketplace holds it in escrow            │
│    │                                                                        │
│    ├─► STEP 3: Confirm Transfer                                            │
│    │      ├─ Call: confirmTransfer(marketId)                               │
│    │      ├─ Marketplace verifies it's now the owner                       │
│    │      ├─ Listing becomes ACTIVE                                        │
│    │      └─ Visible to all buyers                                         │
│    │                                                                        │
│    └─► Waiting for buyer...                                                │
│                                                                             │
│  BUYER (Wants to purchase market)                                          │
│    │                                                                        │
│    ├─► 1. Browse Marketplace                                               │
│    │      ├─ See: Market #42 for 1000 PDX                                  │
│    │      ├─ View market stats (volume, liquidity, etc)                    │
│    │      └─ Decide to purchase                                            │
│    │                                                                        │
│    ├─► 2. Approve PDX Spending                                             │
│    │      └─ Approve marketplace to spend 1000 PDX                         │
│    │                                                                        │
│    ├─► 3. Purchase Market                                                  │
│    │      │                                                                 │
│    │      ├─ Call: buyMarket(marketId)                                     │
│    │      │                                                                 │
│    │      ├─ Payment Processing:                                           │
│    │      │   ├─ Buyer pays: 1000 PDX                                      │
│    │      │   ├─ Marketplace fee (2%): 20 PDX → Platform                   │
│    │      │   ├─ Seller receives (98%): 980 PDX                            │
│    │      │   └─ Total: 1000 PDX                                           │
│    │      │                                                                 │
│    │      ├─ Ownership Transfer:                                           │
│    │      │   └─ Marketplace transfers ownership to buyer                  │
│    │      │       └─ Buyer is now market creator                           │
│    │      │                                                                 │
│    │      └─ Listing Closed                                                │
│    │          └─ Market removed from marketplace                           │
│    │                                                                        │
│    └─► 4. Buyer Benefits                                                   │
│           ├─ Now receives all trading fees (for PDX market: 70% of 0.5%)  │
│           ├─ Controls market parameters                                    │
│           └─ Can list market again if desired                              │
│                                                                             │
│  CANCEL LISTING (If seller changes mind)                                   │
│    │                                                                        │
│    ├─► Seller calls: cancelListing(marketId)                               │
│    │                                                                        │
│    ├─► If ownership already transferred:                                   │
│    │      └─ Marketplace returns ownership to seller                       │
│    │                                                                        │
│    └─► Listing removed from marketplace                                    │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Why Buy a Market?

**Revenue Opportunity:**
- PDX Markets: Earn 70% of all trading fees (0.35% of every trade)
- Active market with 10,000 PDX daily volume → Earn 35 PDX/day

**Control:**
- Own the market you created or acquired
- Build reputation as market curator
- Can resell later if market becomes more valuable

### Marketplace Fee Structure

| Item | Amount |
|------|--------|
| **Marketplace Fee** | 2% (200 BPS) |
| **Buyer Pays** | Full listing price in PDX |
| **Seller Receives** | 98% of listing price |
| **Platform Receives** | 2% of listing price |
| **Payment Method** | PDX only (both BNB and PDX markets) |

---

## 📊 Complete Revenue Summary

| Revenue Source | Fee/Rate | Payment Currency | Who Receives | Collection Method |
|----------------|----------|------------------|--------------|-------------------|
| **BNB Market Trading** | 0.5% total | BNB | 70% → Pool (LP benefit)<br>30% → Platform | Automatic on each trade |
| **PDX Market Trading** | 0.5% total | PDX | 70% → Creator (instant)<br>30% → Platform | Automatic on each trade |
| **Marketplace Sales** | 2% | PDX | 100% → Platform | Deducted from seller payout |
| **Dispute Resolution** | 5% of losing stakes | BNB or PDX | 100% → Platform | After dispute finalization |
| **Market Creation** | 0% | N/A | N/A | Free |
| **Claiming Winnings** | 0% | N/A | N/A | Free |

### Market Comparison Table

| Feature | BNB Markets | PDX Markets |
|---------|-------------|-------------|
| **Collateral Type** | BNB (native token) | PDX (ERC-20) |
| **Trading Fee** | 0.5% (50 BPS) | 0.5% (50 BPS) |
| **Fee Distribution** | 70% stays in pool<br>30% to platform | 70% to creator<br>30% to platform |
| **Min Initial Liquidity** | 0.1 BNB | 100 PDX |
| **Create Dispute** | 0.01 BNB | 10 PDX |
| **Vote on Dispute** | 0.001 BNB | 1 PDX |
| **Sold On Marketplace** | Yes (for PDX) | Yes (for PDX) |
| **Winner Redemption** | 1 YES token = 1 BNB | 1 YES token = 1 PDX |
| **Economic Model** | Liquidity-focused | Creator-incentive focused |

---

## 🔒 Security

- **Audited Contracts** - Core logic reviewed for vulnerabilities
- **Rate Limiting** - Protection against RPC abuse
- **Input Validation** - AI-powered question screening
- **Secure Authentication** - OAuth 2.0 for social login
- **Environment Isolation** - Secrets managed securely

---

## 🌐 Live Deployment

**Website**: [www.gopredix.xyz](https://www.gopredix.xyz)

**Smart Contracts** (BNB Testnet):
- BNB Market: `0x12FD6C9B618949d940806B0E59e3c65507eC37E8`
- PDX Market: `0x7d46139e1513571f19c9B87cE9A01D21cA9ef665`
- PDX Token: `0xeE943aCCAa07ED556DfAc9d3a76015050fA78BC8`
- PDX Faucet: `0xD3561841A6dd046943739B704bcc737aAeE4cd77`

**Explorers**:
- [BscScan Testnet](https://testnet.bscscan.com/)

---

## 📁 Project Structure

```
Predection-Market/
├── Backend/              # Smart contracts (Solidity)
│   ├── contracts/       # Contract source files
│   ├── test/           # Contract tests
│   └── ignition/       # Deployment scripts
│
├── Frontend/            # Web application (Next.js)
│   ├── app/            # Next.js app router pages
│   ├── components/     # React components
│   ├── hooks/          # Custom React hooks
│   ├── lib/            # Utility libraries
│   └── contracts/      # Contract ABIs
│
├── server/             # Backend services
│   └── api/           # API endpoints
│
└── Docs/              # Documentation
```

---

## 🤝 Contributing

We welcome contributions! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

---

## 📄 License

This project is licensed under the MIT License.

---

## 🔗 Links

- **Website**: [www.gopredix.xyz](https://www.gopredix.xyz)
- **Twitter**: [@GoPredix](https://twitter.com/gopredix)
- **Discord**: [Join Community](https://discord.gg/gopredix)
- **Documentation**: [docs.gopredix.xyz](https://docs.gopredix.xyz)

---

## ⚠️ Disclaimer

GoPredix is currently deployed on **BNB Smart Chain Testnet** for testing purposes. Tokens have no real monetary value. Use at your own risk.

---

**Built with ❤️ by the GoPredix Team**
