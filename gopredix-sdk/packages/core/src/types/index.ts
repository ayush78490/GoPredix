/**
 * Market Status Enum
 */
export enum MarketStatus {
    Open = 0,
    Closed = 1,
    ResolutionRequested = 2,
    Resolved = 3,
    Disputed = 4,
}

/**
 * Outcome Enum
 */
export enum Outcome {
    Undecided = 0,
    Yes = 1,
    No = 2,
}

/**
 * Order Type Enum
 */
export enum OrderType {
    StopLoss = 0,
    TakeProfit = 1,
}

/**
 * Market Interface
 */
export interface Market {
    id: number;
    creator: string;
    question: string;
    category: string;
    endTime: number;
    status: MarketStatus;
    outcome: Outcome;
    yesToken: string;
    noToken: string;
    yesPool: string;
    noPool: string;
    totalBacking: string;
    platformFees?: string;
    paymentToken: 'BNB' | 'PDX';
    yesPrice?: number;
    noPrice?: number;
    yesMultiplier?: number;
    noMultiplier?: number;
    totalLiquidity?: string;
}

/**
 * Create Market Parameters
 */
export interface CreateMarketParams {
    question: string;
    category?: string;
    endTime: number;
    initialYes: string;
    initialNo: string;
}

/**
 * User Position Interface
 */
export interface Position {
    marketId: number;
    yesBalance: string;
    noBalance: string;
    totalInvested: string;
}

/**
 * Trade Parameters
 */
export interface TradeParams {
    marketId: number;
    amount: string;
    isYes: boolean;
    minOut?: string;
    slippage?: number;
}

/**
 * Multiplier Info
 */
export interface MultiplierInfo {
    multiplier: number;
    totalOut: string;
    totalFee: string;
}

/**
 * Trading Info
 */
export interface TradingInfo {
    yesMultiplier: number;
    noMultiplier: number;
    yesPrice: number;
    noPrice: number;
    totalLiquidity: string;
}

/**
 * Order Info
 */
export interface OrderInfo {
    user: string;
    marketId: number;
    isYes: boolean;
    tokenAmount: string;
    stopLossPrice: number;
    takeProfitPrice: number;
    isActive: boolean;
}

/**
 * Market Validation Response
 */
export interface ValidationResponse {
    valid: boolean;
    reason?: string;
    category?: string;
    apiError?: boolean;
}

/**
 * Network Configuration
 */
export interface NetworkConfig {
    chainId: number;
    name: string;
    rpcUrl: string;
    blockExplorer: string;
    contracts: {
        bnbMarket: string;
        pdxMarket: string;
        pdxToken: string;
        pdxFaucet: string;
    };
}

/**
 * User Stats
 */
export interface UserStats {
    address: string;
    totalInvested: string;
    totalPnL: string;
    activePositions: number;
    marketsCreated: number;
}
