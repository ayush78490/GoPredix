import { useState, useCallback, useEffect } from 'react'
import { ethers, BrowserProvider, JsonRpcSigner } from 'ethers'
import { useAccount, useWalletClient, usePublicClient } from 'wagmi'
import {
    CUSTODIAL_MARKETPLACE_ADDRESS,
    MARKET_MARKETPLACE_ABI,
    NEXT_PUBLIC_PDX_TOKEN_ADDRESS,
    PREDICTION_MARKET_ADDRESS,
    PREDICTION_MARKET_OWNERSHIP_ABI
} from '../lib/web3/config'

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
            const contract = new ethers.Contract(
                CUSTODIAL_MARKETPLACE_ADDRESS,
                MARKET_MARKETPLACE_ABI,
                provider
            )
            setMarketplaceContract(contract)

            const pmContract = new ethers.Contract(
                PREDICTION_MARKET_ADDRESS,
                PREDICTION_MARKET_OWNERSHIP_ABI,
                provider
            )
            setPredictionMarketContract(pmContract)

            setIsReady(true)
        }
    }, [provider])

    const getListing = useCallback(async (marketId: number): Promise<MarketListing | null> => {
        if (!marketplaceContract) return null

        try {
            const listingId = await marketplaceContract.getListingByMarket(marketId)
            if (Number(listingId) === 0) return null

            const listing = await marketplaceContract.getListing(listingId)
            if (!listing.isActive) return null

            return {
                listingId: Number(listingId),
                marketId: Number(listing.marketId),
                seller: listing.seller,
                price: ethers.formatEther(listing.price),
                listedAt: Number(listing.listedAt),
                isActive: listing.isActive,
                isTransferred: listing.isTransferred
            }
        } catch (e) {
            console.error("Error fetching listing", e)
            return null
        }
    }, [marketplaceContract])

    const listMarket = useCallback(async (marketId: number, price: string) => {
        if (!signer || !marketplaceContract) throw new Error("Wallet not connected")

        const contractWithSigner = marketplaceContract.connect(signer) as ethers.Contract
        const priceWei = ethers.parseEther(price)

        const tx = await contractWithSigner.listMarket(marketId, priceWei)
        return await tx.wait()
    }, [signer, marketplaceContract])

    const transferOwnership = useCallback(async (marketId: number) => {
        if (!signer || !predictionMarketContract) throw new Error("Wallet not connected")

        const contractWithSigner = predictionMarketContract.connect(signer) as ethers.Contract
        // Transfer to Custodial Marketplace
        const tx = await contractWithSigner.transferMarketOwnership(marketId, CUSTODIAL_MARKETPLACE_ADDRESS)
        return await tx.wait()
    }, [signer, predictionMarketContract])

    const confirmTransfer = useCallback(async (marketId: number) => {
        if (!signer || !marketplaceContract) throw new Error("Wallet not connected")

        const contractWithSigner = marketplaceContract.connect(signer) as ethers.Contract
        const tx = await contractWithSigner.confirmTransfer(marketId)
        return await tx.wait()
    }, [signer, marketplaceContract])

    const buyMarket = useCallback(async (marketId: number, price: string) => {
        if (!signer || !marketplaceContract) throw new Error("Wallet not connected")

        if (typeof marketId !== 'number' || isNaN(marketId)) {
            throw new Error(`Invalid marketId: ${marketId}`)
        }

        console.log(`🛒 Starting buyMarket for marketId: ${marketId}, price: ${price} PDX`)

        const contractWithSigner = marketplaceContract.connect(signer) as ethers.Contract
        const priceWei = ethers.parseEther(price)

        try {
            // 1. Check PDX balance and allowance
            console.log("1️⃣ Checking PDX balance and allowance...")
            const userAddress = await signer.getAddress()
            const pdxContract = new ethers.Contract(NEXT_PUBLIC_PDX_TOKEN_ADDRESS, [
                "function allowance(address owner, address spender) view returns (uint256)",
                "function approve(address spender, uint256 amount) returns (bool)",
                "function balanceOf(address account) view returns (uint256)"
            ], signer)

            const balance = await pdxContract.balanceOf(userAddress)

            if (balance < priceWei) {
                throw new Error(`Insufficient PDX balance. You have ${ethers.formatEther(balance)} PDX, but need ${price} PDX.`)
            }

            const currentAllowance = await pdxContract.allowance(userAddress, CUSTODIAL_MARKETPLACE_ADDRESS)

            if (currentAllowance < priceWei) {
                console.log("⚠️ Insufficient allowance, requesting approval...")
                const approvalAmount = ethers.MaxUint256
                const txApprove = await pdxContract.approve(CUSTODIAL_MARKETPLACE_ADDRESS, approvalAmount)
                await txApprove.wait()
                console.log("✅ PDX approved successfully")
            }

            // 2. Execute transaction
            console.log("2️⃣ Executing buyMarket transaction...")
            const tx = await contractWithSigner.buyMarket(marketId)
            console.log("⏳ Transaction sent, hash:", tx.hash)

            const receipt = await tx.wait()
            console.log("✅ Transaction confirmed successfully!")

            return receipt
        } catch (error: any) {
            console.error("❌ buyMarket failed:", error)
            throw error
        }
    }, [signer, marketplaceContract])

    const cancelListing = useCallback(async (marketId: number) => {
        if (!signer || !marketplaceContract) throw new Error("Wallet not connected")

        const contractWithSigner = marketplaceContract.connect(signer) as ethers.Contract
        const tx = await contractWithSigner.cancelListing(marketId)
        return await tx.wait()
    }, [signer, marketplaceContract])

    const updatePrice = useCallback(async (marketId: number, newPrice: string) => {
        if (!signer || !marketplaceContract) throw new Error("Wallet not connected")

        const contractWithSigner = marketplaceContract.connect(signer) as ethers.Contract
        const priceWei = ethers.parseEther(newPrice)
        const tx = await contractWithSigner.updatePrice(marketId, priceWei)
        return await tx.wait()
    }, [signer, marketplaceContract])

    const getAllListings = useCallback(async (): Promise<MarketListing[]> => {
        if (!marketplaceContract) return []

        try {
            console.log('📋 Fetching all marketplace listings...')
            const nextId = await marketplaceContract.nextListingId()
            const totalListings = Number(nextId)

            if (totalListings <= 1) return []

            const listings: MarketListing[] = []
            const promises = []
            for (let i = 1; i < totalListings; i++) {
                promises.push(marketplaceContract.getListing(i))
            }

            const results = await Promise.all(promises)

            results.forEach((listing, index) => {
                const listingId = index + 1
                listings.push({
                    listingId,
                    marketId: Number(listing.marketId),
                    seller: listing.seller,
                    price: ethers.formatEther(listing.price),
                    listedAt: Number(listing.listedAt),
                    isActive: listing.isActive,
                    isTransferred: listing.isTransferred
                })
            })

            return listings
        } catch (e) {
            console.error("❌ Error fetching all listings:", e)
            return []
        }
    }, [marketplaceContract])

    const isMarketListed = useCallback(async (marketId: number): Promise<boolean> => {
        const listing = await getListing(marketId)
        return !!listing
    }, [getListing])

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
        isReady
    }
}