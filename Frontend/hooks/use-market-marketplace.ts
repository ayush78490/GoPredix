import { useState, useCallback, useEffect } from 'react'
import { ethers, BrowserProvider, JsonRpcSigner } from 'ethers'
import { useAccount, useWalletClient, usePublicClient } from 'wagmi'
import {
    CUSTODIAL_MARKETPLACE_ADDRESS,
    NEXT_PUBLIC_PDX_TOKEN_ADDRESS,
    PREDICTION_MARKET_ADDRESS,
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
}

export function useMarketMarketplace() {
    const { address: account } = useAccount()
    const { data: walletClient } = useWalletClient()
    const publicClient = usePublicClient()

    const [marketplaceContract, setMarketplaceContract] = useState<ethers.Contract | null>(null)
    const [predictionMarketContract, setPredictionMarketContract] = useState<ethers.Contract | null>(null)
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
            console.log('🔧 Initializing contracts...')
            try {
                const contract = new ethers.Contract(
                    CUSTODIAL_MARKETPLACE_ADDRESS,
                    MARKETPLACE_ABI as any,
                    provider
                )
                setMarketplaceContract(contract)
                console.log('✅ Marketplace contract initialized')

                const pmContract = new ethers.Contract(
                    PREDICTION_MARKET_ADDRESS,
                    PREDICTION_MARKET_ABI as any,
                    provider
                )
                setPredictionMarketContract(pmContract)
                console.log('✅ Prediction market contract initialized')

                setIsReady(true)
            } catch (error) {
                console.error('❌ Contract initialization error:', error)
            }
        }
    }, [provider])

    const isOwnershipTransferred = useCallback(async (marketId: number): Promise<boolean> => {
        if (!predictionMarketContract) return false

        try {
            const marketInfo = await predictionMarketContract.getMarketInfo(BigInt(marketId))
            // Check if marketplace is the owner (creator field would be marketplace address if transferred)
            const isTransferred = marketInfo.creator?.toLowerCase() === CUSTODIAL_MARKETPLACE_ADDRESS.toLowerCase()
            console.log(`   🔍 Market ${marketId} ownership: ${isTransferred ? 'transferred to marketplace' : 'still with original creator'}`)
            return isTransferred
        } catch (e) {
            console.error('Error checking ownership:', e)
            return false
        }
    }, [predictionMarketContract])

    const getListing = useCallback(async (marketId: number): Promise<MarketListing | null> => {
        if (!marketplaceContract) return null

        try {
            const listingId = await marketplaceContract.getListingByMarket(marketId)
            if (Number(listingId) === 0) return null

            const listing = await marketplaceContract.getListing(listingId)
            if (!listing.isActive) return null

            // Check if ownership was transferred
            const isTransferred = await isOwnershipTransferred(marketId)

            return {
                listingId: Number(listingId),
                marketId: Number(listing.marketId),
                seller: listing.seller,
                price: ethers.formatEther(listing.price),
                listedAt: Number(listing.listedAt),
                isActive: listing.isActive,
                isTransferred
            }
        } catch (e) {
            console.error('Error fetching listing', e)
            return null
        }
    }, [marketplaceContract, isOwnershipTransferred])

    const listMarket = useCallback(async (marketId: number, price: string) => {
        if (!signer || !marketplaceContract) throw new Error('Wallet not connected')

        const contractWithSigner = marketplaceContract.connect(signer) as ethers.Contract
        const priceWei = ethers.parseEther(price)

        console.log(`📝 Listing market ${marketId} for ${price} PDX`)
        const tx = await contractWithSigner.listMarket(marketId, priceWei)
        console.log(`⏳ Tx hash: ${tx.hash}`)
        return await tx.wait()
    }, [signer, marketplaceContract])

    const transferOwnership = useCallback(async (marketId: number) => {
        if (!signer || !predictionMarketContract) throw new Error('Wallet not connected')

        const contractWithSigner = predictionMarketContract.connect(signer) as ethers.Contract
        console.log(`📤 Transferring ownership of market ${marketId} to ${CUSTODIAL_MARKETPLACE_ADDRESS}`)

        try {
            const tx = await contractWithSigner.transferMarketOwnership(marketId, CUSTODIAL_MARKETPLACE_ADDRESS, { gasLimit: 200000 })
            console.log(`⏳ Tx hash: ${tx.hash}`)
            return await tx.wait()
        } catch (error: any) {
            console.error('Transfer failed:', error)
            throw new Error('Transfer failed. Please ensure the PredictionMarket contract supports ownership transfer.')
        }
    }, [signer, predictionMarketContract])

    const buyMarket = useCallback(async (marketId: number) => {
        console.log('📊 Contract:', marketplaceContract)
        console.log('📊 Contract functions:', marketplaceContract?.interface?.fragments.map((f: any) => f.name))

        if (!account || !walletClient) throw new Error('Wallet not connected')
        if (!marketplaceContract) throw new Error('Marketplace contract not initialized')
        if (!signer) throw new Error('Signer not initialized')

        if (typeof marketId !== 'number' || isNaN(marketId)) {
            throw new Error(`Invalid marketId: ${marketId}`)
        }

        console.log(`🛒 Starting buyMarket for marketId: ${marketId}`)

        try {
            // 0. CHECK MARKET STATE
            console.log('0️⃣ Checking market listing status...')
            const isListed = await marketplaceContract.isMarketListed(BigInt(marketId))
            console.log(`   Is market listed: ${isListed}`)

            if (!isListed) {
                throw new Error(`Market ${marketId} is not listed`)
            }

            const listingId = await marketplaceContract.getListingByMarket(BigInt(marketId))
            const listing = await marketplaceContract.getListing(listingId)

            console.log(`   Listing:`, {
                seller: listing.seller,
                price: ethers.formatEther(listing.price),
                isActive: listing.isActive,
                isTransferred: listing.isTransferred
            })

            if (!listing.isActive) {
                throw new Error(`Listing not active`)
            }

            if (!listing.isTransferred) {
                throw new Error(`Market ownership not transferred to marketplace yet. Seller needs to confirm transfer.`)
            }

            // Check Market Status on PredictionMarket contract
            if (predictionMarketContract) {
                console.log('📊 Checking Market Status on PredictionMarket contract...')
                const marketInfo = await predictionMarketContract.getMarketInfo(BigInt(marketId))
                console.log('📊 Market Status:', Number(marketInfo.status))
                console.log('   Status meaning: 0=Open, 1=Active, 2=ResolutionRequested, 3=Resolved, 4=Disputed')
            }

            // 1. Check PDX
            console.log('1️⃣ Checking PDX...')
            const userAddress = await signer.getAddress()
            const pdxContract = new ethers.Contract(NEXT_PUBLIC_PDX_TOKEN_ADDRESS, [
                'function allowance(address owner, address spender) view returns (uint256)',
                'function approve(address spender, uint256 amount) returns (bool)',
                'function balanceOf(address account) view returns (uint256)'
            ], signer)

            const balance = await pdxContract.balanceOf(userAddress)
            const allowance = await pdxContract.allowance(userAddress, CUSTODIAL_MARKETPLACE_ADDRESS)

            console.log(`   Balance: ${ethers.formatEther(balance)} PDX`)
            console.log(`   Allowance: ${ethers.formatEther(allowance)} PDX`)

            if (balance < listing.price) {
                throw new Error(`Insufficient balance`)
            }

            if (allowance < listing.price) {
                console.log('⚠️ Approving PDX...')
                const txApprove = await pdxContract.approve(CUSTODIAL_MARKETPLACE_ADDRESS, ethers.MaxUint256)
                await txApprove.wait()
                console.log('✅ Approved')
            }

            // Debugging Marketplace state (Requested by User)
            console.log('🕵️‍♂️ Debugging Marketplace State...')
            const marketplaceBalance = await pdxContract.balanceOf(CUSTODIAL_MARKETPLACE_ADDRESS)
            console.log('   Marketplace PDX Balance:', ethers.formatEther(marketplaceBalance))

            // Check allowance from marketplace to seller (as requested)
            const marketplaceToSellerAllowance = await pdxContract.allowance(CUSTODIAL_MARKETPLACE_ADDRESS, listing.seller)
            console.log('   Marketplace -> Seller Allowance:', ethers.formatEther(marketplaceToSellerAllowance))

            // 2. Buy - Manually encode the function call
            console.log('2️⃣ Executing buyMarket...')

            // Manually encode buyMarket(uint256 marketId)
            const iface = new ethers.Interface([
                'function buyMarket(uint256 marketId)'
            ])
            const encodedData = iface.encodeFunctionData('buyMarket', [BigInt(marketId)])

            console.log('📦 Encoded data:', encodedData)

            const tx = await signer.sendTransaction({
                to: CUSTODIAL_MARKETPLACE_ADDRESS,
                data: encodedData,
                gasLimit: 300000n
            })

            console.log('⏳ Tx sent:', tx.hash)
            const receipt = await tx.wait()
            console.log('✅ Success!')

            return receipt
        } catch (error: any) {
            console.error('❌ Failed:', error.message)
            throw error
        }
    }, [signer, marketplaceContract, account, walletClient])

    const cancelListing = useCallback(async (marketId: number) => {
        if (!signer || !marketplaceContract) throw new Error('Wallet not connected')

        const contractWithSigner = marketplaceContract.connect(signer) as ethers.Contract
        const tx = await contractWithSigner.cancelListing(marketId)
        return await tx.wait()
    }, [signer, marketplaceContract])

    const updatePrice = useCallback(async (marketId: number, newPrice: string) => {
        if (!signer || !marketplaceContract) throw new Error('Wallet not connected')

        const contractWithSigner = marketplaceContract.connect(signer) as ethers.Contract
        const priceWei = ethers.parseEther(newPrice)
        const tx = await contractWithSigner.updatePrice(marketId, priceWei)
        return await tx.wait()
    }, [signer, marketplaceContract])

    const getAllListings = useCallback(async (): Promise<MarketListing[]> => {
        if (!marketplaceContract) return []

        try {
            console.log('📋 Fetching listings...')
            const nextId = await marketplaceContract.nextListingId()
            const totalListings = Number(nextId)
            console.log(`📋 Contract has ${totalListings - 1} listings (nextId: ${nextId})`)

            if (totalListings <= 1) return []

            const listings: MarketListing[] = []
            const promises = []
            for (let i = 1; i < totalListings; i++) {
                promises.push(marketplaceContract.getListing(i))
            }

            const results = await Promise.all(promises)
            console.log(`📋 Raw listings fetched:`, results)

            // Check ownership for each listing
            const listingsWithTransfer = await Promise.all(
                results.map(async (listing, index) => {
                    const listingId = index + 1
                    const marketId = Number(listing.marketId)
                    const isTransferred = await isOwnershipTransferred(marketId)

                    return {
                        listingId,
                        marketId,
                        seller: listing.seller,
                        price: ethers.formatEther(listing.price),
                        listedAt: Number(listing.listedAt),
                        isActive: listing.isActive,
                        isTransferred
                    }
                })
            )

            console.log(`✅ Fetched ${listingsWithTransfer.length} listings`)
            return listingsWithTransfer
        } catch (e) {
            console.error('❌ Error:', e)
            return []
        }
    }, [marketplaceContract, isOwnershipTransferred])

    const isMarketListed = useCallback(async (marketId: number): Promise<boolean> => {
        const listing = await getListing(marketId)
        return !!listing
    }, [getListing])

    const confirmTransfer = useCallback(async (marketId: number) => {
        if (!signer || !marketplaceContract) throw new Error('Wallet not connected')

        const contractWithSigner = marketplaceContract.connect(signer) as ethers.Contract
        console.log(`✅ Confirming transfer for market ${marketId}`)

        try {
            const tx = await contractWithSigner.confirmTransfer(marketId, { gasLimit: 200000 })
            console.log(`⏳ Tx hash: ${tx.hash}`)
            return await tx.wait()
        } catch (error: any) {
            console.error('Confirm transfer failed:', error)
            throw new Error('Confirm transfer failed. Please ensure ownership was transferred to the marketplace.')
        }
    }, [signer, marketplaceContract])

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