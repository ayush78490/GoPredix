import { useState, useCallback, useEffect } from 'react'
import { ethers, BrowserProvider, JsonRpcSigner } from 'ethers'
import { useAccount, useWalletClient, usePublicClient } from 'wagmi'
import MARKETPLACE_ABI_JSON from '../contracts/bnbNativeMarketplaceAbi.json'

const MARKETPLACE_ABI = (MARKETPLACE_ABI_JSON as any).abi || MARKETPLACE_ABI_JSON

// Updated contract address - v3 with marketplace approval in Bazar.sol
const MARKETPLACE_ADDRESS = '0xe334f0B78f5f2Ff153C300386a76d9b3be41Bf66'

console.log('🏪 [BNB Marketplace] Using address:', MARKETPLACE_ADDRESS)

export interface MarketListing {
    seller: string
    marketId: number
    price: string  // in BNB
    listedAt: number
    isActive: boolean
}

export interface MarketOffer {
    buyer: string
    offerPrice: string  // in BNB
    offeredAt: number
    isActive: boolean
}

export function useBNBNativeMarketplace() {
    const { address: account, isConnected } = useAccount()
    const { data: walletClient } = useWalletClient()
    const publicClient = usePublicClient()

    const [isLoading, setIsLoading] = useState(false)
    const [marketplaceContract, setMarketplaceContract] = useState<ethers.Contract | null>(null)
    const [isContractReady, setIsContractReady] = useState(false)
    const [provider, setProvider] = useState<BrowserProvider | null>(null)
    const [signer, setSigner] = useState<JsonRpcSigner | null>(null)

    const isCorrectNetwork = publicClient?.chain?.id === 97

    // BSC Testnet RPC URL for fallback
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
                console.log('📡 [BNB Marketplace] Using fallback RPC provider')
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
                    console.log('✅ [BNB Marketplace] Contract initialized!')
                    console.log('✅ [BNB Marketplace] Owner:', owner)

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

    // ==================== LIST MARKET ====================

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

        console.log('🏷️ [BNB Marketplace] Listing market...')
        console.log('   Market ID:', marketId)
        console.log('   Price BNB:', priceInBNB)
        console.log('   Contract:', MARKETPLACE_ADDRESS)
        console.log('   Account:', account)

        setIsLoading(true)
        try {
            const marketplaceWithSigner = new ethers.Contract(
                MARKETPLACE_ADDRESS,
                MARKETPLACE_ABI,
                signer
            )

            // CRITICAL: Verify market exists on BNB Prediction Market before listing
            console.log('🔍 Verifying market exists on BNB Prediction Market...')
            try {
                const owner = await (marketplaceWithSigner as any).getMarketOwner(BigInt(marketId))
                console.log('   Market owner:', owner)

                if (owner === ethers.ZeroAddress || owner === '0x0000000000000000000000000000000000000000') {
                    throw new Error(`Market #${marketId} does not exist on BNB Prediction Market contract. Please create a BNB market first or select a different market.`)
                }

                if (owner.toLowerCase() !== account.toLowerCase()) {
                    throw new Error(`You are not the owner of market #${marketId}. Owner is: ${owner}`)
                }

                console.log('✅ Market exists and you are the owner!')
            } catch (verifyError: any) {
                console.error('❌ Market verification failed:', verifyError)
                throw new Error(`Cannot list market #${marketId}: ${verifyError.message || 'Market may not exist on BNB Prediction Market'}`)
            }

            const priceInWei = ethers.parseEther(priceInBNB)
            console.log('   Price Wei:', priceInWei.toString())

            // Test: Call the function to see what happens
            console.log('📤 Sending transaction...')
            const tx = await (marketplaceWithSigner as any).listMarket(
                BigInt(marketId),
                priceInWei
            )

            console.log('⏳ Waiting for confirmation...')
            const receipt = await tx.wait()
            console.log('✅ Transaction confirmed!')

            // Parse MarketListed event to get listingId
            const marketListedTopic = ethers.id('MarketListed(uint256,uint256,address,uint256,uint256)')
            const event = receipt?.logs.find((log: any) => log.topics[0] === marketListedTopic)

            let listingId = 0
            if (event) {
                const iface = new ethers.Interface(MARKETPLACE_ABI)
                const decodedEvent = iface.parseLog(event)
                listingId = Number(decodedEvent?.args[0])
                console.log('✅ Listing ID from event:', listingId)
            } else {
                // Fetch from contract
                listingId = await (marketplaceWithSigner as any).marketToListing(BigInt(marketId))
                console.log('✅ Listing ID from contract:', listingId)
            }

            return listingId

        } catch (error: any) {
            console.error('❌ Error listing market:', error)
            console.error('❌ Error message:', error.message)
            console.error('❌ Error reason:', error.reason)
            console.error('❌ Error data:', error.data)
            throw new Error(error.reason || error.message || 'Failed to list market')
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

    // ==================== MAKE OFFER ====================

    const makeOffer = useCallback(async (
        marketId: number,
        offerPriceInBNB: string
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

            const offerPriceInWei = ethers.parseEther(offerPriceInBNB)

            // BNB is sent as escrow
            const tx = await (marketplaceWithSigner as any).makeOffer(
                BigInt(marketId),
                { value: offerPriceInWei }
            )

            await tx.wait()

        } catch (error: any) {
            console.error('❌ Error making offer:', error)
            throw new Error(error.reason || error.message || 'Failed to make offer')
        } finally {
            setIsLoading(false)
        }
    }, [signer, account, isCorrectNetwork, isContractReady, marketplaceContract])

    // ==================== CANCEL OFFER ====================

    const cancelOffer = useCallback(async (marketId: number): Promise<void> => {
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

            const tx = await (marketplaceWithSigner as any).cancelOffer(BigInt(marketId))
            await tx.wait()

        } catch (error: any) {
            console.error('❌ Error cancelling offer:', error)
            throw new Error(error.reason || error.message || 'Failed to cancel offer')
        } finally {
            setIsLoading(false)
        }
    }, [signer, account, isCorrectNetwork, isContractReady, marketplaceContract])

    // ==================== ACCEPT OFFER ====================

    const acceptOffer = useCallback(async (
        marketId: number,
        buyerAddress: string
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

            const tx = await (marketplaceWithSigner as any).acceptOffer(
                BigInt(marketId),
                buyerAddress
            )

            await tx.wait()

        } catch (error: any) {
            console.error('❌ Error accepting offer:', error)
            throw new Error(error.reason || error.message || 'Failed to accept offer')
        } finally {
            setIsLoading(false)
        }
    }, [signer, account, isCorrectNetwork, isContractReady, marketplaceContract])

    // ==================== UPDATE LISTING PRICE ====================

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

    // ==================== VIEW FUNCTIONS ====================

    const getListing = useCallback(async (listingId: number): Promise<MarketListing | null> => {
        if (!marketplaceContract) return null

        try {
            const listing = await (marketplaceContract as any).getListing(BigInt(listingId))

            return {
                seller: listing.seller,
                marketId: Number(listing.marketId),
                price: ethers.formatEther(listing.price),
                listedAt: Number(listing.listedAt),
                isActive: listing.isActive
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

    const getOffer = useCallback(async (
        marketId: number,
        buyerAddress: string
    ): Promise<MarketOffer | null> => {
        if (!marketplaceContract) return null

        try {
            const offer = await (marketplaceContract as any).getOffer(BigInt(marketId), buyerAddress)

            return {
                buyer: offer.buyer,
                offerPrice: ethers.formatEther(offer.offerPrice),
                offeredAt: Number(offer.offeredAt),
                isActive: offer.isActive
            }
        } catch (error) {
            console.error('Error fetching offer:', error)
            return null
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

        // Actions
        listMarket,
        buyMarket,
        makeOffer,
        cancelOffer,
        acceptOffer,
        updatePrice,
        cancelListing,

        // Views
        getListing,
        getListingByMarket,
        getOffer,
        isMarketListed,
        getMarketplaceFee
    }
}
