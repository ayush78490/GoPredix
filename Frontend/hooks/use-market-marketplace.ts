import { useState, useCallback, useEffect } from 'react'
import { ethers, BrowserProvider, JsonRpcSigner } from 'ethers'
import { useAccount, useWalletClient, usePublicClient } from 'wagmi'
import {
    CUSTODIAL_MARKETPLACE_ADDRESS,
    PDX_MARKETPLACE_ADDRESS,
    NEXT_PUBLIC_PDX_TOKEN_ADDRESS,
    PREDICTION_MARKET_ADDRESS,
    PDX_MARKET_ADDRESS,
} from '../lib/web3/config'

// ✅ COMPLETE ABI with all required fields
const MARKETPLACE_ABI = [
    {
        "type": "function",
        "name": "listMarket",
        "inputs": [
            { "name": "marketId", "type": "uint256", "internalType": "uint256" },
            { "name": "price", "type": "uint256", "internalType": "uint256" }
        ],
        "outputs": [{ "name": "", "type": "uint256", "internalType": "uint256" }],
        "stateMutability": "nonpayable"
    },
    {
        "type": "function",
        "name": "confirmTransfer",
        "inputs": [{ "name": "marketId", "type": "uint256", "internalType": "uint256" }],
        "outputs": [],
        "stateMutability": "nonpayable"
    },
    {
        "type": "function",
        "name": "buyMarket",
        "inputs": [{ "name": "marketId", "type": "uint256", "internalType": "uint256" }],
        "outputs": [],
        "stateMutability": "nonpayable"
    },
    {
        "type": "function",
        "name": "cancelListing",
        "inputs": [{ "name": "marketId", "type": "uint256", "internalType": "uint256" }],
        "outputs": [],
        "stateMutability": "nonpayable"
    },
    {
        "type": "function",
        "name": "updatePrice",
        "inputs": [
            { "name": "marketId", "type": "uint256", "internalType": "uint256" },
            { "name": "newPrice", "type": "uint256", "internalType": "uint256" }
        ],
        "outputs": [],
        "stateMutability": "nonpayable"
    },
    {
        "type": "function",
        "name": "makeOffer",
        "inputs": [
            { "name": "marketId", "type": "uint256", "internalType": "uint256" },
            { "name": "offerPrice", "type": "uint256", "internalType": "uint256" }
        ],
        "outputs": [],
        "stateMutability": "nonpayable"
    },
    {
        "type": "function",
        "name": "acceptOffer",
        "inputs": [
            { "name": "marketId", "type": "uint256", "internalType": "uint256" },
            { "name": "buyer", "type": "address", "internalType": "address" }
        ],
        "outputs": [],
        "stateMutability": "nonpayable"
    },
    {
        "type": "function",
        "name": "cancelOffer",
        "inputs": [{ "name": "marketId", "type": "uint256", "internalType": "uint256" }],
        "outputs": [],
        "stateMutability": "nonpayable"
    },
    {
        "type": "function",
        "name": "getListing",
        "inputs": [{ "name": "listingId", "type": "uint256", "internalType": "uint256" }],
        "outputs": [
            {
                "name": "",
                "type": "tuple",
                "internalType": "struct MarketMarketplace.MarketListing",
                "components": [
                    { "name": "seller", "type": "address", "internalType": "address" },
                    { "name": "marketId", "type": "uint256", "internalType": "uint256" },
                    { "name": "price", "type": "uint256", "internalType": "uint256" },
                    { "name": "listedAt", "type": "uint256", "internalType": "uint256" },
                    { "name": "isActive", "type": "bool", "internalType": "bool" },
                    { "name": "isTransferred", "type": "bool", "internalType": "bool" }
                ]
            }
        ],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "getListingByMarket",
        "inputs": [{ "name": "marketId", "type": "uint256", "internalType": "uint256" }],
        "outputs": [{ "name": "", "type": "uint256", "internalType": "uint256" }],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "getOffer",
        "inputs": [
            { "name": "marketId", "type": "uint256", "internalType": "uint256" },
            { "name": "buyer", "type": "address", "internalType": "address" }
        ],
        "outputs": [
            {
                "name": "",
                "type": "tuple",
                "internalType": "struct MarketMarketplace.Offer",
                "components": [
                    { "name": "buyer", "type": "address", "internalType": "address" },
                    { "name": "price", "type": "uint256", "internalType": "uint256" },
                    { "name": "timestamp", "type": "uint256", "internalType": "uint256" },
                    { "name": "isActive", "type": "bool", "internalType": "bool" }
                ]
            }
        ],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "isMarketListed",
        "inputs": [{ "name": "marketId", "type": "uint256", "internalType": "uint256" }],
        "outputs": [{ "name": "", "type": "bool", "internalType": "bool" }],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "nextListingId",
        "inputs": [],
        "outputs": [{ "name": "", "type": "uint256", "internalType": "uint256" }],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "withdrawFees",
        "inputs": [],
        "outputs": [],
        "stateMutability": "nonpayable"
    },
    {
        "type": "function",
        "name": "accumulatedFees",
        "inputs": [],
        "outputs": [{ "name": "", "type": "uint256", "internalType": "uint256" }],
        "stateMutability": "view"
    },
    {
        "type": "event",
        "name": "MarketListed",
        "inputs": [
            { "name": "listingId", "type": "uint256", "indexed": true, "internalType": "uint256" },
            { "name": "seller", "type": "address", "indexed": true, "internalType": "address" },
            { "name": "marketId", "type": "uint256", "indexed": true, "internalType": "uint256" },
            { "name": "price", "type": "uint256", "indexed": false, "internalType": "uint256" }
        ],
        "anonymous": false
    },
    {
        "type": "event",
        "name": "MarketSold",
        "inputs": [
            { "name": "marketId", "type": "uint256", "indexed": true, "internalType": "uint256" },
            { "name": "seller", "type": "address", "indexed": true, "internalType": "address" },
            { "name": "buyer", "type": "address", "indexed": true, "internalType": "address" },
            { "name": "price", "type": "uint256", "indexed": false, "internalType": "uint256" }
        ],
        "anonymous": false
    },
    {
        "type": "event",
        "name": "ListingCancelled",
        "inputs": [
            { "name": "marketId", "type": "uint256", "indexed": true, "internalType": "uint256" },
            { "name": "seller", "type": "address", "indexed": true, "internalType": "address" }
        ],
        "anonymous": false
    },
    {
        "type": "event",
        "name": "PriceUpdated",
        "inputs": [
            { "name": "marketId", "type": "uint256", "indexed": true, "internalType": "uint256" },
            { "name": "oldPrice", "type": "uint256", "indexed": false, "internalType": "uint256" },
            { "name": "newPrice", "type": "uint256", "indexed": false, "internalType": "uint256" }
        ],
        "anonymous": false
    },
    {
        "type": "event",
        "name": "OfferMade",
        "inputs": [
            { "name": "marketId", "type": "uint256", "indexed": true, "internalType": "uint256" },
            { "name": "buyer", "type": "address", "indexed": true, "internalType": "address" },
            { "name": "offerPrice", "type": "uint256", "indexed": false, "internalType": "uint256" }
        ],
        "anonymous": false
    },
    {
        "type": "event",
        "name": "OfferAccepted",
        "inputs": [
            { "name": "marketId", "type": "uint256", "indexed": true, "internalType": "uint256" },
            { "name": "seller", "type": "address", "indexed": true, "internalType": "address" },
            { "name": "buyer", "type": "address", "indexed": true, "internalType": "address" },
            { "name": "price", "type": "uint256", "indexed": false, "internalType": "uint256" }
        ],
        "anonymous": false
    },
    {
        "type": "event",
        "name": "OfferCancelled",
        "inputs": [
            { "name": "marketId", "type": "uint256", "indexed": true, "internalType": "uint256" },
            { "name": "buyer", "type": "address", "indexed": true, "internalType": "address" }
        ],
        "anonymous": false
    }
] as const

const PREDICTION_MARKET_ABI = [
    {
        "type": "function",
        "name": "transferMarketOwnership",
        "inputs": [
            { "name": "id", "type": "uint256", "internalType": "uint256" },
            { "name": "newOwner", "type": "address", "internalType": "address" }
        ],
        "outputs": [],
        "stateMutability": "nonpayable"
    },
    {
        "type": "function",
        "name": "getMarketInfo",
        "inputs": [{ "name": "marketId", "type": "uint256", "internalType": "uint256" }],
        "outputs": [
            {
                "name": "",
                "type": "tuple",
                "internalType": "struct IPredictionMarket.MarketInfo",
                "components": [
                    { "name": "creator", "type": "address", "internalType": "address" },
                    { "name": "question", "type": "string", "internalType": "string" },
                    { "name": "category", "type": "string", "internalType": "string" },
                    { "name": "endTime", "type": "uint256", "internalType": "uint256" },
                    { "name": "status", "type": "uint8", "internalType": "uint8" },
                    { "name": "outcome", "type": "uint8", "internalType": "uint8" },
                    { "name": "yesPool", "type": "uint256", "internalType": "uint256" },
                    { "name": "noPool", "type": "uint256", "internalType": "uint256" },
                    { "name": "totalBacking", "type": "uint256", "internalType": "uint256" }
                ]
            }
        ],
        "stateMutability": "view"
    }
] as const

export interface MarketListing {
    listingId: number
    marketId: number
    seller: string
    price: string
    listedAt: number
    isActive: boolean
    isTransferred: boolean
    type: 'BNB' | 'PDX'
}

export type MarketType = 'BNB' | 'PDX'

export function useMarketMarketplace() {
    const { address: account } = useAccount()
    const { data: walletClient } = useWalletClient()
    const publicClient = usePublicClient()

    const [bnbMarketplaceContract, setBnbMarketplaceContract] = useState<ethers.Contract | null>(null)
    const [pdxMarketplaceContract, setPdxMarketplaceContract] = useState<ethers.Contract | null>(null)
    const [bnbPredictionMarketContract, setBnbPredictionMarketContract] = useState<ethers.Contract | null>(null)
    const [pdxPredictionMarketContract, setPdxPredictionMarketContract] = useState<ethers.Contract | null>(null)

    const [provider, setProvider] = useState<BrowserProvider | null>(null)
    const [signer, setSigner] = useState<JsonRpcSigner | null>(null)
    const [isReady, setIsReady] = useState(false)

    // Initialize provider
    useEffect(() => {
        if (publicClient) {
            const ethersProvider = new BrowserProvider(publicClient.transport as any)
            setProvider(ethersProvider)
        }
    }, [publicClient])

    // Initialize signer
    useEffect(() => {
        const initSigner = async () => {
            if (walletClient && account) {
                const ethersSigner = new ethers.BrowserProvider(walletClient.transport as any).getSigner(account)
                setSigner(await ethersSigner)
            }
        }
        initSigner()
    }, [walletClient, account])

    // Initialize contracts
    useEffect(() => {
        if (provider) {
            try {
                // BNB Contracts
                const bnbMarketplace = new ethers.Contract(
                    CUSTODIAL_MARKETPLACE_ADDRESS,
                    MARKETPLACE_ABI as any,
                    provider
                )
                setBnbMarketplaceContract(bnbMarketplace)

                const bnbPm = new ethers.Contract(
                    PREDICTION_MARKET_ADDRESS,
                    PREDICTION_MARKET_ABI as any,
                    provider
                )
                setBnbPredictionMarketContract(bnbPm)

                // PDX Contracts
                if (PDX_MARKETPLACE_ADDRESS) {
                    const pdxMarketplace = new ethers.Contract(
                        PDX_MARKETPLACE_ADDRESS,
                        MARKETPLACE_ABI as any,
                        provider
                    )
                    setPdxMarketplaceContract(pdxMarketplace)
                }

                if (PDX_MARKET_ADDRESS) {
                    const pdxPm = new ethers.Contract(
                        PDX_MARKET_ADDRESS,
                        PREDICTION_MARKET_ABI as any,
                        provider
                    )
                    setPdxPredictionMarketContract(pdxPm)
                }

                setIsReady(true)
            } catch (error) {
                console.error('❌ Contract initialization error:', error)
            }
        }
    }, [provider])

    const getContracts = useCallback((type: MarketType) => {
        if (type === 'BNB') {
            return {
                marketplace: bnbMarketplaceContract,
                predictionMarket: bnbPredictionMarketContract,
                marketplaceAddress: CUSTODIAL_MARKETPLACE_ADDRESS
            }
        } else {
            return {
                marketplace: pdxMarketplaceContract,
                predictionMarket: pdxPredictionMarketContract,
                marketplaceAddress: PDX_MARKETPLACE_ADDRESS
            }
        }
    }, [bnbMarketplaceContract, bnbPredictionMarketContract, pdxMarketplaceContract, pdxPredictionMarketContract])

    const isOwnershipTransferred = useCallback(async (marketId: number, type: MarketType = 'BNB'): Promise<boolean> => {
        const { predictionMarket, marketplaceAddress } = getContracts(type)
        if (!predictionMarket) return false

        try {
            const marketInfo = await predictionMarket.getMarketInfo(BigInt(marketId))
            // Check if marketplace is the owner (creator field would be marketplace address if transferred)
            const isTransferred = marketInfo.creator?.toLowerCase() === marketplaceAddress.toLowerCase()
            return isTransferred
        } catch (e) {
            console.error('Error checking ownership:', e)
            return false
        }
    }, [getContracts])

    const getListing = useCallback(async (marketId: number, type: MarketType = 'BNB'): Promise<MarketListing | null> => {
        const { marketplace } = getContracts(type)
        if (!marketplace) return null

        try {
            const listingId = await marketplace.getListingByMarket(marketId)
            if (Number(listingId) === 0) return null

            const listing = await marketplace.getListing(listingId)
            if (!listing.isActive) return null

            // Check if ownership was transferred
            const isTransferred = await isOwnershipTransferred(marketId, type)

            return {
                listingId: Number(listingId),
                marketId: Number(listing.marketId),
                seller: listing.seller,
                price: ethers.formatEther(listing.price),
                listedAt: Number(listing.listedAt),
                isActive: listing.isActive,
                isTransferred,
                type
            }
        } catch (e) {
            console.error('Error fetching listing', e)
            return null
        }
    }, [getContracts, isOwnershipTransferred])

    const listMarket = useCallback(async (marketId: number, price: string, type: MarketType = 'BNB') => {
        const { marketplace } = getContracts(type)
        if (!signer || !marketplace) throw new Error('Wallet not connected or contract not ready')

        const contractWithSigner = marketplace.connect(signer) as ethers.Contract
        const priceWei = ethers.parseEther(price)

        const tx = await contractWithSigner.listMarket(marketId, priceWei)
        return await tx.wait()
    }, [signer, getContracts])

    const transferOwnership = useCallback(async (marketId: number, type: MarketType = 'BNB') => {
        const { predictionMarket, marketplaceAddress } = getContracts(type)
        if (!signer || !predictionMarket) throw new Error('Wallet not connected or contract not ready')

        const contractWithSigner = predictionMarket.connect(signer) as ethers.Contract

        try {
            const tx = await contractWithSigner.transferMarketOwnership(marketId, marketplaceAddress, { gasLimit: 200000 })
            return await tx.wait()
        } catch (error: any) {
            console.error('Transfer failed:', error)
            throw new Error('Transfer failed. Please ensure the PredictionMarket contract supports ownership transfer.')
        }
    }, [signer, getContracts])

    const buyMarket = useCallback(async (marketId: number, type: MarketType = 'BNB') => {
        const { marketplace, predictionMarket, marketplaceAddress } = getContracts(type)

        if (!account || !walletClient) throw new Error('Wallet not connected')
        if (!marketplace) throw new Error('Marketplace contract not initialized')
        if (!signer) throw new Error('Signer not initialized')

        if (typeof marketId !== 'number' || isNaN(marketId)) {
            throw new Error(`Invalid marketId: ${marketId}`)
        }


        try {
            // 0. CHECK MARKET STATE
            const isListed = await marketplace.isMarketListed(BigInt(marketId))

            if (!isListed) {
                throw new Error(`Market ${marketId} is not listed`)
            }

            const listingId = await marketplace.getListingByMarket(BigInt(marketId))
            const listing = await marketplace.getListing(listingId)


            if (!listing.isActive) {
                throw new Error(`Listing not active`)
            }

            if (!listing.isTransferred) {
                throw new Error(`Market ownership not transferred to marketplace yet. Seller needs to confirm transfer.`)
            }

            // Check Market Status on PredictionMarket contract
            if (predictionMarket) {
                const marketInfo = await predictionMarket.getMarketInfo(BigInt(marketId))
            }

            // 1. Check PDX
            const userAddress = await signer.getAddress()
            const pdxContract = new ethers.Contract(NEXT_PUBLIC_PDX_TOKEN_ADDRESS, [
                'function allowance(address owner, address spender) view returns (uint256)',
                'function approve(address spender, uint256 amount) returns (bool)',
                'function balanceOf(address account) view returns (uint256)'
            ], signer)

            const balance = await pdxContract.balanceOf(userAddress)
            const allowance = await pdxContract.allowance(userAddress, marketplaceAddress)


            if (balance < listing.price) {
                throw new Error(`Insufficient balance`)
            }

            if (allowance < listing.price) {
                const txApprove = await pdxContract.approve(marketplaceAddress, ethers.MaxUint256)
                await txApprove.wait()
            }

            // 2. Buy - Manually encode the function call

            // Manually encode buyMarket(uint256 marketId)
            const iface = new ethers.Interface([
                'function buyMarket(uint256 marketId)'
            ])
            const encodedData = iface.encodeFunctionData('buyMarket', [BigInt(marketId)])


            const tx = await signer.sendTransaction({
                to: marketplaceAddress,
                data: encodedData,
                gasLimit: 300000n
            })

            const receipt = await tx.wait()

            return receipt
        } catch (error: any) {
            console.error('❌ Failed:', error.message)
            throw error
        }
    }, [signer, getContracts, account, walletClient])

    const cancelListing = useCallback(async (marketId: number, type: MarketType = 'BNB') => {
        const { marketplace } = getContracts(type)
        if (!signer || !marketplace) throw new Error('Wallet not connected or contract not ready')

        const contractWithSigner = marketplace.connect(signer) as ethers.Contract
        const tx = await contractWithSigner.cancelListing(marketId)
        return await tx.wait()
    }, [signer, getContracts])

    const updatePrice = useCallback(async (marketId: number, newPrice: string, type: MarketType = 'BNB') => {
        const { marketplace } = getContracts(type)
        if (!signer || !marketplace) throw new Error('Wallet not connected or contract not ready')

        const contractWithSigner = marketplace.connect(signer) as ethers.Contract
        const priceWei = ethers.parseEther(newPrice)
        const tx = await contractWithSigner.updatePrice(marketId, priceWei)
        return await tx.wait()
    }, [signer, getContracts])

    const getAllListings = useCallback(async (): Promise<MarketListing[]> => {
        if (!bnbMarketplaceContract && !pdxMarketplaceContract) return []

        const fetchFromContract = async (contract: ethers.Contract, type: MarketType): Promise<MarketListing[]> => {
            try {
                const nextId = await contract.nextListingId()
                const totalListings = Number(nextId)

                if (totalListings <= 1) return []

                const promises = []
                for (let i = 1; i < totalListings; i++) {
                    promises.push(contract.getListing(i))
                }

                const results = await Promise.all(promises)

                // Check ownership for each listing
                const listingsWithTransfer = await Promise.all(
                    results.map(async (listing, index) => {
                        const listingId = index + 1
                        const marketId = Number(listing.marketId)
                        const isTransferred = await isOwnershipTransferred(marketId, type)

                        return {
                            listingId,
                            marketId,
                            seller: listing.seller,
                            price: ethers.formatEther(listing.price),
                            listedAt: Number(listing.listedAt),
                            isActive: listing.isActive,
                            isTransferred,
                            type
                        }
                    })
                )
                return listingsWithTransfer
            } catch (e) {
                console.error(`❌ Error fetching [${type}] listings:`, e)
                return []
            }
        }

        const bnbListings = bnbMarketplaceContract ? await fetchFromContract(bnbMarketplaceContract, 'BNB') : []
        const pdxListings = pdxMarketplaceContract ? await fetchFromContract(pdxMarketplaceContract, 'PDX') : []

        const allListings = [...bnbListings, ...pdxListings]
        return allListings

    }, [bnbMarketplaceContract, pdxMarketplaceContract, isOwnershipTransferred])

    const isMarketListed = useCallback(async (marketId: number, type: MarketType = 'BNB'): Promise<boolean> => {
        const listing = await getListing(marketId, type)
        return !!listing
    }, [getListing])

    const confirmTransfer = useCallback(async (marketId: number, type: MarketType = 'BNB') => {
        const { marketplace } = getContracts(type)
        if (!signer || !marketplace) throw new Error('Wallet not connected or contract not ready')

        const contractWithSigner = marketplace.connect(signer) as ethers.Contract

        try {
            const tx = await contractWithSigner.confirmTransfer(marketId, { gasLimit: 200000 })
            return await tx.wait()
        } catch (error: any) {
            console.error('Confirm transfer failed:', error)
            throw new Error('Confirm transfer failed. Please ensure ownership was transferred to the marketplace.')
        }
    }, [signer, getContracts])

    return {
        listMarket,
        transferOwnership,
        confirmTransfer,
        buyMarket,
        cancelListing,
        updatePrice,
        getListing,
        getAllListings,
        isMarketListed,
        isOwnershipTransferred,
        isReady
    }
}