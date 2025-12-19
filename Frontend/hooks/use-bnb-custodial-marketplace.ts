import { useState, useCallback, useEffect } from 'react'
import { ethers, BrowserProvider, JsonRpcSigner } from 'ethers'
import { useAccount, useWalletClient, usePublicClient } from 'wagmi'
import MARKETPLACE_ABI_JSON from '../contracts/BNBCustodialMarketplace.json'

const MARKETPLACE_ABI = (MARKETPLACE_ABI_JSON as any).abi || MARKETPLACE_ABI_JSON

// Hardcoded contract address from deployment
const MARKETPLACE_ADDRESS = '0x8Cd4b69279f246Fde0602084D6dbC536644f0F41'

console.log('🏪 [BNB Custodial Marketplace] Using address:', MARKETPLACE_ADDRESS)

export interface Listing {
    seller: string
    marketId: number
    price: string  // in BNB
    listedAt: number
    isActive: boolean
    isTransferred: boolean
}

export function useBNBCustodialMarketplace() {
    const { address: account, isConnected } = useAccount()
    const { data: walletClient } = useWalletClient()
    const publicClient = usePublicClient()

    const [isLoading, setIsLoading] = useState(false)
    const [marketplaceContract, setMarketplaceContract] = useState<ethers.Contract | null>(null)
    const [isContractReady, setIsContractReady] = useState(false)
    const [provider, setProvider] = useState<BrowserProvider | null>(null)
    const [signer, setSigner] = useState<JsonRpcSigner | null>(null)

    const isCorrectNetwork = publicClient?.chain?.id === 97

    const BSC_TESTNET_RPC = 'https://data-seed-prebsc-1-s1.binance.org:8545/'

    // Initialize provider
    useEffect(() => {
        const initProvider = async () => {
            if (publicClient) {
                try {
                    const ethersProvider = new BrowserProvider(publicClient.transport as any)
                    setProvider(ethersProvider)
                    return
                } catch (error) {
                    console.error('❌ Error initializing browser provider:', error)
                }
            }

            // Fallback to static RPC
            try {
                const fallbackProvider = new ethers.JsonRpcProvider(BSC_TESTNET_RPC) as any
                setProvider(fallbackProvider)
                console.log('📡 [BNB Custodial Marketplace] Using fallback RPC provider')
            } catch (fallbackError) {
                console.error('❌ Error initializing fallback provider:', fallbackError)
                setProvider(null)
            }
        }
        initProvider()
    }, [publicClient])

    // Initialize signer
    useEffect(() => {
        const initSigner = async () => {
            if (walletClient && account) {
                try {
                    const ethersSigner = new ethers.BrowserProvider(walletClient.transport as any).getSigner(account)
                    setSigner(await ethersSigner)
                } catch (error) {
                    console.error('❌ Error initializing signer:', error)
                    setSigner(null)
                }
            } else {
                setSigner(null)
            }
        }
        initSigner()
    }, [walletClient, account])

    // Initialize marketplace contract
    useEffect(() => {
        const initializeContract = async () => {
            if (!provider) {
                setMarketplaceContract(null)
                setIsContractReady(false)
                return
            }

            try {
                const network = await provider.getNetwork()

                if (Number(network.chainId) !== 97) {
                    setMarketplaceContract(null)
                    setIsContractReady(false)
                    return
                }

                const marketplace = new ethers.Contract(
                    MARKETPLACE_ADDRESS,
                    MARKETPLACE_ABI,
                    provider
                )

                try {
                    // Test contract
                    const owner = await (marketplace as any).owner()
                    console.log('✅ [BNB Custodial Marketplace] Contract initialized!')
                    console.log('✅ [BNB Custodial Marketplace] Owner:', owner)

                    setMarketplaceContract(marketplace)
                    setIsContractReady(true)
                } catch (testError) {
                    console.error('❌ Marketplace contract test failed:', testError)
                    setMarketplaceContract(null)
                    setIsContractReady(false)
                }

            } catch (error) {
                console.error('❌ Error initializing marketplace:', error)
                setMarketplaceContract(null)
                setIsContractReady(false)
            }
        }

        initializeContract()
    }, [provider, account])

    // ==================== STEP 1: LIST MARKET ====================

    const listMarket = useCallback(async (
        marketId: number,
        priceInBNB: string
    ): Promise<number> => {
        if (!signer || !account || !isCorrectNetwork) {
            throw new Error('Wallet not connected or wrong network')
        }
        if (!isContractReady || !marketplaceContract) {
            throw new Error('Marketplace contract not ready')
        }

        console.log('🏷️ [BNB Custodial] Step 1: Listing market...')
        console.log('   Market ID:', marketId)
        console.log('   Price BNB:', priceInBNB)

        setIsLoading(true)
        try {
            const marketplaceWithSigner = new ethers.Contract(
                MARKETPLACE_ADDRESS,
                MARKETPLACE_ABI,
                signer
            )

            const priceInWei = ethers.parseEther(priceInBNB)

            const tx = await (marketplaceWithSigner as any).listMarket(
                BigInt(marketId),
                priceInWei
            )

            console.log('⏳ Waiting for confirmation...')
            const receipt = await tx.wait()
            console.log('✅ Step 1 Complete: Market listed!')

            // Parse MarketListed event to get listingId
            const marketListedTopic = ethers.id('MarketListed(uint256,uint256,address,uint256,uint256)')
            const event = receipt?.logs.find((log: any) => log.topics[0] === marketListedTopic)

            let listingId = 0
            if (event) {
                const iface = new ethers.Interface(MARKETPLACE_ABI)
                const decodedEvent = iface.parseLog(event)
                listingId = Number(decodedEvent?.args[0])
                console.log('✅ Listing ID:', listingId)
            }

            return listingId

        } catch (error: any) {
            console.error('❌ Error listing market:', error)
            throw new Error(error.reason || error.message || 'Failed to list market')
        } finally {
            setIsLoading(false)
        }
    }, [signer, account, isCorrectNetwork, isContractReady, marketplaceContract])

    // ==================== STEP 3: CONFIRM TRANSFER ====================

    const confirmTransfer = useCallback(async (marketId: number): Promise<void> => {
        if (!signer || !account || !isCorrectNetwork) {
            throw new Error('Wallet not connected or wrong network')
        }
        if (!isContractReady || !marketplaceContract) {
            throw new Error('Marketplace contract not ready')
        }

        console.log('✅ [BNB Custodial] Step 3: Confirming transfer...')
        console.log('   Market ID:', marketId)

        setIsLoading(true)
        try {
            const marketplaceWithSigner = new ethers.Contract(
                MARKETPLACE_ADDRESS,
                MARKETPLACE_ABI,
                signer
            )

            const tx = await (marketplaceWithSigner as any).confirmTransfer(BigInt(marketId))

            console.log('⏳ Waiting for confirmation...')
            await tx.wait()
            console.log('✅ Step 3 Complete: Transfer confirmed!')

        } catch (error: any) {
            console.error('❌ Error confirming transfer:', error)
            throw new Error(error.reason || error.message || 'Failed to confirm transfer')
        } finally {
            setIsLoading(false)
        }
    }, [signer, account, isCorrectNetwork, isContractReady, marketplaceContract])

    // ==================== BUY MARKET ====================

    const buyMarket = useCallback(async (
        marketId: number,
        priceInBNB: string
    ): Promise<void> => {
        if (!signer || !account || !isCorrectNetwork) {
            throw new Error('Wallet not connected or wrong network')
        }
        if (!isContractReady || !marketplaceContract) {
            throw new Error('Marketplace contract not ready')
        }

        setIsLoading(true)
        try {
            const marketplaceWithSigner = new ethers.Contract(
                MARKETPLACE_ADDRESS,
                MARKETPLACE_ABI,
                signer
            )

            const priceInWei = ethers.parseEther(priceInBNB)

            const tx = await (marketplaceWithSigner as any).buyMarket(
                BigInt(marketId),
                { value: priceInWei }
            )

            await tx.wait()

        } catch (error: any) {
            console.error('❌ Error buying market:', error)
            throw new Error(error.reason || error.message || 'Failed to buy market')
        } finally {
            setIsLoading(false)
        }
    }, [signer, account, isCorrectNetwork, isContractReady, marketplaceContract])

    // ==================== CANCEL LISTING ====================

    const cancelListing = useCallback(async (marketId: number): Promise<void> => {
        if (!signer || !account || !isCorrectNetwork) {
            throw new Error('Wallet not connected or wrong network')
        }
        if (!isContractReady || !marketplaceContract) {
            throw new Error('Marketplace contract not ready')
        }

        setIsLoading(true)
        try {
            const marketplaceWithSigner = new ethers.Contract(
                MARKETPLACE_ADDRESS,
                MARKETPLACE_ABI,
                signer
            )

            const tx = await (marketplaceWithSigner as any).cancelListing(BigInt(marketId))
            await tx.wait()

        } catch (error: any) {
            console.error('❌ Error cancelling listing:', error)
            throw new Error(error.reason || error.message || 'Failed to cancel listing')
        } finally {
            setIsLoading(false)
        }
    }, [signer, account, isCorrectNetwork, isContractReady, marketplaceContract])

    // ==================== UPDATE PRICE ====================

    const updatePrice = useCallback(async (
        marketId: number,
        newPriceInBNB: string
    ): Promise<void> => {
        if (!signer || !account || !isCorrectNetwork) {
            throw new Error('Wallet not connected or wrong network')
        }
        if (!isContractReady || !marketplaceContract) {
            throw new Error('Marketplace contract not ready')
        }

        setIsLoading(true)
        try {
            const marketplaceWithSigner = new ethers.Contract(
                MARKETPLACE_ADDRESS,
                MARKETPLACE_ABI,
                signer
            )

            const newPriceInWei = ethers.parseEther(newPriceInBNB)

            const tx = await (marketplaceWithSigner as any).updatePrice(
                BigInt(marketId),
                newPriceInWei
            )

            await tx.wait()

        } catch (error: any) {
            console.error('❌ Error updating price:', error)
            throw new Error(error.reason || error.message || 'Failed to update price')
        } finally {
            setIsLoading(false)
        }
    }, [signer, account, isCorrectNetwork, isContractReady, marketplaceContract])

    // ==================== VIEW FUNCTIONS ====================

    const getListing = useCallback(async (listingId: number): Promise<Listing | null> => {
        if (!marketplaceContract) return null

        try {
            const listing = await (marketplaceContract as any).getListing(BigInt(listingId))

            return {
                seller: listing.seller,
                marketId: Number(listing.marketId),
                price: ethers.formatEther(listing.price),
                listedAt: Number(listing.listedAt),
                isActive: listing.isActive,
                isTransferred: listing.isTransferred
            }
        } catch (error) {
            console.error('Error fetching listing:', error)
            return null
        }
    }, [marketplaceContract])

    const getListingByMarket = useCallback(async (marketId: number): Promise<number> => {
        if (!marketplaceContract) return 0

        try {
            const listingId = await (marketplaceContract as any).getListingByMarket(BigInt(marketId))
            return Number(listingId)
        } catch (error) {
            console.error('Error fetching listing ID:', error)
            return 0
        }
    }, [marketplaceContract])

    const isMarketListed = useCallback(async (marketId: number): Promise<boolean> => {
        if (!marketplaceContract) return false

        try {
            return await (marketplaceContract as any).isMarketListed(BigInt(marketId))
        } catch (error) {
            console.error('Error checking if market is listed:', error)
            return false
        }
    }, [marketplaceContract])

    const isOwnershipTransferred = useCallback(async (marketId: number): Promise<boolean> => {
        if (!marketplaceContract) return false

        try {
            return await (marketplaceContract as any).isOwnershipTransferred(BigInt(marketId))
        } catch (error) {
            console.error('Error checking ownership transfer:', error)
            return false
        }
    }, [marketplaceContract])

    const getMarketplaceFee = useCallback(async (): Promise<number> => {
        if (!marketplaceContract) return 0

        try {
            const feeBps = await (marketplaceContract as any).marketplaceFeeBps()
            return Number(feeBps) / 100 // Convert basis points to percentage
        } catch (error) {
            console.error('Error fetching marketplace fee:', error)
            return 0
        }
    }, [marketplaceContract])

    return {
        // State
        isLoading,
        isContractReady,
        isConnected,
        account,
        marketplaceAddress: MARKETPLACE_ADDRESS,
        marketplaceContract, // Expose contract for direct access

        // Actions (3-step process)
        listMarket,          // Step 1
        confirmTransfer,     // Step 3
        buyMarket,
        cancelListing,
        updatePrice,

        // Views
        getListing,
        getListingByMarket,
        isMarketListed,
        isOwnershipTransferred,
        getMarketplaceFee
    }
}
