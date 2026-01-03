#!/bin/bash

# Test BSCScan API for Recent Trades
# This script tests fetching transaction data from BSCScan API

CONTRACT_ADDRESS="0x9067477bcBAD226572212b56c034F42D402026DF"
API_KEY="${BSCSCAN_API_KEY:-YourApiKeyToken}"

echo "=== Testing BSCScan API for Recent Trades ==="
echo "Contract Address: $CONTRACT_ADDRESS"
echo "API Key: ${API_KEY:0:10}..."
echo ""

# Test 1: Get recent transactions
echo "Test 1: Fetching recent transactions..."
RESPONSE=$(curl -s "https://api-testnet.bscscan.com/api?module=account&action=txlist&address=$CONTRACT_ADDRESS&startblock=0&endblock=99999999&page=1&offset=5&sort=desc&apikey=$API_KEY")

echo "$RESPONSE" | python3 -m json.tool

STATUS=$(echo "$RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin)['status'])" 2>/dev/null)

if [ "$STATUS" = "1" ]; then
    echo ""
    echo "✅ SUCCESS! API is working"
    echo ""
    echo "Sample transaction data:"
    echo "$RESPONSE" | python3 -c "
import sys, json
data = json.load(sys.stdin)
if data['result']:
    tx = data['result'][0]
    print(f\"  Hash: {tx['hash'][:20]}...\")
    print(f\"  From: {tx['from'][:10]}...\")
    print(f\"  Value: {int(tx['value']) / 10**18} BNB\")
    print(f\"  Block: {tx['blockNumber']}\")
    print(f\"  Time: {tx['timeStamp']}\")
"
else
    echo ""
    echo "❌ FAILED! API returned error"
    echo ""
    echo "This likely means:"
    echo "1. BSCScan V1 API is deprecated (need to wait for V2 on testnet)"
    echo "2. You need a valid API key from https://bscscan.com/myapikey"
    echo ""
    echo "To get an API key:"
    echo "1. Go to https://bscscan.com/register"
    echo "2. Create an account"
    echo "3. Go to https://bscscan.com/myapikey"
    echo "4. Create a new API key"
    echo "5. Set it: export BSCSCAN_API_KEY='your-key-here'"
fi
