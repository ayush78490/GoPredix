import { ethers } from 'ethers';

const BSC_TESTNET_RPC = 'https://data-seed-prebsc-1-s1.binance.org:8545';
const PDX_MARKET = '0x151fE04C421E197B982A4F62a65Acd6F416af51a';
const PDX_TOKEN = '0xdaD3732b2062AD5da047504623366e5973b1c032';

// Get wallet address from COMMAND LINE
const userAddress = process.argv[2];

if (!userAddress) {
    console.log('\n❌ Please provide your wallet address');
    console.log('Usage: node verify-pdx-setup.mjs YOUR_WALLET_ADDRESS\n');
    process.exit(1);
}

if (!ethers.isAddress(userAddress)) {
    console.error('❌ Invalid Ethereum address');
    process.exit(1);
}

const ERC20_ABI = [
    'function balanceOf(address) view returns (uint256)',
    'function allowance(address owner, address spender) view returns (uint256)',
    'function symbol() view returns (string)',
    'function decimals() view returns (uint8)'
];

const MARKET_ABI = [
    'function nextMarketId() view returns (uint256)',
    'function feeBps() view returns (uint32)',
    'function pdxToken() view returns (address)',
    'function owner() view returns (address)'
];

async function verifyPDXSetup() {
    console.log('\n🔍 PDX Market Creation Diagnostic\n');
    console.log('═'.repeat(60));
    console.log(`User Address: ${userAddress}`);
    console.log(`PDX Token:    ${PDX_TOKEN}`);
    console.log(`PDX Market:   ${PDX_MARKET}`);
    console.log('═'.repeat(60));
    console.log('');

    const provider = new ethers.JsonRpcProvider(BSC_TESTNET_RPC);
    const pdxToken = new ethers.Contract(PDX_TOKEN, ERC20_ABI, provider);
    const pdxMarket = new ethers.Contract(PDX_MARKET, MARKET_ABI, provider);

    try {
        // 1. PDX Token Info
        console.log('📋 PDX Token Info:');
        const symbol = await pdxToken.symbol();
        const decimals = await pdxToken.decimals();
        console.log(`  Symbol: ${symbol}`);
        console.log(`  Decimals: ${decimals}`);
        console.log('');

        // 2. User PDX Balance
        console.log('💰 Your PDX Balance:');
        const balance = await pdxToken.balanceOf(userAddress);
        const balanceFormatted = ethers.formatEther(balance);
        console.log(`  ${balanceFormatted} PDX`);
        console.log('');

        // 3. Allowance
        console.log('✅ Allowance (PDX Market):');
        const allowance = await pdxToken.allowance(userAddress, PDX_MARKET);
        const allowanceFormatted = ethers.formatEther(allowance);
        console.log(`  ${allowanceFormatted} PDX`);
        console.log('');

        // 4. Market Info
        console.log('📊 PDX Market Info:');
        const nextId = await pdxMarket.nextMarketId();
        const feeBps = await pdxMarket.feeBps();
        const tokenAddress = await pdxMarket.pdxToken();
        const owner = await pdxMarket.owner();
        console.log(`  Next Market ID: ${nextId.toString()}`);
        console.log(`  Fee (bps): ${feeBps.toString()}`);
        console.log(`  Token Address: ${tokenAddress}`);
        console.log(`  Owner: ${owner}`);
        console.log('');

        // 5. Market Creation Requirements
        console.log('🎯 Market Creation Requirements:');
        const required = ethers.parseEther('400'); // 200 YES + 200 NO
        const hasBalance = balance >= required;
        const hasAllowance = allowance >= required;

        console.log(`  Required: 400 PDX (200 YES + 200 NO)`);
        console.log(`  Minimum per side: 100 PDX`);
        console.log('');
        console.log('  ✓ Sufficient balance?', hasBalance ? '✅ YES' : '❌ NO');
        if (!hasBalance) {
            const shortage = required - balance;
            console.log(`    Need ${ethers.formatEther(shortage)} more PDX`);
        }
        console.log('  ✓ Sufficient allowance?', hasAllowance ? '✅ YES' : '❌ NO');
        if (!hasAllowance) {
            const shortageAllowance = required - allowance;
            console.log(`    Need to approve ${ethers.formatEther(shortageAllowance)} more PDX`);
        }
        console.log('');

        // 6. Verdict
        console.log('═'.repeat(60));
        if (hasBalance && hasAllowance) {
            console.log('✅ READY TO CREATE MARKET!');
            console.log('   You have everything needed to create a market.');
        } else {
            console.log('⚠️  NOT READY');
            if (!hasBalance) {
                console.log('   • Get PDX tokens from faucet: 0xed5dF6F9C2055eb735E55aaEf332f3fD249259D8');
            }
            if (!hasAllowance) {
                console.log('   • Approve PDX tokens for the market contract');
                console.log('   • This will be done automatically when you try to create a market');
            }
        }
        console.log('═'.repeat(60));
        console.log('');

    } catch (error) {
        console.error('\n❌ Error:', error.message);
        console.error('   Make sure you\'re connected to BSC Testnet.\n');
    }
}

verifyPDXSetup();
