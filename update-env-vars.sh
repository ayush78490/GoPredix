#!/bin/bash

# Frontend Environment Variables Update Script
# This script updates the .env.local file with the latest deployed contract addresses

# Color codes for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🔄 Updating Frontend Environment Variables...${NC}"

# Path to frontend .env.local file
ENV_FILE="/home/ayu/Documents/Predection-Market/Frontend/.env.local"

# Create backup
if [ -f "$ENV_FILE" ]; then
    cp "$ENV_FILE" "$ENV_FILE.backup_$(date +%Y%m%d_%H%M%S)"
    echo -e "${YELLOW}✅ Created backup of existing .env.local${NC}"
fi

# Write new environment variables based on latest.json deployment
cat > "$ENV_FILE" << 'EOF'
# BSC Testnet Configuration
NEXT_PUBLIC_CHAIN_ID=97

# BNB Prediction Market Contracts (from latest.json)
NEXT_PUBLIC_PREDICTION_MARKET_ADDRESS=0xA2867c105ff7725fb134d838E964Cd291B0e7e76
NEXT_PUBLIC_HELPER_CONTRACT_ADDRESS=0x071e0884f1d3114E4f0eA31a74DFa7E4F2bdccfE

# PDX Prediction Market Contracts (from latest.json)
NEXT_PUBLIC_PDX_MARKET_ADDRESS=0x151fE04C421E197B982A4F62a65Acd6F416af51a
NEXT_PUBLIC_PDX_HELPER_ADDRESS=0x3056c9cAa438596C66dAD04A35D75733C195f1ae
NEXT_PUBLIC_PDX_TOKEN_ADDRESS=0xdaD3732b2062AD5da047504623366e5973b1c032

# Marketplace Contracts (from latest.json)
# Note: These are already hardcoded in lib/web3/config.ts
# CUSTODIAL_MARKETPLACE_ADDRESS (BNB) = 0xc92c18CD349c7C60EF1B8c5A83c9000a73E7F4A0
# PDX_CUSTODIAL_MARKETPLACE = 0x6D005d00f8aCA64013B5F8fbf0161Ab80aA42173
# BNB_CUSTODIAL_MARKETPLACE = 0x2F94646dF2dD7b1596a5832B647ECe3AD0057Ea8

# Other Configuration
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_walletconnect_project_id_here
EOF

echo -e "${GREEN}✅ Environment variables updated successfully!${NC}"
echo ""
echo -e "${YELLOW}📝 Updated Contract Addresses:${NC}"
echo "   BNB Market:     0xA2867c105ff7725fb134d838E964Cd291B0e7e76"
echo "   BNB Helper:     0x071e0884f1d3114E4f0eA31a74DFa7E4F2bdccfE"
echo "   PDX Market:     0x151fE04C421E197B982A4F62a65Acd6F416af51a"
echo "   PDX Helper:     0x3056c9cAa438596C66dAD04A35D75733C195f1ae"
echo "   PDX Token:      0xdaD3732b2062AD5da047504623366e5973b1c032"
echo ""
echo -e "${YELLOW}⚠️  IMPORTANT: Restart your dev server for changes to take effect!${NC}"
echo "   Run: npm run dev (in Frontend directory)"
