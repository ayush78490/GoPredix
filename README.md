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
