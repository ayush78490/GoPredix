import { ethers } from 'ethers';
import { UserStats } from '../types';
import { NETWORKS, formatAmount } from '../utils';
import BNB_MARKET_ABI from '../abis/bnb-market-abi.json';
import PDX_MARKET_ABI from '../abis/pdx-market-abi.json';

interface Config {
    network?: 'testnet' | 'mainnet';
}

/**
 * Account API - Handles user account and statistics
 */
export class AccountAPI {
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
    }

    /**
     * Get user statistics
     */
    async getUserStats(
        userAddress: string,
        token: 'BNB' | 'PDX' = 'BNB'
    ): Promise<UserStats> {
        const contract = this.contracts.get(token);
        if (!contract) {
            throw new Error(`Contract not found for ${token}`);
        }

        const nextId = await contract.nextMarketId();
        let totalInvested = 0;
        let totalPnL = 0;
        let activePositions = 0;
        let marketsCreated = 0;

        for (let i = 0; i < Number(nextId); i++) {
            try {
                const market = await contract.markets(i);
                const investment = await contract.userInvestments(i, userAddress);

                const invested = parseFloat(formatAmount(investment.totalInvested));
                if (invested > 0) {
                    totalInvested += invested;
                    activePositions++;

                    // Calculate P&L if market is resolved
                    if (Number(market[4]) === 3) {
                        // Status.Resolved
                        const outcome = Number(market[5]);
                        const yesBalance = parseFloat(formatAmount(investment.yesBalance));
                        const noBalance = parseFloat(formatAmount(investment.noBalance));

                        if (outcome === 1) {
                            // YES won
                            totalPnL += yesBalance - invested;
                        } else if (outcome === 2) {
                            // NO won
                            totalPnL += noBalance - invested;
                        }
                    }
                }

                // Check if user created this market
                if (market[0].toLowerCase() === userAddress.toLowerCase()) {
                    marketsCreated++;
                }
            } catch (error) {
                console.error(`Error processing market ${i}:`, error);
            }
        }

        return {
            address: userAddress,
            totalInvested: totalInvested.toFixed(4),
            totalPnL: totalPnL.toFixed(4),
            activePositions,
            marketsCreated,
        };
    }

    /**
     * Get BNB balance
     */
    async getBNBBalance(userAddress: string): Promise<string> {
        const balance = await this.provider.getBalance(userAddress);
        return formatAmount(balance);
    }

    /**
     * Get PDX token balance
     */
    async getPDXBalance(userAddress: string): Promise<string> {
        const networkConfig = NETWORKS[this.config.network || 'testnet'];
        const pdxContract = new ethers.Contract(
            networkConfig.contracts.pdxToken,
            ['function balanceOf(address) view returns (uint256)'],
            this.provider
        );

        const balance = await pdxContract.balanceOf(userAddress);
        return formatAmount(balance);
    }

    setSigner(signer: ethers.Signer) {
        this.signer = signer;
        this.initializeContracts();
    }
}
