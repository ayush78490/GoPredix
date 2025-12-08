import { GoPredixClient } from '@gopredix/core';

export class UserService {
    private client: GoPredixClient;

    constructor() {
        this.client = new GoPredixClient({
            network: (process.env.NETWORK as 'testnet' | 'mainnet') || 'testnet',
            rpcUrl: process.env.RPC_URL,
        });
    }

    async getUserPositions(address: string, token: 'BNB' | 'PDX') {
        return this.client.trading.getUserPositions(address, token);
    }

    async getUserStats(address: string, token: 'BNB' | 'PDX') {
        return this.client.accounts.getUserStats(address, token);
    }
}
