import { ethers } from 'ethers';
import { Position, TradeParams, MultiplierInfo } from '../types';
import { NETWORKS, formatAmount, parseAmount, retry } from '../utils';
import BNB_MARKET_ABI from '../abis/bnb-market-abi.json';
import PDX_MARKET_ABI from '../abis/pdx-market-abi.json';
import ERC20_ABI from '../abis/erc20-abi.json';

interface Config {
    network?: 'testnet' | 'mainnet';
}

/**
 * Trading API - Handles all trading operations
 */
export class TradingAPI {
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

    private initializeContracts() {
        const networkConfig = NETWORKS[this.config.network || 'testnet'];

        this.contracts.set(
            'BNB',
            new ethers.Contract(
                networkConfig.contracts.bnbMarket,
                BNB_MARKET_ABI,
                this.signer || this.provider
            )
        );

        this.contracts.set(
            'PDX',
            new ethers.Contract(
                networkConfig.contracts.pdxMarket,
                PDX_MARKET_ABI,
                this.signer || this.provider
            )
        );

        this.contracts.set(
            'PDX_TOKEN',
            new ethers.Contract(
                networkConfig.contracts.pdxToken,
                ERC20_ABI,
                this.signer || this.provider
            )
        );
    }

    /**
     * Buy YES tokens
     * 
     * @param marketId - Market ID
     * @param amount - Amount to invest (in BNB or PDX)
     * @param token - 'BNB' or 'PDX'
     * @param minOut - Minimum tokens to receive (slippage protection)
     * @returns Transaction hash
     */
    async buyYes(
        marketId: number,
        amount: string,
        token: 'BNB' | 'PDX' = 'BNB',
        minOut: string = '0'
    ): Promise<string> {
        if (!this.signer) {
            throw new Error('Signer required for trading');
        }

        const contract = this.contracts.get(token);
        if (!contract) {
            throw new Error(`Contract not found for ${token}`);
        }

        const userAddress = await this.signer.getAddress();
        const amountWei = parseAmount(amount);
        const minOutWei = parseAmount(minOut);

        let tx;

        if (token === 'BNB') {
            tx = await contract.buyYesWithBNBFor(marketId, userAddress, minOutWei, {
                value: amountWei,
            });
        } else {
            // For PDX, need to approve first
            await this.approveToken(amount, token);
            tx = await contract.buyYesWithPDXFor(marketId, userAddress, amountWei, minOutWei);
        }

        const receipt = await tx.wait();
        return receipt.hash;
    }

    /**
     * Buy NO tokens
     * 
     * @param marketId - Market ID
     * @param amount - Amount to invest
     * @param token - 'BNB' or 'PDX'
     * @param minOut - Minimum tokens to receive
     * @returns Transaction hash
     */
    async buyNo(
        marketId: number,
        amount: string,
        token: 'BNB' | 'PDX' = 'BNB',
        minOut: string = '0'
    ): Promise<string> {
        if (!this.signer) {
            throw new Error('Signer required for trading');
        }

        const contract = this.contracts.get(token);
        if (!contract) {
            throw new Error(`Contract not found for ${token}`);
        }

        const userAddress = await this.signer.getAddress();
        const amountWei = parseAmount(amount);
        const minOutWei = parseAmount(minOut);

        let tx;

        if (token === 'BNB') {
            tx = await contract.buyNoWithBNBFor(marketId, userAddress, minOutWei, {
                value: amountWei,
            });
        } else {
            await this.approveToken(amount, token);
            tx = await contract.buyNoWithPDXFor(marketId, userAddress, amountWei, minOutWei);
        }

        const receipt = await tx.wait();
        return receipt.hash;
    }

    /**
     * Sell YES tokens
     * 
     * @param marketId - Market ID
     * @param tokenAmount - Amount of YES tokens to sell
     * @param token - 'BNB' or 'PDX'
     * @param minOut - Minimum BNB/PDX to receive
     * @returns Transaction hash
     */
    async sellYes(
        marketId: number,
        tokenAmount: string,
        token: 'BNB' | 'PDX' = 'BNB',
        minOut: string = '0'
    ): Promise<string> {
        if (!this.signer) {
            throw new Error('Signer required for trading');
        }

        const contract = this.contracts.get(token);
        if (!contract) {
            throw new Error(`Contract not found for ${token}`);
        }

        const amountWei = parseAmount(tokenAmount);
        const minOutWei = parseAmount(minOut);

        const tx = await contract.sellYesForBNB(marketId, amountWei, minOutWei);
        const receipt = await tx.wait();
        return receipt.hash;
    }

    /**
     * Sell NO tokens
     */
    async sellNo(
        marketId: number,
        tokenAmount: string,
        token: 'BNB' | 'PDX' = 'BNB',
        minOut: string = '0'
    ): Promise<string> {
        if (!this.signer) {
            throw new Error('Signer required for trading');
        }

        const contract = this.contracts.get(token);
        if (!contract) {
            throw new Error(`Contract not found for ${token}`);
        }

        const amountWei = parseAmount(tokenAmount);
        const minOutWei = parseAmount(minOut);

        const tx = await contract.sellNoForBNB(marketId, amountWei, minOutWei);
        const receipt = await tx.wait();
        return receipt.hash;
    }

    /**
     * Get buy multiplier (how many tokens you'll receive)
     */
    async getBuyMultiplier(
        marketId: number,
        amount: string,
        isYes: boolean,
        token: 'BNB' | 'PDX' = 'BNB'
    ): Promise<MultiplierInfo> {
        const contract = this.contracts.get(token);
        if (!contract) {
            throw new Error(`Contract not found for ${token}`);
        }

        const amountWei = parseAmount(amount);

        try {
            const result = isYes
                ? await contract.getBuyYesOutput(marketId, amountWei)
                : await contract.getBuyNoOutput(marketId, amountWei);

            return {
                multiplier: parseFloat(formatAmount(result[0])) / parseFloat(amount),
                totalOut: formatAmount(result[0]),
                totalFee: formatAmount(result[1]),
            };
        } catch (error) {
            console.error('Error getting multiplier:', error);
            return {
                multiplier: 0,
                totalOut: '0',
                totalFee: '0',
            };
        }
    }

    /**
     * Get user positions across all markets
     */
    async getUserPositions(
        userAddress: string,
        token: 'BNB' | 'PDX' = 'BNB'
    ): Promise<Position[]> {
        const contract = this.contracts.get(token);
        if (!contract) {
            throw new Error(`Contract not found for ${token}`);
        }

        try {
            const nextId = await contract.nextMarketId();
            const positions: Position[] = [];

            // Fetch positions in batches to avoid rate limiting
            const batchSize = 10;
            for (let i = 0; i < Number(nextId); i += batchSize) {
                const batch = [];
                const end = Math.min(i + batchSize, Number(nextId));

                for (let j = i; j < end; j++) {
                    batch.push(
                        retry(() => contract.userInvestments(j, userAddress))
                            .then((investment) => ({
                                marketId: j,
                                yesBalance: formatAmount(investment.yesBalance),
                                noBalance: formatAmount(investment.noBalance),
                                totalInvested: formatAmount(investment.totalInvested),
                            }))
                            .catch(() => null)
                    );
                }

                const results = await Promise.all(batch);

                for (const result of results) {
                    if (result && parseFloat(result.totalInvested) > 0) {
                        positions.push(result);
                    }
                }

                // Small delay between batches
                if (end < Number(nextId)) {
                    await new Promise((resolve) => setTimeout(resolve, 100));
                }
            }

            return positions;
        } catch (error) {
            console.error('Error fetching positions:', error);
            return [];
        }
    }

    /**
     * Approve PDX token for trading
     */
    private async approveToken(amount: string, token: 'PDX'): Promise<void> {
        const tokenContract = this.contracts.get('PDX_TOKEN');
        const marketContract = this.contracts.get(token);

        if (!tokenContract || !marketContract) {
            throw new Error('Token contract not found');
        }

        const amountWei = parseAmount(amount);
        const marketAddress = await marketContract.getAddress();

        const tx = await tokenContract.approve(marketAddress, amountWei);
        await tx.wait();
    }

    /**
     * Claim winnings after market resolution
     */
    async claimWinnings(
        marketId: number,
        token: 'BNB' | 'PDX' = 'BNB'
    ): Promise<string> {
        if (!this.signer) {
            throw new Error('Signer required');
        }

        const contract = this.contracts.get(token);
        if (!contract) {
            throw new Error(`Contract not found for ${token}`);
        }

        const tx = await contract.claimWinnings(marketId);
        const receipt = await tx.wait();
        return receipt.hash;
    }

    setSigner(signer: ethers.Signer) {
        this.signer = signer;
        this.initializeContracts();
    }
}
