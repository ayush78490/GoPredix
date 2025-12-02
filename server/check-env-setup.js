const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    cyan: '\x1b[36m'
};

console.log(`${colors.cyan}╔════════════════════════════════════════╗${colors.reset}`);
console.log(`${colors.cyan}║   Environment Configuration Check      ║${colors.reset}`);
console.log(`${colors.cyan}╚════════════════════════════════════════╝${colors.reset}\n`);

const requiredVars = [
    { key: 'OPEN_AI_API_KEY', description: 'Required for AI resolution (Vercel Function)' },
    { key: 'BSC_TESTNET_RPC_URL', description: 'Required for Blockchain Service' },
    { key: 'RESOLUTION_SERVER_PRIVATE_KEY', description: 'Wallet for submitting resolutions' },
    { key: 'BNB_PREDICTION_MARKET_ADDRESS', description: 'BNB Market Contract Address' },
    { key: 'PDX_PREDICTION_MARKET_ADDRESS', description: 'PDX Market Contract Address' }
];

const optionalVars = [
    { key: 'RESOLUTION_API_URL', description: 'URL for AI Resolution API (defaults to Vercel)' }
];

let hasErrors = false;

console.log(`${colors.yellow}Checking Required Variables:${colors.reset}`);
requiredVars.forEach(({ key, description }) => {
    if (process.env[key]) {
        const value = process.env[key];
        const masked = value.length > 8 ? `${value.substring(0, 4)}...${value.substring(value.length - 4)}` : '****';
        console.log(`${colors.green}✓ ${key}${colors.reset} (Found) - ${description}`);
    } else {
        console.log(`${colors.red}✗ ${key}${colors.reset} (MISSING) - ${description}`);
        hasErrors = true;
    }
});

console.log(`\n${colors.yellow}Checking Optional Variables:${colors.reset}`);
optionalVars.forEach(({ key, description }) => {
    if (process.env[key]) {
        console.log(`${colors.green}✓ ${key}${colors.reset} (Found) - ${description}`);
    } else {
        console.log(`${colors.cyan}ℹ ${key}${colors.reset} (Not set) - ${description}`);
    }
});

console.log(`\n${colors.cyan}Architecture Analysis:${colors.reset}`);
console.log(`1. ${colors.green}AI Resolution API${colors.reset}: Serverless (Vercel)`);
console.log(`   - Uses OPEN_AI_API_KEY`);
console.log(`   - Endpoint: /api/resolveMarket`);
console.log(`2. ${colors.green}Blockchain Monitor${colors.reset}: Persistent Service (Node.js)`);
console.log(`   - Uses RPC_URL, PRIVATE_KEY, CONTRACT_ADDRESSES`);
console.log(`   - File: server/start-resolution-service.js`);

if (hasErrors) {
    console.log(`\n${colors.red}❌ Configuration incomplete. Please update server/.env${colors.reset}`);
    process.exit(1);
} else {
    console.log(`\n${colors.green}✅ Configuration looks good!${colors.reset}`);
}
