import { useState, useCallback, useEffect } from 'react'
import { ethers } from 'ethers'
import { useAccount, useWalletClient, usePublicClient } from 'wagmi'
import PDX_DISPUTE_ABI from '../contracts/PDXDisputeResolution.json'
import PDX_ABI from '../contracts/PDXbazar.json'

const PDX_DISPUTE_ADDRESS = process.env.NEXT_PUBLIC_PDX_DISPUTE_RESOLUTION_ADDRESS as `0x${string}`
const PDX_PREDICTION_MARKET_ADDRESS = process.env.NEXT_PUBLIC_PDX_MARKET_ADDRESS as `0x${string}`
const PDX_TOKEN_ADDRESS = process.env.NEXT_PUBLIC_PDX_TOKEN_ADDRESS as `0x${string}`

export enum DisputeStatus {
    None = 0,
    Active = 1,
    VotingInProgress = 2,
    Resolved = 3,
    Rejected = 4
}

export enum DisputeOutcome {
    Pending = 0,
    AcceptDispute = 1,
    RejectDispute = 2
}

export interface PDXDisputeInfo {
    disputeId: number
    marketContract: string
    marketId: number
    disputer: string
    reason: string
    disputeStake: string
    status: DisputeStatus
    outcome: DisputeOutcome
    totalAcceptStake: string
    totalRejectStake: string
    votingEndTime: number
    acceptVotePercentage: number
    rejectVotePercentage: number
    timeRemaining: number
}

export interface PDXVoteInfo {
    hasVoted: boolean
    vote: boolean
    stake: string
    claimed: boolean
}

export interface PDXContractParams {
    minimumDisputeStake: string
    minimumVoteStake: string
    votingPeriod: number
    platformFeePercent: number
}

export function usePDXDisputes() {
    const { address: account, isConnected } = useAccount()
    const { data: walletClient } = useWalletClient()
    const publicClient = usePublicClient()

    const [isLoading, setIsLoading] = useState(false)
    const [contract, setContract] = useState<ethers.Contract | null>(null)
    const [pdxContract, setPdxContract] = useState<ethers.Contract | null>(null)
    const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null)

    // Initialize provider
    useEffect(() => {
        const initProvider = async () => {
            if (publicClient) {
                try {
                    const ethersProvider = new ethers.BrowserProvider(publicClient.transport as any)
                    setProvider(ethersProvider)
                } catch (error) {
                    console.error('❌ Error initializing provider:', error)
                }
            }
        }
        initProvider()
    }, [publicClient])

    // Initialize contracts
    useEffect(() => {
        if (provider) {
            try {
                const disputeContract = new ethers.Contract(
                    PDX_DISPUTE_ADDRESS,
                    PDX_DISPUTE_ABI,
                    provider
                )
                setContract(disputeContract)

                const pdxTokenContract = new ethers.Contract(
                    PDX_TOKEN_ADDRESS,
                    PDX_ABI,
                    provider
                )
                setPdxContract(pdxTokenContract)
            } catch (error) {
                console.error('❌ Error initializing contracts:', error)
            }
        }
    }, [provider])

    // Check PDX allowance
    const checkAllowance = useCallback(async (amount: string): Promise<boolean> => {
        if (!pdxContract || !account) return false

        try {
            const allowance = await pdxContract.allowance(account, PDX_DISPUTE_ADDRESS)
            const required = ethers.parseEther(amount)
            return allowance >= required
        } catch (error) {
            console.error('Error checking allowance:', error)
            return false
        }
    }, [pdxContract, account])

    // Approve PDX tokens
    const approvePDX = useCallback(async (amount: string) => {
        if (!walletClient || !account) throw new Error('Wallet not connected')
        if (!pdxContract) throw new Error('PDX contract not initialized')

        setIsLoading(true)
        try {
            const signer = await new ethers.BrowserProvider(walletClient.transport as any).getSigner(account)
            const pdxWithSigner = new ethers.Contract(PDX_TOKEN_ADDRESS, PDX_ABI, signer)

            const amountWei = ethers.parseEther(amount)
            const tx = await pdxWithSigner.approve(PDX_DISPUTE_ADDRESS, amountWei)
            const receipt = await tx.wait()

            return { success: true, txHash: receipt.hash }
        } catch (error: any) {
            console.error('Error approving PDX:', error)
            throw new Error(error.message || 'Failed to approve PDX')
        } finally {
            setIsLoading(false)
        }
    }, [walletClient, account, pdxContract])

    // Get PDX balance
    const getPDXBalance = useCallback(async (): Promise<string> => {
        if (!pdxContract || !account) return '0'

        try {
            const balance = await pdxContract.balanceOf(account)
            return ethers.formatEther(balance)
        } catch (error) {
            console.error('Error fetching PDX balance:', error)
            return '0'
        }
    }, [pdxContract, account])

    // Get dispute for a market
    const getMarketDispute = useCallback(async (marketId: number): Promise<PDXDisputeInfo | null> => {
        if (!contract) return null

        try {
            const disputeId = await contract.getMarketDispute(PDX_PREDICTION_MARKET_ADDRESS, BigInt(marketId))

            if (Number(disputeId) === 0) {
                return null
            }

            const [
                marketContract,
                mid,
                disputer,
                reason,
                disputeStake,
                status,
                outcome,
                totalAcceptStake,
                totalRejectStake,
                votingEndTime
            ] = await contract.getDisputeInfo(disputeId)

            const acceptNum = parseFloat(ethers.formatEther(totalAcceptStake))
            const rejectNum = parseFloat(ethers.formatEther(totalRejectStake))
            const total = acceptNum + rejectNum

            const now = Math.floor(Date.now() / 1000)
            const timeRemaining = Math.max(0, Number(votingEndTime) - now)

            return {
                disputeId: Number(disputeId),
                marketContract,
                marketId: Number(mid),
                disputer,
                reason,
                disputeStake: ethers.formatEther(disputeStake),
                status: Number(status),
                outcome: Number(outcome),
                totalAcceptStake: ethers.formatEther(totalAcceptStake),
                totalRejectStake: ethers.formatEther(totalRejectStake),
                votingEndTime: Number(votingEndTime),
                acceptVotePercentage: total > 0 ? (acceptNum / total) * 100 : 0,
                rejectVotePercentage: total > 0 ? (rejectNum / total) * 100 : 0,
                timeRemaining
            }
        } catch (error) {
            console.error('Error fetching PDX dispute:', error)
            return null
        }
    }, [contract])

    // Get user's vote info
    const getUserVoteInfo = useCallback(async (disputeId: number): Promise<PDXVoteInfo | null> => {
        if (!contract || !account) return null

        try {
            const [hasVoted, vote, stake, claimed] = await contract.getVoteInfo(BigInt(disputeId), account)

            return {
                hasVoted,
                vote,
                stake: ethers.formatEther(stake),
                claimed
            }
        } catch (error) {
            console.error('Error fetching vote info:', error)
            return null
        }
    }, [contract, account])

    // Create dispute (with automatic PDX approval)
    const createDispute = useCallback(async (
        marketId: number,
        reason: string,
        stakeAmount: string
    ) => {
        if (!walletClient || !account) throw new Error('Wallet not connected')
        if (!contract || !pdxContract) throw new Error('Contracts not initialized')

        setIsLoading(true)
        try {
            const signer = await new ethers.BrowserProvider(walletClient.transport as any).getSigner(account)

            // Step 1: Check and approve PDX if needed
            const hasAllowance = await checkAllowance(stakeAmount)
            if (!hasAllowance) {
                console.log('📝 Approving PDX tokens...')
                const pdxWithSigner = new ethers.Contract(PDX_TOKEN_ADDRESS, PDX_ABI, signer)
                const stakeWei = ethers.parseEther(stakeAmount)
                const approveTx = await pdxWithSigner.approve(PDX_DISPUTE_ADDRESS, stakeWei)
                await approveTx.wait()
                console.log('✅ PDX approved')
            }

            // Step 2: Create dispute
            const disputeWithSigner = new ethers.Contract(PDX_DISPUTE_ADDRESS, PDX_DISPUTE_ABI, signer)
            const stakeWei = ethers.parseEther(stakeAmount)

            const tx = await disputeWithSigner.createDispute(
                PDX_PREDICTION_MARKET_ADDRESS,
                BigInt(marketId),
                reason,
                stakeWei
            )

            const receipt = await tx.wait()

            // Get dispute ID from event
            const disputeEvent = receipt?.logs.find((log: any) => {
                try {
                    const parsed = disputeWithSigner.interface.parseLog({
                        topics: log.topics as string[],
                        data: log.data
                    })
                    return parsed?.name === 'DisputeCreated'
                } catch {
                    return false
                }
            })

            let disputeId = 0
            if (disputeEvent) {
                const parsed = disputeWithSigner.interface.parseLog({
                    topics: disputeEvent.topics as string[],
                    data: disputeEvent.data
                })
                disputeId = Number(parsed?.args[0])
            }

            return { success: true, disputeId, txHash: receipt.hash }
        } catch (error: any) {
            console.error('Error creating PDX dispute:', error)
            throw new Error(error.message || 'Failed to create dispute')
        } finally {
            setIsLoading(false)
        }
    }, [walletClient, account, contract, pdxContract, checkAllowance])

    // Vote on dispute (with automatic PDX approval)
    const voteOnDispute = useCallback(async (
        disputeId: number,
        acceptDispute: boolean,
        stakeAmount: string
    ) => {
        if (!walletClient || !account) throw new Error('Wallet not connected')
        if (!contract || !pdxContract) throw new Error('Contracts not initialized')

        setIsLoading(true)
        try {
            const signer = await new ethers.BrowserProvider(walletClient.transport as any).getSigner(account)

            // Step 1: Check and approve PDX if needed
            const hasAllowance = await checkAllowance(stakeAmount)
            if (!hasAllowance) {
                console.log('📝 Approving PDX tokens...')
                const pdxWithSigner = new ethers.Contract(PDX_TOKEN_ADDRESS, PDX_ABI, signer)
                const stakeWei = ethers.parseEther(stakeAmount)
                const approveTx = await pdxWithSigner.approve(PDX_DISPUTE_ADDRESS, stakeWei)
                await approveTx.wait()
                console.log('✅ PDX approved')
            }

            // Step 2: Vote
            const disputeWithSigner = new ethers.Contract(PDX_DISPUTE_ADDRESS, PDX_DISPUTE_ABI, signer)
            const stakeWei = ethers.parseEther(stakeAmount)

            const tx = await disputeWithSigner.voteOnDispute(
                BigInt(disputeId),
                acceptDispute,
                stakeWei
            )

            const receipt = await tx.wait()
            return { success: true, txHash: receipt.hash }
        } catch (error: any) {
            console.error('Error voting on PDX dispute:', error)
            throw new Error(error.message || 'Failed to vote')
        } finally {
            setIsLoading(false)
        }
    }, [walletClient, account, contract, pdxContract, checkAllowance])

    // Claim stake
    const claimStake = useCallback(async (disputeId: number) => {
        if (!walletClient || !account) throw new Error('Wallet not connected')
        if (!contract) throw new Error('Contract not initialized')

        setIsLoading(true)
        try {
            const signer = await new ethers.BrowserProvider(walletClient.transport as any).getSigner(account)
            const disputeWithSigner = new ethers.Contract(PDX_DISPUTE_ADDRESS, PDX_DISPUTE_ABI, signer)

            const tx = await disputeWithSigner.claimStake(BigInt(disputeId))
            const receipt = await tx.wait()

            return { success: true, txHash: receipt.hash }
        } catch (error: any) {
            console.error('Error claiming PDX stake:', error)
            throw new Error(error.message || 'Failed to claim stake')
        } finally {
            setIsLoading(false)
        }
    }, [walletClient, account, contract])

    // Claim rejected dispute stake
    const claimRejectedStake = useCallback(async (disputeId: number) => {
        if (!walletClient || !account) throw new Error('Wallet not connected')
        if (!contract) throw new Error('Contract not initialized')

        setIsLoading(true)
        try {
            const signer = await new ethers.BrowserProvider(walletClient.transport as any).getSigner(account)
            const disputeWithSigner = new ethers.Contract(PDX_DISPUTE_ADDRESS, PDX_DISPUTE_ABI, signer)

            const tx = await disputeWithSigner.claimRejectedDisputeStake(BigInt(disputeId))
            const receipt = await tx.wait()

            return { success: true, txHash: receipt.hash }
        } catch (error: any) {
            console.error('Error claiming rejected PDX stake:', error)
            throw new Error(error.message || 'Failed to claim rejected stake')
        } finally {
            setIsLoading(false)
        }
    }, [walletClient, account, contract])

    // Calculate potential winnings
    const calculateWinnings = useCallback(async (disputeId: number): Promise<{
        potentialWinnings: string
        isWinning: boolean
    } | null> => {
        if (!contract || !account) return null

        try {
            const [winnings, isWinning] = await contract.calculatePotentialWinnings(
                BigInt(disputeId),
                account
            )

            return {
                potentialWinnings: ethers.formatEther(winnings),
                isWinning
            }
        } catch (error) {
            console.error('Error calculating winnings:', error)
            return null
        }
    }, [contract, account])

    // Get contract parameters
    const getContractParams = useCallback(async (): Promise<PDXContractParams | null> => {
        if (!contract) return null

        try {
            const [minDispute, minVote, votingPeriod, platformFee] = await Promise.all([
                contract.minimumDisputeStake(),
                contract.minimumVoteStake(),
                contract.votingPeriod(),
                contract.platformFeePercent()
            ])

            return {
                minimumDisputeStake: ethers.formatEther(minDispute),
                minimumVoteStake: ethers.formatEther(minVote),
                votingPeriod: Number(votingPeriod),
                platformFeePercent: Number(platformFee)
            }
        } catch (error) {
            console.error('Error fetching contract params:', error)
            return null
        }
    }, [contract])

    // Finalize dispute
    const finalizeDispute = useCallback(async (disputeId: number) => {
        if (!walletClient || !account) throw new Error('Wallet not connected')
        if (!contract) throw new Error('Contract not initialized')

        setIsLoading(true)
        try {
            const signer = await new ethers.BrowserProvider(walletClient.transport as any).getSigner(account)
            const disputeWithSigner = new ethers.Contract(PDX_DISPUTE_ADDRESS, PDX_DISPUTE_ABI, signer)

            const tx = await disputeWithSigner.finalizeDispute(BigInt(disputeId))
            const receipt = await tx.wait()

            return { success: true, txHash: receipt.hash }
        } catch (error: any) {
            console.error('Error finalizing dispute:', error)
            throw new Error(error.message || 'Failed to finalize dispute')
        } finally {
            setIsLoading(false)
        }
    }, [walletClient, account, contract])

    return {
        // State
        isLoading,
        isConnected,

        // PDX specific functions
        checkAllowance,
        approvePDX,
        getPDXBalance,

        // Read functions
        getMarketDispute,
        getUserVoteInfo,
        calculateWinnings,
        getContractParams,

        // Write functions
        createDispute,
        voteOnDispute,
        claimStake,
        claimRejectedStake,
        finalizeDispute,

        // Contract info
        disputeAddress: PDX_DISPUTE_ADDRESS,
        pdxTokenAddress: PDX_TOKEN_ADDRESS,
        marketAddress: PDX_PREDICTION_MARKET_ADDRESS
    }
}
