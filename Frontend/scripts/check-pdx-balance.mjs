import { ethers } from 'ethers';

const BSC_TESTNET_RPC = 'https://data-seed-prebsc-1-s1.binance.org:8545';
const PDX_TOKEN = '0xdaD3732b2062AD5da047504623366e5973b1c032';
const PDX_MARKET = '0x151fE04C421E197B982A4F62a65Acd6F416af51a';

// Simple ERC20 ABI for balance and allowance
const ERC20_ABI = [
    'function balanceOf(address) view returns (uint256)',
    'function allowance(address owner, address spender) view returns (uint256)',
    'function decimals() view returns (uint8)',
    'function symbol() view returns (string)',
    'function name() view returns (string)'
];

async function checkPDXBalance(userAddress) {
    console.log('🔍 Checking PDX Token Status...\n');
    console.log('User Address:', userAddress);
    console.log('PDX Token:', PDX_TOKEN);
    console.log('PDX Market:', PDX_MARKET);
    console.log('');

    const provider = new ethers.JsonRpcProvider(BSC_TESTNET_RPC);
    const pdxToken = new ethers.Contract(PDX_TOKEN, ERC20_ABI, provider);

    try {
        // Get token info
        const name = await pdxToken.name();
        const symbol = await pdxToken.symbol();
        const decimals = await pdxToken.decimals();
        console.log('📋 Token Info:');
        console.log(`  Name: ${name}`);
        console.log(`  Symbol: ${symbol}`);
        console.log(`  Decimals: ${decimals}`);
        console.log('');

        // Get user balance
        const balance = await pdxToken.balanceOf(userAddress);
        const balanceFormatted = ethers.formatEther(balance);
        console.log('💰 User Balance:');
        console.log(`  Raw: ${balance.toString()}`);
        console.log(`  Formatted: ${balanceFormatted} PDX`);
        console.log('');

        // Get allowance
        const allowance = await pdxToken.allowance(userAddress, PDX_MARKET);
        const allowanceFormatted = ethers.formatEther(allowance);
        console.log('✅ Allowance (for PDX Market):');
        console.log(`  Raw: ${allowance.toString()}`);
        console.log(`  Formatted: ${allowanceFormatted} PDX`);
        console.log('');

        // Check if user has enough for 400 PDX market
        const requiredAmount = ethers.parseEther('400');
        const hasEnough = balance >= requiredAmount;
        const hasAllowance = allowance >= requiredAmount;

        console.log('📊 Market Creation Check (400 PDX):');
        console.log(`  Has enough balance: ${hasEnough ? '✅ YES' : '❌ NO'}`);
        console.log(`  Has enough allowance: ${hasAllowance ? '✅ YES' : '❌ NO'}`);

        if (!hasEnough) {
            const shortage = requiredAmount - balance;
            console.log(`  ⚠️  Short by: ${ethers.formatEther(shortage)} PDX`);
            console.log('\n💡 Solution: Get PDX from faucet at 0xed5dF6F9C2055eb735E55aaEf332f3fD249259D8');
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

// Get user address from command line or use default
const userAddress = process.argv[2];

if (!userAddress) {
    console.log('Usage: node check-pdx-balance.mjs <YOUR_WALLET_ADDRESS>');
    console.log('Example: node check-pdx-balance.mjs 0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb');
    process.exit(1);
}

if (!ethers.isAddress(userAddress)) {
    console.error('❌ Invalid Ethereum address');
    process.exit(1);
}

checkPDXBalance(userAddress);
