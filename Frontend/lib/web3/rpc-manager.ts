// lib/web3/rpc-manager.ts
import { ethers } from 'ethers';
import { CHAIN_CONFIG } from './config';

class RPCManager {
    private currentRpcIndex = 0;
    private rpcUrls: string[];
    private failedRpcs: Set<string> = new Set();
    private lastRequestTime: number = 0;
    private minRequestInterval = 100; // Minimum 100ms between requests
    private requestQueue: Array<() => Promise<any>> = [];
    private isProcessingQueue = false;

    constructor() {
        this.rpcUrls = CHAIN_CONFIG.rpcUrls;
    }

    /**
     * Get the current RPC URL, automatically switching to next if current one failed
     */
    getCurrentRpcUrl(): string {
        // If current RPC has failed, move to next one
        if (this.failedRpcs.has(this.rpcUrls[this.currentRpcIndex])) {
            this.switchToNextRpc();
        }

        return this.rpcUrls[this.currentRpcIndex];
    }

    /**
     * Switch to the next available RPC
     */
    private switchToNextRpc(): void {
        const startIndex = this.currentRpcIndex;

        do {
            this.currentRpcIndex = (this.currentRpcIndex + 1) % this.rpcUrls.length;

            // If we've tried all RPCs, clear the failed set and start over
            if (this.currentRpcIndex === startIndex) {
                console.warn('All RPCs have failed, clearing failed list and retrying');
                this.failedRpcs.clear();
                break;
            }
        } while (this.failedRpcs.has(this.rpcUrls[this.currentRpcIndex]));

        console.log(`Switched to RPC: ${this.getCurrentRpcUrl()}`);
    }

    /**
     * Mark current RPC as failed and switch to next
     */
    markCurrentRpcAsFailed(): void {
        const currentRpc = this.rpcUrls[this.currentRpcIndex];
        this.failedRpcs.add(currentRpc);
        console.warn(`RPC marked as failed: ${currentRpc}`);
        this.switchToNextRpc();
    }

    /**
     * Create a provider with automatic fallback
     */
    getProvider(): ethers.JsonRpcProvider {
        const rpcUrl = this.getCurrentRpcUrl();
        return new ethers.JsonRpcProvider(rpcUrl);
    }

    /**
     * Execute a request with throttling and retry logic
     */
    async executeWithRetry<T>(
        fn: (provider: ethers.JsonRpcProvider) => Promise<T>,
        maxRetries = 3
    ): Promise<T> {
        return new Promise((resolve, reject) => {
            this.requestQueue.push(async () => {
                let lastError: Error | null = null;

                for (let attempt = 0; attempt < maxRetries; attempt++) {
                    try {
                        // Throttle requests
                        const now = Date.now();
                        const timeSinceLastRequest = now - this.lastRequestTime;
                        if (timeSinceLastRequest < this.minRequestInterval) {
                            await new Promise(r => setTimeout(r, this.minRequestInterval - timeSinceLastRequest));
                        }
                        this.lastRequestTime = Date.now();

                        const provider = this.getProvider();
                        const result = await fn(provider);
                        return result;
                    } catch (error: any) {
                        lastError = error;

                        // Check if it's a rate limit error
                        const errorMessage = error.message?.toLowerCase() || '';
                        const isRateLimit =
                            errorMessage.includes('rate limit') ||
                            errorMessage.includes('too many requests') ||
                            errorMessage.includes('429') ||
                            error.code === 'CALL_EXCEPTION';

                        if (isRateLimit && attempt < maxRetries - 1) {
                            console.warn(`Rate limit detected, switching RPC (attempt ${attempt + 1}/${maxRetries})`);
                            this.markCurrentRpcAsFailed();

                            // Wait before retry with exponential backoff
                            await new Promise(r => setTimeout(r, Math.min(1000 * Math.pow(2, attempt), 5000)));
                            continue;
                        }

                        // If not rate limit or last attempt, throw
                        if (attempt === maxRetries - 1) {
                            throw error;
                        }
                    }
                }

                throw lastError || new Error('Request failed after retries');
            });

            this.processQueue().then(resolve).catch(reject);
        });
    }

    /**
     * Process the request queue
     */
    private async processQueue(): Promise<any> {
        if (this.isProcessingQueue || this.requestQueue.length === 0) {
            return;
        }

        this.isProcessingQueue = true;

        while (this.requestQueue.length > 0) {
            const request = this.requestQueue.shift();
            if (request) {
                try {
                    const result = await request();
                    this.isProcessingQueue = false;
                    return result;
                } catch (error) {
                    this.isProcessingQueue = false;
                    throw error;
                }
            }
        }

        this.isProcessingQueue = false;
    }

    /**
     * Reset failed RPCs (useful for periodic cleanup)
     */
    resetFailedRpcs(): void {
        this.failedRpcs.clear();
        console.log('Failed RPCs list cleared');
    }
}

// Export singleton instance
export const rpcManager = new RPCManager();

// Reset failed RPCs every 5 minutes
if (typeof window !== 'undefined') {
    setInterval(() => {
        rpcManager.resetFailedRpcs();
    }, 5 * 60 * 1000);
}
