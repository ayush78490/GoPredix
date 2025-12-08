import { ethers } from 'ethers';
import { MarketAPI } from '../markets/MarketAPI';
import { TradingAPI } from '../trading/TradingAPI';
import { AccountAPI } from '../accounts/AccountAPI';
import { NETWORKS } from '../utils';

/**
 * GoPredix SDK Configuration
 */
export interface GoPredixConfig {
    network: 'testnet' | 'mainnet';
    provider?: ethers.Provider;
    signer?: ethers.Signer;
    apiKey?: string;
    rpcUrl?: string;
    apiBaseUrl?: string;
}

/**
 * Main GoPredix SDK Client
 * 
 * @example
 * ```typescript
 * const client = new GoPredixClient({
 *   network: 'testnet',
 * });
 * 
 * const markets = await client.markets.getAllMarkets('BNB');
 * ```
 */
export class GoPredixClient {
    public markets: MarketAPI;
    public trading: TradingAPI;
    public accounts: AccountAPI;

    private provider: ethers.Provider;
    private signer?: ethers.Signer;
    private config: GoPredixConfig;

    constructor(config: GoPredixConfig) {
        this.config = {
            ...config,
            apiBaseUrl: config.apiBaseUrl || 'https://www.gopredix.xyz/api',
        };

        // Initialize provider
        this.provider = config.provider || this.getDefaultProvider();
        this.signer = config.signer;

        // Initialize API modules
        this.markets = new MarketAPI(this.provider, this.signer, this.config);
        this.trading = new TradingAPI(this.provider, this.signer, this.config);
        this.accounts = new AccountAPI(this.provider, this.signer, this.config);
    }

    /**
     * Get default provider based on network
     */
    private getDefaultProvider(): ethers.Provider {
        const networkConfig = NETWORKS[this.config.network];
        const rpcUrl = this.config.rpcUrl || networkConfig.rpcUrl;
        return new ethers.JsonRpcProvider(rpcUrl);
    }

    /**
     * Set signer for write operations
     */
    async setSigner(signer: ethers.Signer): Promise<void> {
        this.signer = signer;
        this.markets.setSigner(signer);
        this.trading.setSigner(signer);
        this.accounts.setSigner(signer);
    }

    /**
     * Get current network config
     */
    getNetworkConfig() {
        return NETWORKS[this.config.network];
    }

    /**
     * Get provider
     */
    getProvider(): ethers.Provider {
        return this.provider;
    }

    /**
     * Get signer
     */
    getSigner(): ethers.Signer | undefined {
        return this.signer;
    }
}
