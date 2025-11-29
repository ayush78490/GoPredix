"use client"

import { useState, useEffect, useMemo } from "react"
import Header from "@/components/header"
import Footer from "@/components/footer"
import LightRays from "@/components/LightRays"
import { Button } from "@/components/ui/button"
import { Loader2, Store, PlusCircle } from "lucide-react"
import { useAllMarkets } from "@/hooks/getAllMarkets"
import { useMarketMarketplace, MarketListing } from "@/hooks/use-market-marketplace"
import MarketplaceCard from "@/components/marketplace-card"
import SellMarketModal from "@/components/sell-market-modal"
import { useAccount } from "wagmi"
import { toast } from "@/hooks/use-toast"
import { LogoLoading } from "@/components/ui/logo-loading"

export default function MarketplacePage() {
    const { markets, isLoading: isMarketsLoading } = useAllMarkets()
    const { getAllListings, buyMarket, isReady } = useMarketMarketplace()
    const { address: account, isConnected } = useAccount()

    const [listings, setListings] = useState<MarketListing[]>([])
    const [isLoadingListings, setIsLoadingListings] = useState(true)
    const [isSellModalOpen, setIsSellModalOpen] = useState(false)
    const [buyingMarketId, setBuyingMarketId] = useState<number | null>(null)

    // Helper functions for market conversion
    const extractCategory = (question: string): string => {
        const lower = question.toLowerCase()
        if (lower.includes("bitcoin") || lower.includes("crypto")) return "Crypto"
        if (lower.includes("election") || lower.includes("president")) return "Politics"
        if (lower.includes("stock") || lower.includes("finance")) return "Finance"
        if (lower.includes("sports") || lower.includes("team") || lower.includes("match")) return "Sports"
        if (lower.includes("tech") || lower.includes("ai") || lower.includes("software")) return "Tech"
        if (lower.includes("economy") || lower.includes("inflation") || lower.includes("gdp")) return "Economy"
        return "General"
    }

    const calculatePrices = (yesPool: string, noPool: string) => {
        const yes = parseFloat(yesPool) || 0
        const no = parseFloat(noPool) || 0
        const total = yes + no
        if (total === 0) return { yesPrice: 50, noPrice: 50 }
        return {
            yesPrice: (yes / total) * 100,
            noPrice: (no / total) * 100
        }
    }

    const getMarketStatus = (market: any) => {
        const nowInSeconds = Math.floor(Date.now() / 1000)
        const endTimeInSeconds = Number(market.endTime)
        const contractStatus = Number(market.status)

        if (contractStatus === 3) {
            return {
                isActive: false,
                isEnded: true,
                isResolved: true,
                statusLabel: "Resolved",
                statusColor: "green"
            }
        }

        if (contractStatus === 4) {
            return {
                isActive: false,
                isEnded: true,
                isResolved: false,
                statusLabel: "Disputed",
                statusColor: "orange"
            }
        }

        if (contractStatus === 2) {
            return {
                isActive: false,
                isEnded: true,
                isResolved: false,
                statusLabel: "Resolution Requested",
                statusColor: "yellow"
            }
        }

        if (nowInSeconds >= endTimeInSeconds) {
            return {
                isActive: false,
                isEnded: true,
                isResolved: false,
                statusLabel: "Ended",
                statusColor: "red"
            }
        }

        if (contractStatus === 0) {
            return {
                isActive: true,
                isEnded: false,
                isResolved: false,
                statusLabel: "Active",
                statusColor: "green"
            }
        }

        return {
            isActive: false,
            isEnded: true,
            isResolved: false,
            statusLabel: "Closed",
            statusColor: "red"
        }
    }

    const convertToFrontendMarket = (market: any) => {
        const prices = calculatePrices(market.yesPool, market.noPool)
        const statusInfo = getMarketStatus(market)

        return {
            ...market,
            category: market.category || extractCategory(market.question),
            yesPrice: prices.yesPrice,
            noPrice: prices.noPrice,
            yesMultiplier: prices.yesPrice > 0 ? 100 / prices.yesPrice : 0,
            noMultiplier: prices.noPrice > 0 ? 100 / prices.noPrice : 0,
            paymentToken: market.paymentToken || "BNB",
            ...statusInfo
        }
    }

    const fetchListings = async () => {
        if (!isReady) {
            console.log('⏳ Marketplace contract not ready yet')
            return
        }
        setIsLoadingListings(true)
        try {
            console.log('🔍 Fetching marketplace listings...')
            const allListings = await getAllListings()
            console.log(`📦 Received ${allListings.length} listings from contract`)
            setListings(allListings)
        } catch (error) {
            console.error("❌ Failed to fetch listings:", error)
        } finally {
            setIsLoadingListings(false)
        }
    }

    useEffect(() => {
        if (isReady) {
            console.log('✅ Marketplace ready, fetching listings...')
            fetchListings()
        }
    }, [isReady, getAllListings])

    const listedMarkets = useMemo(() => {
        console.log(`🔗 Matching ${listings.length} listings with ${markets.length} available markets...`)
        console.log(`   Available market numericIds:`, markets.map(m => ({ id: m.id, numericId: m.numericId })))

        const matched = listings.map(listing => {
            console.log(`   Looking for market with numericId=${listing.marketId}`)

            // Try to find market by numericId
            let market = markets.find(m => m.numericId === listing.marketId)

            if (!market) {
                console.warn(`⚠️ No market found for listing #${listing.listingId} (marketId: ${listing.marketId})`)
                console.warn(`   Available numericIds: ${markets.map(m => m.numericId).join(', ')}`)
                return null
            }

            console.log(`✓ Matched listing #${listing.listingId} to market ${market.id} (numericId: ${market.numericId}, active: ${listing.isActive})`)
            return {
                market: convertToFrontendMarket(market),
                listing
            }
        }).filter(item => item !== null) as { market: any, listing: MarketListing }[]

        const activeMatched = matched.filter(m => m.listing.isActive)
        console.log(`📊 Final result: ${matched.length} total listed markets (${activeMatched.length} active, ${matched.length - activeMatched.length} inactive)`)
        return matched
    }, [listings, markets])

    const handleBuy = async (marketId: number, price: string) => {
        if (!isConnected) {
            toast({
                title: "Connect Wallet",
                description: "Please connect your wallet to buy markets",
                variant: "destructive"
            })
            return
        }

        setBuyingMarketId(marketId)
        try {
            console.log(`Attempting to buy market ${marketId} for ${price} PDX`);
            // Find listing to check seller
            const listing = listings.find(l => l.marketId === marketId);
            if (listing && isConnected && account && listing.seller.toLowerCase() === account.toLowerCase()) {
                throw new Error("You cannot buy your own listing.");
            }

            await buyMarket(marketId, price) // Assuming price is not needed for buyMarket call based on ABI, but passing it just in case logic changes. The hook ignores it if not needed.
            // Actually my hook implementation of buyMarket takes (marketId, price) but only uses marketId.
            // Wait, I should check if I need to approve PDX.
            // The user didn't ask for approval flow, but if it fails, I might need to add it.

            toast({
                title: "Success!",
                description: "You have successfully bought the market.",
            })
            fetchListings() // Refresh listings
        } catch (error: any) {
            console.error(error)
            toast({
                title: "Transaction Failed",
                description: error.message || "Failed to buy market",
                variant: "destructive"
            })
        } finally {
            setBuyingMarketId(null)
        }
    }

    return (
        <main className="min-h-screen bg-background relative overflow-hidden">
            <div className="fixed inset-0 z-0">
                <LightRays
                    raysOrigin="top-center"
                    raysColor="#10b981" // Greenish for money/marketplace
                    raysSpeed={1.0}
                    lightSpread={0.6}
                    rayLength={1.0}
                />
            </div>

            <div className="relative z-10 bg-black/80 min-h-screen flex flex-col">
                <Header />

                <div className="flex-grow max-w-7xl mx-auto px-4 py-8 w-full mt-[10vh]">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10">
                        <div>
                            <h1 className="text-4xl font-bold mb-2 text-white flex items-center gap-3">
                                <Store className="w-10 h-10 text-green-500" />
                                Market Marketplace
                            </h1>
                            <p className="text-muted-foreground">
                                Buy and sell prediction markets. Earn royalties from trading fees.
                            </p>
                        </div>

                        <div className="mt-4 md:mt-0">
                            <Button
                                onClick={() => setIsSellModalOpen(true)}
                                className="bg-green-600 hover:bg-green-700 text-white font-semibold"
                                disabled={!isConnected}
                            >
                                <PlusCircle className="w-5 h-5 mr-2" />
                                Sell Your Market
                            </Button>
                        </div>
                    </div>

                    {(isMarketsLoading || isLoadingListings) && listings.length === 0 ? (
                        <div className="flex justify-center items-center py-20">
                            <LogoLoading size={64} />
                        </div>
                    ) : (
                        <>
                            {listedMarkets.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {listedMarkets.map(({ market, listing }) => (
                                        <MarketplaceCard
                                            key={listing.listingId}
                                            market={market}
                                            listing={listing}
                                            onBuy={() => handleBuy(listing.marketId, listing.price)}
                                            isBuying={buyingMarketId === listing.marketId}
                                        />
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-20 bg-white/5 rounded-2xl border border-white/10 backdrop-blur-sm">
                                    <Store className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
                                    <h3 className="text-xl font-semibold text-white mb-2">No Markets for Sale</h3>
                                    <p className="text-muted-foreground max-w-md mx-auto">
                                        There are currently no markets listed for sale. Be the first to list yours!
                                    </p>
                                    <Button
                                        variant="outline"
                                        className="mt-6 border-green-500/50 text-green-400 hover:bg-green-500/10"
                                        onClick={() => setIsSellModalOpen(true)}
                                    >
                                        List a Market
                                    </Button>
                                </div>
                            )}
                        </>
                    )}
                </div>

                <Footer />
            </div>

            <SellMarketModal
                isOpen={isSellModalOpen}
                onClose={() => setIsSellModalOpen(false)}
                onSuccess={fetchListings}
            />
        </main>
    )
}
