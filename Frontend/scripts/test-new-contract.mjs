import { ethers } from 'ethers';

// New contract address
const CONTRACT_ADDRESS = '0xDD774C850001f193Bc3D1d63B3d6C9E1ba46dE42';
const RPC_URL = 'https://data-seed-prebsc-1-s1.binance.org:8545/';

const MINIMAL_ABI = [
    'function nextMarketId() view returns (uint256)',
    'function owner() view returns (address)'
];

async function testContract() {
    console.log('🔍 Testing new BNB Market contract...\n');
    console.log(`Contract: ${CONTRACT_ADDRESS}`);

    try {
        const provider = new ethers.JsonRpcProvider(RPC_URL);
        const contract = new ethers.Contract(CONTRACT_ADDRESS, MINIMAL_ABI, provider);

        const nextId = await contract.nextMarketId();
        const owner = await contract.owner();

        console.log(`\n✅ Contract is LIVE and working!`);
        console.log(`Next Market ID: ${nextId}`);
        console.log(`Owner: ${owner}`);
        console.log(`\n🎯 Contract is ready for market creation!`);

    } catch (error) {
        console.error('\n❌ Contract test failed:', error.message);
        console.error('This contract may not be deployed correctly.');
    }
}

testContract();
