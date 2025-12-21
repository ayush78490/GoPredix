const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const { ethers } = require('ethers');
const BlockchainResolutionService = require('./services/resolutionService');

// Contract ABIs (simplified - only what we need)
const PREDICTION_MARKET_ABI = [
    'function nextMarketId() view returns (uint256)',
    'function markets(uint256) view returns (address creator, string question, string category, uint256 endTime, uint8 status, uint8 outcome, address yesToken, address noToken, uint256 yesPool, uint256 noPool, uint256 lpTotalSupply, uint256 totalBacking, uint256 platformFees, uint256 resolutionRequestedAt, address resolutionRequester, string resolutionReason, uint256 resolutionConfidence, uint256 disputeDeadline, address disputer, string disputeReason)',
    'function requestResolution(uint256 id, string calldata reason) external',
    'function resolveMarket(uint256 id, uint8 outcomeIndex, string reason, uint256 confidence) external',
    'event ResolutionRequested(uint256 indexed id, address requester, uint256 requestedAt)',
    'event MarketResolved(uint256 indexed id, uint8 outcome, string reason, uint256 confidence, address resolvedBy)'
];

async function startResolutionServices() {
    try {
        console.log('🚀 Starting Resolution Services...\n');

        // Validate environment variables
        const requiredEnvVars = [
            'BSC_TESTNET_RPC_URL',
            'RESOLVER_PRIVATE_KEY',
            'BNB_PREDICTION_MARKET_ADDRESS',
            'PDX_PREDICTION_MARKET_ADDRESS'
        ];

        for (const envVar of requiredEnvVars) {
            if (!process.env[envVar]) {
                throw new Error(`Missing required environment variable: ${envVar}`);
            }
        }

        // Setup provider
        const provider = new ethers.JsonRpcProvider(process.env.BSC_TESTNET_RPC_URL);

        // Test connection
        const network = await provider.getNetwork();
        console.log(`✅ Connected to network: ${network.name} (Chain ID: ${network.chainId})\n`);

        // Initialize BNB Market Resolution Service
        console.log('📊 Initializing BNB Market Resolution Service...');
        const bnbKey = process.env.RESOLVER_PRIVATE_KEY?.startsWith('0x')
            ? process.env.RESOLVER_PRIVATE_KEY
            : `0x${process.env.RESOLVER_PRIVATE_KEY}`;
        const bnbService = new BlockchainResolutionService(
            provider,
            bnbKey,
            process.env.BNB_PREDICTION_MARKET_ADDRESS,
            PREDICTION_MARKET_ABI
        );
        await bnbService.startMonitoring();
        console.log('✅ BNB Market Resolution Service active\n');

        // Initialize PDX Market Resolution Service
        console.log('📊 Initializing PDX Market Resolution Service...');
        const pdxKey = process.env.RESOLVER_PRIVATE_KEY?.startsWith('0x')
            ? process.env.RESOLVER_PRIVATE_KEY
            : `0x${process.env.RESOLVER_PRIVATE_KEY}`;
        const pdxService = new BlockchainResolutionService(
            provider,
            pdxKey,
            process.env.PDX_PREDICTION_MARKET_ADDRESS,
            PREDICTION_MARKET_ABI
        );
        await pdxService.startMonitoring();
        console.log('✅ PDX Market Resolution Service active\n');

        console.log('🎉 All resolution services started successfully!');
        console.log('📡 Monitoring blockchain for resolution requests...\n');

        // Handle graceful shutdown
        process.on('SIGINT', () => {
            console.log('\n🛑 Shutting down resolution services...');
            bnbService.stopMonitoring();
            pdxService.stopMonitoring();
            process.exit(0);
        });

        process.on('SIGTERM', () => {
            console.log('\n🛑 Shutting down resolution services...');
            bnbService.stopMonitoring();
            pdxService.stopMonitoring();
            process.exit(0);
        });

    } catch (error) {
        console.error('❌ Failed to start resolution services:', error);
        process.exit(1);
    }
}

// Start the services
startResolutionServices();
