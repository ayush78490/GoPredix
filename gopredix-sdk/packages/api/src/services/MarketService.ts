import { GoPredixClient } from '@gopredix/core';

export class MarketService {
    private client: GoPredixClient;

    constructor() {
        this.client = new GoPredixClient({
            network: (process.env.NETWORK as 'testnet' | 'mainnet') || 'testnet',
            rpcUrl: process.env.RPC_URL,
        });
    }

    async getAllMarkets(token: 'BNB' | 'PDX', filters?: any) {
        return this.client.markets.getAllMarkets(token, filters);
    }

    async getMarket(id: number, token: 'BNB' | 'PDX') {
        return this.client.markets.getMarket(id, token);
    }

    async getActiveMarkets(token: 'BNB' | 'PDX') {
        return this.client.markets.getActiveMarkets(token);
    }

    async getMarketsByCategory(category: string, token: 'BNB' | 'PDX') {
        return this.client.markets.getMarketsByCategory(category, token);
    }

    async validateMarket(params: any) {
        return this.client.markets.validateMarket(params);
    }
}
