import { ethers } from 'ethers';
import {
    Market,
    MarketStatus,
    CreateMarketParams,
    ValidationResponse,
} from '../types';
import { NETWORKS, calculatePrice, formatAmount, retry } from '../utils';
import BNB_MARKET_ABI from '../abis/bnb-market-abi.json';
import PDX_MARKET_ABI from '../abis/pdx-market-abi.json';

interface Config {
    network?: 'testnet' | 'mainnet';
    apiBaseUrl?: string;
    apiKey?: string;
}

/**
 * Market API - Handles all market-related operations
 */
export class MarketAPI {
    private provider: ethers.Provider;
    private signer?: ethers.Signer;
    private contracts: Map<string, ethers.Contract>;
    private config: Config;

    constructor(provider: ethers.Provider, signer?: ethers.Signer, config?: Config) {
        this.provider = provider;
        this.signer = signer;
        this.config = config || {};
        this.contracts = new Map();
        this.initializeContracts();
    }

    /**
     * Initialize contract instances
     */
    private initializeContracts() {
        const networkConfig = NETWORKS[this.config.network || 'testnet'];

        // BNB Market Contract
        this.contracts.set(
            'BNB',
            new ethers.Contract(
                networkConfig.contracts.bnbMarket,
                BNB_MARKET_ABI,
                this.signer || this.provider
            )
        );

        // PDX Market Contract
        this.contracts.set(
            'PDX',
            new ethers.Contract(
                networkConfig.contracts.pdxMarket,
                PDX_MARKET_ABI,
                this.signer || this.provider
            )
        );
    }

    /**
     * Get all markets for a specific token
     * 
     * @param token - 'BNB' or 'PDX'
     * @param filters - Optional filters (status, category)
     * @returns Array of markets
     */
    async getAllMarkets(
        token: 'BNB' | 'PDX' = 'BNB',
        filters?: { status?: MarketStatus; category?: string }
    ): Promise<Market[]> {
        const contract = this.contracts.get(token);
        if (!contract) throw new Error(`Contract not found for ${token}`);

        const nextId = await retry(() => contract.nextMarketId());
        const markets: Market[] = [];

        // Fetch all markets in parallel
        const promises: Promise<Market | null>[] = [];
        for (let i = 0; i < Number(nextId); i++) {
            promises.push(this.getMarket(i, token));
        }

        const results = await Promise.allSettled(promises);

        for (const result of results) {
            if (result.status === 'fulfilled' && result.value) {
                const market = result.value;

                // Apply filters
                if (filters?.status !== undefined && market.status !== filters.status) {
                    continue;
                }
                if (filters?.category && market.category !== filters.category) {
                    continue;
                }

                markets.push(market);
            }
        }

        return markets;
    }

    /**
     * Get single market by ID
     * 
     * @param id - Market ID
     * @param token - 'BNB' or 'PDX'
     * @returns Market object or null
     */
    async getMarket(id: number, token: 'BNB' | 'PDX' = 'BNB'): Promise<Market | null> {
        const contract = this.contracts.get(token);
        if (!contract) throw new Error(`Contract not found for ${token}`);

        try {
            const data = await retry(() => contract.markets(id));

            const yesPool = formatAmount(data[8]);
            const noPool = formatAmount(data[9]);
            const prices = calculatePrice(yesPool, noPool);

            return {
                id,
                creator: data[0],
                question: data[1],
                category: data[2],
                endTime: Number(data[3]),
                status: Number(data[4]) as MarketStatus,
                outcome: Number(data[5]),
                yesToken: data[6],
                noToken: data[7],
                yesPool,
                noPool,
                totalBacking: formatAmount(data[11]),
                platformFees: formatAmount(data[12]),
                paymentToken: token,
                yesPrice: prices.yesPrice,
                noPrice: prices.noPrice,
            };
        } catch (error) {
            console.error(`Error fetching market ${id}:`, error);
            return null;
        }
    }

    /**
     * Create a new prediction market
     * 
     * @param params - Market creation parameters
     * @param token - 'BNB' or 'PDX'
     * @returns Market ID of created market
     */
    async createMarket(
        params: CreateMarketParams,
        token: 'BNB' | 'PDX' = 'BNB'
    ): Promise<number> {
        if (!this.signer) {
            throw new Error('Signer required to create market');
        }

        const contract = this.contracts.get(token);
        if (!contract) {
            throw new Error(`Contract not found for ${token}`);
        }

        // Validate market with AI API
        const validation = await this.validateMarket({
            ...params,
            initialYes: params.initialYes,
            initialNo: params.initialNo,
        });

        if (!validation.valid) {
            throw new Error(`Market validation failed: ${validation.reason}`);
        }

        // Calculate total liquidity needed
        const initialYes = ethers.parseEther(params.initialYes);
        const initialNo = ethers.parseEther(params.initialNo);
        const totalLiquidity = initialYes + initialNo;

        // Create market transaction
        const tx = await contract.createMarket(
            params.question,
            validation.category || params.category || 'OTHER',
            params.endTime,
            initialYes,
            initialNo,
            token === 'BNB' ? { value: totalLiquidity } : {}
        );

        const receipt = await tx.wait();

        // Extract market ID from event
        const event = receipt.logs.find((log: any) => {
            try {
                const parsed = contract.interface.parseLog(log);
                return parsed?.name === 'MarketCreated';
            } catch {
                return false;
            }
        });

        if (event) {
            const parsed = contract.interface.parseLog(event);
            return Number(parsed?.args?.id || 0);
        }

        return 0;
    }

    /**
     * Validate market question with AI
     * 
     * @param params - Market parameters to validate
     * @returns Validation response
     */
    async validateMarket(params: CreateMarketParams): Promise<ValidationResponse> {
        try {
            const response = await fetch(`${this.config.apiBaseUrl}/validateMarket`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(this.config.apiKey && { Authorization: `Bearer ${this.config.apiKey}` }),
                },
                body: JSON.stringify({
                    question: params.question,
                    endTime: params.endTime,
                    initialYes: params.initialYes,
                    initialNo: params.initialNo,
                }),
            });

            if (!response.ok) {
                throw new Error(`Validation API error: ${response.statusText}`);
            }

            return await response.json() as ValidationResponse;
        } catch (error) {
            console.error('Validation error:', error);
            return {
                valid: false,
                reason: 'Validation service unavailable',
                apiError: true,
            };
        }
    }

    /**
     * Get active markets (status = Open)
     */
    async getActiveMarkets(token: 'BNB' | 'PDX' = 'BNB'): Promise<Market[]> {
        return this.getAllMarkets(token, { status: MarketStatus.Open });
    }

    /**
     * Get markets by category
     */
    async getMarketsByCategory(
        category: string,
        token: 'BNB' | 'PDX' = 'BNB'
    ): Promise<Market[]> {
        return this.getAllMarkets(token, { category });
    }

    /**
     * Get markets created by a user
     */
    async getMarketsCreatedBy(
        creatorAddress: string,
        token: 'BNB' | 'PDX' = 'BNB'
    ): Promise<Market[]> {
        const allMarkets = await this.getAllMarkets(token);
        return allMarkets.filter(
            (m) => m.creator.toLowerCase() === creatorAddress.toLowerCase()
        );
    }

    /**
     * Update signer
     */
    setSigner(signer: ethers.Signer) {
        this.signer = signer;
        this.initializeContracts();
    }
}
