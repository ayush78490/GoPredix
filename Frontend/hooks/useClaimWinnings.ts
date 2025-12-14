import { useState, useEffect, useCallback } from 'react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { formatEther, parseAbi } from 'viem';
import { useToast } from './use-toast';

// ABI for the claim function and market structure
const PREDICTION_MARKET_ABI = parseAbi([
    'function claimRedemption(uint256 id) external',
    'function markets(uint256) view returns (address creator, string question, string category, uint256 endTime, uint8 status, uint8 outcome, address yesToken, address noToken, uint256 yesPool, uint256 noPool, uint256 lpTotalSupply, uint256 totalBacking, uint256 platformFees, uint256 resolutionRequestedAt, address resolutionRequester, string resolutionReason, uint256 resolutionConfidence, uint256 disputeDeadline, address disputer, string disputeReason)',
    'event RedemptionClaimed(uint256 indexed id, address indexed user, uint256 amountClaimed)'
]);

const ERC20_ABI = parseAbi([
    'function balanceOf(address account) view returns (uint256)'
]);

export enum MarketStatus {
    Open = 0,
    Closed = 1,
    ResolutionRequested = 2,
    Resolved = 3,
    Disputed = 4
}

export enum Outcome {
    Undecided = 0,
    Yes = 1,
    No = 2
}

export interface ClaimableInfo {
    canClaim: boolean;
    claimableAmount: bigint;
    outcome: Outcome;
    status: MarketStatus;
    winningTokenBalance: bigint;
    losingTokenBalance: bigint;
    isWinner: boolean;
    resolutionReason: string;
    resolutionConfidence: bigint;
}

export function useClaimWinnings(marketId: number, contractAddress: `0x${string}`) {
    const { address } = useAccount();
    const { toast } = useToast();
    const [claimableInfo, setClaimableInfo] = useState<ClaimableInfo | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Read market details
    const { data: marketData, refetch: refetchMarket } = useReadContract({
        address: contractAddress,
        abi: PREDICTION_MARKET_ABI,
        functionName: 'markets',
        args: [BigInt(marketId)],
    });

    // Read YES token balance
    const { data: yesBalance, refetch: refetchYesBalance } = useReadContract({
        address: marketData?.[6] as `0x${string}` | undefined, // yesToken address
        abi: ERC20_ABI,
        functionName: 'balanceOf',
        args: address ? [address] : undefined,
        query: {
            enabled: !!marketData?.[6] && !!address,
        }
    });

    // Read NO token balance
    const { data: noBalance, refetch: refetchNoBalance } = useReadContract({
        address: marketData?.[7] as `0x${string}` | undefined, // noToken address
        abi: ERC20_ABI,
        functionName: 'balanceOf',
        args: address ? [address] : undefined,
        query: {
            enabled: !!marketData?.[7] && !!address,
        }
    });

    // Claim transaction
    const {
        data: claimHash,
        writeContract: writeClaim,
        isPending: isClaimPending,
        error: claimError
    } = useWriteContract();

    const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
        hash: claimHash,
    });

    // Process claimable information
    useEffect(() => {
        if (!marketData || !address) {
            setIsLoading(false);
            return;
        }

        const [
            creator,
            question,
            category,
            endTime,
            status,
            outcome,
            yesToken,
            noToken,
            yesPool,
            noPool,
            lpTotalSupply,
            totalBacking,
            platformFees,
            resolutionRequestedAt,
            resolutionRequester,
            resolutionReason,
            resolutionConfidence,
            disputeDeadline,
            disputer,
            disputeReason
        ] = marketData;

        const marketStatus = status as MarketStatus;
        const marketOutcome = outcome as Outcome;
        const yesTokenBalance = (yesBalance as bigint) || BigInt(0);
        const noTokenBalance = (noBalance as bigint) || BigInt(0);

        let canClaim = false;
        let claimableAmount = BigInt(0);
        let isWinner = false;

        // Check if user can claim
        if (marketStatus === MarketStatus.Resolved) {
            if (marketOutcome === Outcome.Yes && yesTokenBalance > BigInt(0)) {
                canClaim = true;
                claimableAmount = yesTokenBalance;
                isWinner = true;
            } else if (marketOutcome === Outcome.No && noTokenBalance > BigInt(0)) {
                canClaim = true;
                claimableAmount = noTokenBalance;
                isWinner = true;
            }
        }

        setClaimableInfo({
            canClaim,
            claimableAmount,
            outcome: marketOutcome,
            status: marketStatus,
            winningTokenBalance: marketOutcome === Outcome.Yes ? yesTokenBalance : noTokenBalance,
            losingTokenBalance: marketOutcome === Outcome.Yes ? noTokenBalance : yesTokenBalance,
            isWinner,
            resolutionReason: resolutionReason as string,
            resolutionConfidence: resolutionConfidence as bigint,
        });

        setIsLoading(false);
    }, [marketData, yesBalance, noBalance, address]);

    // Claim function
    const claimWinnings = useCallback(async () => {
        if (!claimableInfo?.canClaim) {
            toast({
                title: "Cannot Claim",
                description: "You don't have any winnings to claim",
                variant: "destructive",
            });
            return;
        }

        try {
            writeClaim({
                address: contractAddress,
                abi: PREDICTION_MARKET_ABI,
                functionName: 'claimRedemption',
                args: [BigInt(marketId)],
            });
        } catch (error) {
            console.error('Claim error:', error);
            toast({
                title: "Claim Failed",
                description: error instanceof Error ? error.message : "Failed to claim winnings",
                variant: "destructive",
            });
        }
    }, [claimableInfo, writeClaim, contractAddress, marketId, toast]);

    useEffect(() => {
        if (isConfirmed) {
            toast({
                title: "Winnings Claimed!",
                description: `You've successfully claimed ${formatEther(claimableInfo?.claimableAmount || BigInt(0))} BNB`,
                variant: "default",
            });

            // Refetch balances after claim
            refetchMarket();
            refetchYesBalance();
            refetchNoBalance();
        }
    }, [isConfirmed, claimableInfo, toast, refetchMarket, refetchYesBalance, refetchNoBalance]);

    // Error notification
    useEffect(() => {
        if (claimError) {
            toast({
                title: "Claim Failed",
                description: claimError.message,
                variant: "destructive",
            });
        }
    }, [claimError, toast]);

    return {
        claimableInfo,
        claimWinnings,
        isLoading: isLoading || isClaimPending || isConfirming,
        isSuccess: isConfirmed,
        error: claimError,
        refetch: () => {
            refetchMarket();
            refetchYesBalance();
            refetchNoBalance();
        }
    };
}
