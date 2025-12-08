import { describe, it, expect, beforeEach } from 'vitest';
import { GoPredixClient } from '../client/GoPredixClient';

describe('GoPredixClient', () => {
    let client: GoPredixClient;

    beforeEach(() => {
        client = new GoPredixClient({
            network: 'testnet',
        });
    });

    it('should initialize client correctly', () => {
        expect(client).toBeDefined();
        expect(client.markets).toBeDefined();
        expect(client.trading).toBeDefined();
        expect(client.accounts).toBeDefined();
    });

    it('should get network config', () => {
        const config = client.getNetworkConfig();
        expect(config.chainId).toBe(97);
        expect(config.name).toBe('BNB Smart Chain Testnet');
    });
});

describe('MarketAPI', () => {
    let client: GoPredixClient;

    beforeEach(() => {
        client = new GoPredixClient({
            network: 'testnet',
        });
    });

    it('should fetch all markets', async () => {
        const markets = await client.markets.getAllMarkets('BNB');
        expect(Array.isArray(markets)).toBe(true);
    });

    it('should fetch single market', async () => {
        const market = await client.markets.getMarket(0, 'BNB');
        expect(market).toBeDefined();
        if (market) {
            expect(market).toHaveProperty('id');
            expect(market).toHaveProperty('question');
            expect(market).toHaveProperty('yesPrice');
            expect(market).toHaveProperty('noPrice');
        }
    });
});

describe('Utils', () => {
    it('should calculate prices correctly', async () => {
        const { calculatePrice } = await import('../utils');

        const prices = calculatePrice('50', '50');
        expect(prices.yesPrice).toBe(50);
        expect(prices.noPrice).toBe(50);

        const prices2 = calculatePrice('75', '25');
        expect(prices2.yesPrice).toBe(25);
        expect(prices2.noPrice).toBe(75);
    });

    it('should format amounts correctly', async () => {
        const { formatAmount, parseAmount } = await import('../utils');

        const formatted = formatAmount('1000000000000000000'); // 1 ETH in wei
        expect(formatted).toBe('1.0');

        const parsed = parseAmount('1.0');
        expect(parsed.toString()).toBe('1000000000000000000');
    });
});
