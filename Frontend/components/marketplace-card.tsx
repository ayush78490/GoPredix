"use client"

import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Loader2, ShoppingCart, XCircle } from "lucide-react"
import MarketCard from "./market-card"
import { useAccount } from "wagmi"

interface MarketplaceCardProps {
    market: any
    listing: any
    onBuy: () => void
    onCancel: () => void
    isBuying: boolean
    isCancelling: boolean
}

export default function MarketplaceCard({ market, listing, onBuy, onCancel, isBuying, isCancelling }: MarketplaceCardProps) {
    const { address } = useAccount()
    const isOwner = address && listing.seller.toLowerCase() === address.toLowerCase()
    const isInactive = !listing.isActive
    const isPendingTransfer = !listing.isTransferred

    return (
        <Card className={`overflow-hidden border-2 transition-all duration-300 ${isInactive
            ? 'border-red-900/50 bg-red-950/10'
            : isPendingTransfer
                ? 'border-yellow-500/30 bg-yellow-950/10'
                : 'border-white/10 hover:border-green-500/50 hover:shadow-lg hover:shadow-green-500/20'
            }`}>
            {/* Header with status */}
            <div className={`px-4 py-2 flex justify-between items-center ${isInactive
                ? 'bg-red-900/50'
                : isPendingTransfer
                    ? 'bg-yellow-900/30'
                    : 'bg-gradient-to-r from-green-900/30 to-transparent'
                }`}>
                <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-white/70">
                        Listed by {isOwner ? 'You' : listing.seller.slice(0, 6) + '...' + listing.seller.slice(-4)}
                    </span>
                    {listing.type && (
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${listing.type === 'BNB'
                            ? 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30'
                            : 'bg-blue-500/20 text-blue-300 border-blue-500/30'
                            }`}>
                            {listing.type}
                        </span>
                    )}
                </div>
                {isInactive && (
                    <span className="flex items-center gap-1 text-xs font-semibold text-red-400">
                        <XCircle className="w-3 h-3" />
                        Cancelled
                    </span>
                )}
                {isPendingTransfer && !isInactive && (
                    <span className="flex items-center gap-1 text-xs font-semibold text-yellow-400">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        Pending Transfer
                    </span>
                )}
            </div>

            {/* Market preview */}
            <div className={isInactive || isPendingTransfer ? 'opacity-50' : ''}>
                <MarketCard market={market} disabled={true} />
            </div>

            {/* Price and action section */}
            <div className={`p-4 border-t ${isInactive
                ? 'border-red-900/30 bg-red-950/20'
                : isPendingTransfer
                    ? 'border-yellow-500/10 bg-yellow-950/10'
                    : 'border-white/10 bg-black/40'
                }`}>
                <div className="flex justify-between items-center">
                    <div>
                        <div className="text-xs text-white/50 mb-1">Listing Price</div>
                        <div className="text-2xl font-bold text-white flex items-baseline gap-2">
                            {listing.price}
                            <span className="text-sm text-white/70 font-normal">PDX</span>
                        </div>
                    </div>

                    <div>
                        {isInactive ? (
                            <Button variant="outline" size="sm" disabled className="border-red-900/50 text-red-400">
                                <XCircle className="w-4 h-4 mr-2" />
                                Cancelled
                            </Button>
                        ) : isPendingTransfer ? (
                            <Button variant="outline" size="sm" disabled className="border-yellow-500/30 text-yellow-400">
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Waiting for Transfer
                            </Button>
                        ) : isOwner ? (
                            <Button
                                variant="destructive"
                                size="sm"
                                onClick={(e) => {
                                    e.preventDefault()
                                    e.stopPropagation()
                                    onCancel()
                                }}
                                disabled={isCancelling}
                                className="bg-red-900/50 hover:bg-red-900/80 border border-red-500/30"
                            >
                                {isCancelling ? (
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                ) : (
                                    <XCircle className="w-4 h-4 mr-2" />
                                )}
                                Cancel Listing
                            </Button>
                        ) : (
                            <Button
                                onClick={(e) => {
                                    e.preventDefault()
                                    e.stopPropagation()
                                    onBuy()
                                }}
                                disabled={isBuying}
                                className="bg-green-600 hover:bg-green-700 text-white font-semibold px-6"
                                size="lg"
                            >
                                {isBuying ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <>
                                        <ShoppingCart className="w-4 h-4 mr-2" />
                                        Buy Now
                                    </>
                                )}
                            </Button>
                        )}
                    </div>
                </div>
            </div>
        </Card>
    )
}
