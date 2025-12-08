import { ethers } from 'ethers';

/**
 * Network configurations
 */
export const NETWORKS = {
    testnet: {
        chainId: 97,
        name: 'BNB Smart Chain Testnet',
        rpcUrl: 'https://data-seed-prebsc-1-s1.binance.org:8545/',
        blockExplorer: 'https://testnet.bscscan.com',
        contracts: {
            bnbMarket: '0x12FD6C9B618949d940806B0E59e3c65507eC37E8',
            pdxMarket: '0x7d46139e1513571f19c9B87cE9A01D21cA9ef665',
            pdxToken: '0xeE943aCCAa07ED556DfAc9d3a76015050fA78BC8',
            pdxFaucet: '0xD3561841A6dd046943739B704bcc737aAeE4cd77',
        },
    },
    mainnet: {
        chainId: 56,
        name: 'BNB Smart Chain',
        rpcUrl: 'https://bsc-dataseed.binance.org/',
        blockExplorer: 'https://bscscan.com',
        contracts: {
            bnbMarket: '', // To be deployed
            pdxMarket: '',
            pdxToken: '',
            pdxFaucet: '',
        },
    },
} as const;

/**
 * Format wei to ether
 */
export function formatAmount(amount: bigint | string): string {
    return ethers.formatEther(amount);
}

/**
 * Parse ether to wei
 */
export function parseAmount(amount: string): bigint {
    return ethers.parseEther(amount);
}

/**
 * Calculate price from pool ratio
 */
export function calculatePrice(yesPool: string, noPool: string): { yesPrice: number; noPrice: number } {
    const yes = parseFloat(yesPool);
    const no = parseFloat(noPool);
    const total = yes + no;

    if (total === 0) {
        return { yesPrice: 50, noPrice: 50 };
    }

    const yesPrice = (no / total) * 100;
    const noPrice = (yes / total) * 100;

    return {
        yesPrice: Math.round(yesPrice * 100) / 100,
        noPrice: Math.round(noPrice * 100) / 100,
    };
}

/**
 * Calculate multiplier for a trade
 */
export function calculateMultiplier(
    amountIn: string,
    poolFrom: string,
    poolTo: string,
    feeBps: number = 50
): number {
    const input = parseFloat(amountIn);
    const from = parseFloat(poolFrom);
    const to = parseFloat(poolTo);

    if (input === 0 || from === 0 || to === 0) return 0;

    const amountAfterFee = input * (1 - feeBps / 10000);
    const k = from * to;
    const newFrom = from + amountAfterFee;
    const newTo = k / newFrom;
    const outputAmount = to - newTo;

    return outputAmount / input;
}

/**
 * Format timestamp to date string
 */
export function formatEndTime(timestamp: number): string {
    const date = new Date(timestamp * 1000);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

/**
 * Check if market has ended
 */
export function hasMarketEnded(endTime: number): boolean {
    return Date.now() / 1000 > endTime;
}

/**
 * Validate address
 */
export function isValidAddress(address: string): boolean {
    return ethers.isAddress(address);
}

/**
 * Shorten address for display
 */
export function shortenAddress(address: string, chars: number = 4): string {
    if (!isValidAddress(address)) return address;
    return `${address.substring(0, chars + 2)}...${address.substring(42 - chars)}`;
}

/**
 * Wait for transaction with retries
 */
export async function waitForTransaction(
    provider: ethers.Provider,
    hash: string,
    confirmations: number = 1,
    timeout: number = 60000
): Promise<ethers.TransactionReceipt> {
    const receipt = await provider.waitForTransaction(hash, confirmations, timeout);
    if (!receipt) {
        throw new Error('Transaction receipt not found');
    }
    return receipt;
}

/**
 * Retry function with exponential backoff
 */
export async function retry<T>(
    fn: () => Promise<T>,
    maxRetries: number = 3,
    delayMs: number = 1000
): Promise<T> {
    let lastError: Error;

    for (let i = 0; i < maxRetries; i++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error as Error;
            if (i < maxRetries - 1) {
                await new Promise((resolve) => setTimeout(resolve, delayMs * Math.pow(2, i)));
            }
        }
    }

    throw lastError!;
}
