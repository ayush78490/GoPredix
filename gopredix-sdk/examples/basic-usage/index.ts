import { GoPredixClient } from '@gopredix/core';
import { ethers } from 'ethers';

/**
 * Example 1: Read-only operations (no wallet needed)
 */
async function example1() {
    console.log('=== Example 1: Fetching Markets ===\n');

    const client = new GoPredixClient({
        network: 'testnet',
    });

    // Get all BNB markets
    const markets = await client.markets.getAllMarkets('BNB');
    console.log(`Total markets: ${markets.length}`);

    // Get first market details
    if (markets.length > 0) {
        const market = markets[0];
        console.log(`\nMarket #${market.id}:`);
        console.log(`Question: ${market.question}`);
        console.log(`Category: ${market.category}`);
        console.log(`YES Price: ${market.yesPrice}%`);
        console.log(`NO Price: ${market.noPrice}%`);
        console.log(`Total Liquidity: ${market.totalBacking} BNB`);
    }
}

/**
 * Example 2: Trading with wallet
 */
async function example2() {
    console.log('\n=== Example 2: Trading Operations ===\n');

    // Connect to wallet (in browser using MetaMask)
    if (typeof window !== 'undefined' && window.ethereum) {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();

        const client = new GoPredixClient({
            network: 'testnet',
        });

        await client.setSigner(signer);

        // Buy YES tokens
        const txHash = await client.trading.buyYes(0, '0.1', 'BNB');
        console.log(`Trade successful! TX: ${txHash}`);
    }
}

/**
 * Example 3: User positions
 */
async function example3() {
    console.log('\n=== Example 3: User Positions ===\n');

    const client = new GoPredixClient({
        network: 'testnet',
    });

    const userAddress = '0x...'; // Replace with actual address
    const positions = await client.trading.getUserPositions(userAddress, 'BNB');

    console.log(`User has ${positions.length} positions:`);
    positions.forEach((pos) => {
        console.log(`\nMarket #${pos.marketId}:`);
        console.log(`  YES Balance: ${pos.yesBalance}`);
        console.log(`  NO Balance: ${pos.noBalance}`);
        console.log(`  Total Invested: ${pos.totalInvested}`);
    });
}

// Run examples
example1().catch(console.error);
