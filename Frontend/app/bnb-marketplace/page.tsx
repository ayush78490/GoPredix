'use client'

import { useState, useEffect } from 'react'
import { usePredictionMarketBNB, BNBMarket } from '@/hooks/use-predection-market'
import { useBNBNativeMarketplace, MarketListing } from '@/hooks/use-bnb-native-marketplace'
import { BNBMarketplaceCard } from '@/components/bnb-marketplace-card'
import { useAccount } from 'wagmi'
import { Loader2, ShoppingBag, TrendingUp, Clock } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export default function BNBMarketplacePage() {
    const { address } = useAccount()
    const { getMarket, isContractReady } = usePredictionMarketBNB()
    const {
        getListing,
        getListingByMarket,
        isContractReady: isMarketplaceReady
    } = useBNBNativeMarketplace()

    const [listedMarkets, setListedMarkets] = useState<Array<{
        market: BNBMarket
        listing: MarketListing
    }>>([])
    const [userMarkets, setUserMarkets] = useState<BNBMarket[]>([])
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        if (isContractReady && isMarketplaceReady) {
            loadMarkets()
        }
    }, [isContractReady, isMarketplaceReady, address])

    const loadMarkets = async () => {
        setIsLoading(true)
        try {
            const marketsWithListings: Array<{ market: BNBMarket; listing: MarketListing }> = []
            const ownedMarkets: BNBMarket[] = []

            // Scan through market IDs (you might want to optimize this with events)
            for (let i = 0; i < 100; i++) {
                const market = await getMarket(i)
                if (!market) continue

                // Check if market is listed
                const listingId = await getListingByMarket(i)
                if (listingId > 0) {
                    const listing = await getListing(listingId)
                    if (listing && listing.isActive) {
                        marketsWithListings.push({ market, listing })
                    }
                }

                // Check if user owns this market
                if (address && market.creator.toLowerCase() === address.toLowerCase()) {
                    ownedMarkets.push(market)
                }
            }

            setListedMarkets(marketsWithListings)
            setUserMarkets(ownedMarkets)
        } catch (error) {
            console.error('Error loading markets:', error)
        } finally {
            setIsLoading(false)
        }
    }

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center space-y-4">
                    <Loader2 className="w-12 h-12 animate-spin mx-auto text-yellow-500" />
                    <p className="text-gray-400">Loading marketplace...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="container mx-auto px-4 py-8 max-w-7xl">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-4xl font-bold text-white mb-2">
                    <ShoppingBag className="inline-block w-10 h-10 mr-3 text-yellow-500" />
                    BNB Market Marketplace
                </h1>
                <p className="text-gray-400 text-lg">
                    Buy and sell prediction markets with BNB · 2% marketplace fee
                </p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <Card className="p-6 bg-gradient-to-br from-yellow-500/10 to-yellow-600/5 border-yellow-500/30">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-gray-400 text-sm">Listed Markets</p>
                            <p className="text-3xl font-bold text-white">{listedMarkets.length}</p>
                        </div>
                        <TrendingUp className="w-12 h-12 text-yellow-500 opacity-50" />
                    </div>
                </Card>

                <Card className="p-6 bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-500/30">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-gray-400 text-sm">Your Markets</p>
                            <p className="text-3xl font-bold text-white">{userMarkets.length}</p>
                        </div>
                        <Clock className="w-12 h-12 text-green-500 opacity-50" />
                    </div>
                </Card>

                <Card className="p-6 bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/30">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-gray-400 text-sm">Payment Method</p>
                            <p className="text-2xl font-bold text-white">Native BNB</p>
                        </div>
                        <ShoppingBag className="w-12 h-12 text-blue-500 opacity-50" />
                    </div>
                </Card>
            </div>

            {/* Tabs */}
            <Tabs defaultValue="listed" className="space-y-6">
                <TabsList className="grid w-full max-w-md grid-cols-2 bg-slate-800" >
                    <TabsTrigger value="listed" className="data-[state=active]:bg-yellow-500 data-[state=active]:text-black">
                        Listed Markets ({listedMarkets.length})
                    </TabsTrigger>
                    <TabsTrigger value="yours" className="data-[state=active]:bg-yellow-500 data-[state=active]:text-black">
                        Your Markets ({userMarkets.length})
                    </TabsTrigger>
                </TabsList>

                {/* Listed Markets Tab */}
                <TabsContent value="listed" className="space-y-4">
                    {listedMarkets.length === 0 ? (
                        <Card className="p-12 text-center bg-slate-900 border-gray-700">
                            <ShoppingBag className="w-16 h-16 mx-auto text-gray-600 mb-4" />
                            <h3 className="text-xl font-semibold text-white mb-2">No Markets Listed</h3>
                            <p className="text-gray-400">
                                Be the first to list a market for sale!
                            </p>
                        </Card>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {listedMarkets.map(({ market, listing }) => (
                                <BNBMarketplaceCard
                                    key={market.id}
                                    market={market}
                                    listing={listing}
                                    userAddress={address}
                                    onSuccess={loadMarkets}
                                />
                            ))}
                        </div>
                    )}
                </TabsContent>

                {/* User's Markets Tab */}
                <TabsContent value="yours" className="space-y-4">
                    {!address ? (
                        <Card className="p-12 text-center bg-slate-900 border-gray-700">
                            <p className="text-gray-400">
                                Connect your wallet to see your markets
                            </p>
                        </Card>
                    ) : userMarkets.length === 0 ? (
                        <Card className="p-12 text-center bg-slate-900 border-gray-700">
                            <Clock className="w-16 h-16 mx-auto text-gray-600 mb-4" />
                            <h3 className="text-xl font-semibold text-white mb-2">No Markets Yet</h3>
                            <p className="text-gray-400">
                                Create a market to start trading!
                            </p>
                        </Card>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {userMarkets.map((market) => (
                                <BNBMarketplaceCard
                                    key={market.id}
                                    market={market}
                                    userAddress={address}
                                    onSuccess={loadMarkets}
                                />
                            ))}
                        </div>
                    )}
                </TabsContent>
            </Tabs>

            {/* How It Works */}
            <Card className="p-8 mt-12 bg-gradient-to-br from-slate-900 to-slate-800 border-yellow-500/20">
                <h2 className="text-2xl font-bold text-white mb-6">How It Works</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-2">
                        <div className="w-12 h-12 bg-yellow-500 rounded-full flex items-center justify-center text-black font-bold text-xl">
                            1
                        </div>
                        <h3 className="text-lg font-semibold text-white">List Your Market</h3>
                        <p className="text-gray-400 text-sm">
                            Set a price in BNB and list your market for sale. You retain ownership until sold.
                        </p>
                    </div>
                    <div className="space-y-2">
                        <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center text-black font-bold text-xl">
                            2
                        </div>
                        <h3 className="text-lg font-semibold text-white">Buy or Make Offers</h3>
                        <p className="text-gray-400 text-sm">
                            Buy instantly at listing price or make an offer. Offers lock BNB as escrow.
                        </p>
                    </div>
                    <div className="space-y-2">
                        <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center text-black font-bold text-xl">
                            3
                        </div>
                        <h3 className="text-lg font-semibold text-white">Transfer & Fees</h3>
                        <p className="text-gray-400 text-sm">
                            On sale, ownership transfers instantly. Seller receives BNB minus 2% marketplace fee.
                        </p>
                    </div>
                </div>
            </Card>
        </div>
    )
}
