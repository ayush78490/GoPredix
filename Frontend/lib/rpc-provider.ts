import { ethers, JsonRpcProvider, FetchRequest } from 'ethers'

/**
 * Multiple BNB Smart Chain Testnet RPC URLs for fallback
 * Ordered by reliability and speed
 */
const BNB_TESTNET_RPC_URLS = [
    'https://data-seed-prebsc-1-s1.binance.org:8545',
    'https://data-seed-prebsc-2-s1.binance.org:8545',
    'https://bsc-testnet.publicnode.com',
    'https://bsc-testnet-rpc.publicnode.com',
    'https://data-seed-prebsc-1-s2.binance.org:8545',
    'https://data-seed-prebsc-2-s2.binance.org:8545',
]

/**
 * Custom provider that automatically falls back to next RPC URL on failure
 */
class FallbackRpcProvider extends JsonRpcProvider {
    private currentUrlIndex = 0
    private readonly urls: string[]
    private failureCount = 0
    private readonly maxFailuresBeforeSwitch = 3

    constructor(urls: string[], chainId: number = 97) {
        super(urls[0], chainId)
        this.urls = urls
    }

    /**
     * Override send to implement fallback logic
     */
    async send(method: string, params: any[]): Promise<any> {
        let lastError: Error | null = null

        // Try current provider first
        for (let attempt = 0; attempt < this.urls.length; attempt++) {
            try {
                const result = await super.send(method, params)

                // Reset failure count on success
                if (this.failureCount > 0) {
                    console.log(`✅ RPC recovered after ${this.failureCount} failures`)
                    this.failureCount = 0
                }

                return result
            } catch (error: any) {
                lastError = error
                this.failureCount++

                // Check if it's a rate limit error
                const isRateLimit =
                    error?.message?.includes('rate limit') ||
                    error?.code === -32005 ||
                    error?.error?.code === -32005

                console.warn(
                    `⚠️ RPC ${method} failed on ${this.urls[this.currentUrlIndex]} (attempt ${attempt + 1}/${this.urls.length})`,
                    isRateLimit ? 'RATE LIMIT' : error?.message
                )

                // Switch to next provider if we've hit too many failures or rate limit
                if (isRateLimit || this.failureCount >= this.maxFailuresBeforeSwitch) {
                    await this.switchToNextProvider()
                }

                // Wait before retry (exponential backoff)
                if (attempt < this.urls.length - 1) {
                    const delay = Math.min(1000 * Math.pow(2, attempt), 5000)
                    await new Promise(resolve => setTimeout(resolve, delay))
                }
            }
        }

        // All providers failed
        console.error('❌ All RPC providers failed')
        throw lastError || new Error('All RPC providers failed')
    }

    /**
     * Switch to the next available RPC provider
     */
    private async switchToNextProvider(): Promise<void> {
        const oldIndex = this.currentUrlIndex
        this.currentUrlIndex = (this.currentUrlIndex + 1) % this.urls.length

        const newUrl = this.urls[this.currentUrlIndex]
        console.log(`🔄 Switching RPC provider: ${this.urls[oldIndex]} → ${newUrl}`)

        // Update the provider's connection
        try {
            // Create new fetch request for the new URL
            const connection = new FetchRequest(newUrl)
            connection.timeout = 30000 // 30 second timeout

            // @ts-ignore - accessing private property
            this._getConnection = () => connection.clone()

            this.failureCount = 0
        } catch (error) {
            console.error('Failed to switch provider:', error)
        }
    }

    /**
     * Get current RPC URL
     */
    getCurrentUrl(): string {
        return this.urls[this.currentUrlIndex]
    }

    /**
     * Manually switch to a specific provider index
     */
    switchToProvider(index: number): void {
        if (index >= 0 && index < this.urls.length) {
            this.currentUrlIndex = index
            console.log(`🔄 Manually switched to RPC: ${this.urls[index]}`)
        }
    }
}

/**
 * Create a BNB Testnet provider with automatic fallback
 */
export function createBNBTestnetProvider(): FallbackRpcProvider {
    const provider = new FallbackRpcProvider(BNB_TESTNET_RPC_URLS, 97)
    console.log('✅ Created fallback RPC provider with', BNB_TESTNET_RPC_URLS.length, 'endpoints')
    return provider
}

/**
 * Create a standard provider (for backward compatibility)
 */
export function createStandardProvider(url?: string): JsonRpcProvider {
    const rpcUrl = url || BNB_TESTNET_RPC_URLS[0]
    return new JsonRpcProvider(rpcUrl, 97)
}

/**
 * Get all available RPC URLs
 */
export function getAvailableRpcUrls(): string[] {
    return [...BNB_TESTNET_RPC_URLS]
}
