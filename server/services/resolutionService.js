const { ethers } = require('ethers');

/**
 * Blockchain Resolution Service
 * Monitors markets and automatically resolves them when requested
 */
class BlockchainResolutionService {
    constructor(provider, privateKey, contractAddress, contractABI) {
        this.provider = provider;
        this.wallet = new ethers.Wallet(privateKey, provider);
        this.contract = new ethers.Contract(contractAddress, contractABI, this.wallet);
        this.isMonitoring = false;
        this.pollingInterval = null;
    }

    /**
     * Start monitoring for resolution requests
     */
    async startMonitoring() {
        try {
            console.log('🚀 Starting blockchain resolution monitoring...');

            this.isMonitoring = true;

            // Start polling for resolution requests every 60 seconds
            this.startPolling();

            console.log('✅ Blockchain resolution service active');
        } catch (error) {
            console.error('❌ Failed to start blockchain monitoring:', error.message);
            throw error;
        }
    }

    /**
     * Stop monitoring
     */
    stopMonitoring() {
        this.isMonitoring = false;
        if (this.pollingInterval) {
            clearInterval(this.pollingInterval);
            this.pollingInterval = null;
        }
        console.log('🛑 Blockchain resolution monitoring stopped');
    }

    /**
     * Start polling for markets needing resolution
     */
    startPolling() {
        // Poll every 60 seconds
        this.pollingInterval = setInterval(async () => {
            if (!this.isMonitoring) return;

            try {
                await this.checkForPendingResolutions();
            } catch (error) {
                console.error('❌ Error in polling cycle:', error.message);
            }
        }, 60000); // 60 seconds

        console.log('🔍 Started polling for resolution requests (60s interval)');

        // Run immediately on start
        this.checkForPendingResolutions().catch(console.error);
    }

    /**
     * Check all markets for pending resolutions
     */
    async checkForPendingResolutions() {
        try {
            const nextId = await this.contract.nextMarketId();
            const marketCount = parseInt(nextId.toString());

            if (marketCount === 0) return;

            console.log(`🔍 Checking ${marketCount} markets for resolution requests...`);
            const currentTime = Math.floor(Date.now() / 1000);

            for (let i = 0; i < marketCount; i++) {
                try {
                    const market = await this.contract.markets(BigInt(i));
                    const status = Number(market.status);
                    const endTime = Number(market.endTime);

                    // Check if market is closed but not yet resolution requested
                    // Status 0 = Open, Status 1 = Closed
                    if ((status === 0 || status === 1) && currentTime >= endTime) {
                        console.log(`📢 Market ${i} has ended. Requesting resolution...`);

                        try {
                            // Call requestResolution on the contract
                            const tx = await this.contract.requestResolution(
                                BigInt(i),
                                'Automatic resolution request by monitoring service'
                            );

                            console.log(`⏳ Waiting for requestResolution transaction: ${tx.hash}`);
                            await tx.wait();
                            console.log(`✅ Resolution requested for market ${i}`);

                            // Add delay to avoid rate limiting
                            await new Promise(resolve => setTimeout(resolve, 3000));
                        } catch (reqError) {
                            console.error(`❌ Failed to request resolution for market ${i}:`, reqError.message);
                        }
                    }
                    // Status 2 = ResolutionRequested - now resolve it
                    else if (status === 2) {
                        console.log(`📢 Found resolution request for market ${i}. Calling AI...`);
                        await this.resolveMarket(i);

                        // Add delay to avoid rate limiting
                        await new Promise(resolve => setTimeout(resolve, 3000));
                    }
                } catch (error) {
                    console.error(`❌ Failed to check market ${i}:`, error.message);
                    continue;
                }
            }
        } catch (error) {
            console.error('❌ Error in checkForPendingResolutions:', error.message);
        }
    }

    /**
     * Resolve a specific market using AI
     */
    async resolveMarket(marketId) {
        try {
            console.log(`🔍 Starting resolution for market ${marketId}...`);

            // Get market details from blockchain
            const market = await this.contract.markets(BigInt(marketId));

            const question = market.question;
            const endTime = Number(market.endTime);
            const status = Number(market.status);

            // Check if already resolved
            if (status >= 3) { // Status 3 = Resolved
                console.log(`✅ Market ${marketId} already resolved`);
                return { success: false, reason: 'Market already resolved' };
            }

            // Check if market has ended
            const currentTime = Math.floor(Date.now() / 1000);
            if (currentTime < endTime) {
                console.log(`⏳ Market ${marketId} has not ended yet`);
                return { success: false, reason: 'Market not ended' };
            }

            console.log(`✅ Market ${marketId} ready for resolution. Calling AI...`);

            // Call AI resolution
            const resolution = await this.callAIResolution({
                question: question,
                endTime: endTime,
                marketId: marketId
            });

            console.log(`🤖 AI Resolution for market ${marketId}:`, resolution);

            // Check if resolution failed due to API error
            if (resolution.apiError) {
                console.log(`🚫 Cannot resolve market ${marketId} due to API unavailability`);
                return {
                    success: false,
                    reason: 'AI resolution service unavailable',
                    apiError: true
                };
            }

            // Only resolve if AI has high confidence (70%+)
            if (resolution.outcome !== null && resolution.confidence >= 70) {
                console.log(`📝 Submitting resolution to blockchain...`);

                // Call the contract to record the resolution
                const tx = await this.contract.resolveMarket(
                    BigInt(marketId),
                    resolution.outcome,
                    resolution.reason.substring(0, 200), // Limit reason length
                    BigInt(resolution.confidence)
                );

                console.log(`⏳ Waiting for transaction confirmation: ${tx.hash}`);
                const receipt = await tx.wait();

                console.log(`✅ Market ${marketId} resolved: ${resolution.outcome === 1 ? 'YES' : 'NO'} (${resolution.confidence}% confidence)`);
                console.log(`   Transaction: ${tx.hash}`);

                return {
                    success: true,
                    outcome: resolution.outcome,
                    txHash: tx.hash,
                    confidence: resolution.confidence
                };
            } else {
                console.log(`❓ Market ${marketId} - Low confidence (${resolution.confidence}%) or unclear outcome`);
                return {
                    success: false,
                    reason: `Low confidence (${resolution.confidence}%) or unclear outcome`,
                    resolution: resolution
                };
            }

        } catch (error) {
            console.error(`💥 Error resolving market ${marketId}:`, error);
            return {
                success: false,
                reason: error.message,
                error: true
            };
        }
    }

    /**
     * Call AI resolution API
     */
    async callAIResolution(marketData) {
        try {
            // Use local API for testing
            const apiUrl = process.env.RESOLUTION_API_URL || 'http://localhost:3001/api/resolveMarket';

            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(marketData),
            });

            if (!response.ok) {
                throw new Error(`AI server returned ${response.status}: ${await response.text()}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Error calling AI resolution server:', error);
            return {
                success: false,
                outcome: null,
                reason: 'AI resolution service unavailable',
                confidence: 0,
                sources: [],
                evidence: '',
                resolvedAt: new Date().toISOString(),
                apiError: true
            };
        }
    }
}

module.exports = BlockchainResolutionService;
