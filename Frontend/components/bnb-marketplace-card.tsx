'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useBNBNativeMarketplace, MarketListing } from '@/hooks/use-bnb-native-marketplace'
import { BNBMarket } from '@/hooks/use-predection-market'
import { toast } from 'sonner'
import { Loader2, ShoppingCart, Tag, TrendingUp, Clock, User } from 'lucide-react'

interface BNBMarketplaceCardProps {
    market: BNBMarket
    listing?: MarketListing | null
    userAddress?: string
    onSuccess?: () => void
}

export function BNBMarketplaceCard({ market, listing, userAddress, onSuccess }: BNBMarketplaceCardProps) {
    const {
        isLoading,
        buyMarket,
        makeOffer,
        cancelOffer,
        listMarket,
        cancelListing,
        updatePrice,
        acceptOffer,
        getOffer
    } = useBNBNativeMarketplace()

    const [buyAmount, setBuyAmount] = useState('')
    const [offerAmount, setOfferAmount] = useState('')
    const [listPrice, setListPrice] = useState('')
    const [showListForm, setShowListForm] = useState(false)
    const [showOfferForm, setShowOfferForm] = useState(false)
    const [userOffer, setUserOffer] = useState<any>(null)

    const isOwner = userAddress?.toLowerCase() === market.creator.toLowerCase()
    const isSeller = listing && userAddress?.toLowerCase() === listing.seller.toLowerCase()

    // Load user's offer
    useEffect(() => {
        async function loadUserOffer() {
            if (userAddress && listing) {
                const offer = await getOffer(market.id, userAddress)
                setUserOffer(offer)
            }
        }
        loadUserOffer()
    }, [userAddress, listing, market.id, getOffer])

    const handleBuyMarket = async () => {
        if (!listing) return

        try {
            await buyMarket(market.id, listing.price)
            toast.success('Market purchased successfully!')
            onSuccess?.()
        } catch (error: any) {
            toast.error(error.message || 'Failed to buy market')
        }
    }

    const handleMakeOffer = async () => {
        if (!offerAmount || parseFloat(offerAmount) <= 0) {
            toast.error('Please enter a valid offer amount')
            return
        }

        try {
            await makeOffer(market.id, offerAmount)
            toast.success('Offer placed successfully! BNB locked as escrow')
            setOfferAmount('')
            setShowOfferForm(false)
            onSuccess?.()
        } catch (error: any) {
            toast.error(error.message || 'Failed to make offer')
        }
    }

    const handleCancelOffer = async () => {
        try {
            await cancelOffer(market.id)
            toast.success('Offer cancelled! BNB refunded')
            setUserOffer(null)
            onSuccess?.()
        } catch (error: any) {
            toast.error(error.message || 'Failed to cancel offer')
        }
    }

    const handleListMarket = async () => {
        if (!listPrice || parseFloat(listPrice) <= 0) {
            toast.error('Please enter a valid price')
            return
        }

        try {
            await listMarket(market.id, listPrice)
            toast.success('Market listed for sale!')
            setListPrice('')
            setShowListForm(false)
            onSuccess?.()
        } catch (error: any) {
            toast.error(error.message || 'Failed to list market')
        }
    }

    const handleCancelListing = async () => {
        try {
            await cancelListing(market.id)
            toast.success('Listing cancelled')
            onSuccess?.()
        } catch (error: any) {
            toast.error(error.message || 'Failed to cancel listing')
        }
    }

    const handleUpdatePrice = async () => {
        if (!listPrice || parseFloat(listPrice) <= 0) {
            toast.error('Please enter a valid price')
            return
        }

        try {
            await updatePrice(market.id, listPrice)
            toast.success('Price updated!')
            setListPrice('')
            onSuccess?.()
        } catch (error: any) {
            toast.error(error.message || 'Failed to update price')
        }
    }

    return (
        <Card className="p-6 space-y-4 bg-gradient-to-br from-slate-900 to-slate-800 border-yellow-500/20">
            {/* Market Info */}
            <div className="space-y-2">
                <h3 className="text-lg font-bold text-white line-clamp-2">{market.question}</h3>
                <div className="flex items-center gap-4 text-sm text-gray-400">
                    <span className="flex items-center gap-1">
                        <User className="w-4 h-4" />
                        Owner: {market.creator.slice(0, 6)}...{market.creator.slice(-4)}
                    </span>
                    <span className="flex items-center gap-1">
                        <TrendingUp className="w-4 h-4" />
                        {(parseFloat(market.yesPool) + parseFloat(market.noPool)).toFixed(4)} BNB
                    </span>
                </div>
            </div>

            {/* Listing Status */}
            {listing && listing.isActive && (
                <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg space-y-2">
                    <div className="flex items-center justify-between">
                        <span className="flex items-center gap-2 text-yellow-500 font-semibold">
                            <Tag className="w-5 h-5" />
                            Listed for Sale
                        </span>
                        <span className="text-2xl font-bold text-white">
                            {listing.price} BNB
                        </span>
                    </div>
                    <div className="text-sm text-gray-400">
                        Seller: {listing.seller.slice(0, 6)}...{listing.seller.slice(-4)}
                    </div>
                </div>
            )}

            {/* Actions */}
            <div className="space-y-3">
                {/* If user owns the market and it's not listed */}
                {isOwner && !listing?.isActive && (
                    <>
                        {!showListForm ? (
                            <Button
                                onClick={() => setShowListForm(true)}
                                className="w-full bg-yellow-500 hover:bg-yellow-600 text-black font-semibold"
                            >
                                <Tag className="w-4 h-4 mr-2" />
                                List Market for Sale
                            </Button>
                        ) : (
                            <div className="space-y-2">
                                <Input
                                    type="number"
                                    step="0.001"
                                    placeholder="Price in BNB"
                                    value={listPrice}
                                    onChange={(e) => setListPrice(e.target.value)}
                                    className="bg-slate-800 border-gray-600"
                                />
                                <div className="flex gap-2">
                                    <Button
                                        onClick={handleListMarket}
                                        disabled={isLoading}
                                        className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-black"
                                    >
                                        {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirm Listing'}
                                    </Button>
                                    <Button
                                        onClick={() => setShowListForm(false)}
                                        variant="outline"
                                        className="flex-1"
                                    >
                                        Cancel
                                    </Button>
                                </div>
                            </div>
                        )}
                    </>
                )}

                {/* If user is the seller */}
                {isSeller && listing?.isActive && (
                    <div className="space-y-2">
                        <div className="flex gap-2">
                            <Input
                                type="number"
                                step="0.001"
                                placeholder="New price in BNB"
                                value={listPrice}
                                onChange={(e) => setListPrice(e.target.value)}
                                className="bg-slate-800 border-gray-600"
                            />
                            <Button
                                onClick={handleUpdatePrice}
                                disabled={isLoading}
                                className="bg-blue-500 hover:bg-blue-600"
                            >
                                Update
                            </Button>
                        </div>
                        <Button
                            onClick={handleCancelListing}
                            disabled={isLoading}
                            variant="outline"
                            className="w-full border-red-500 text-red-500 hover:bg-red-500/10"
                        >
                            Cancel Listing
                        </Button>
                    </div>
                )}

                {/* If market is listed and user is not the seller */}
                {listing?.isActive && !isSeller && (
                    <>
                        {/* Buy Now */}
                        <Button
                            onClick={handleBuyMarket}
                            disabled={isLoading}
                            className="w-full bg-green-500 hover:bg-green-600 text-white font-semibold text-lg py-6"
                        >
                            {isLoading ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <>
                                    <ShoppingCart className="w-5 h-5 mr-2" />
                                    Buy Now for {listing.price} BNB
                                </>
                            )}
                        </Button>

                        {/* Make Offer */}
                        {userOffer?.isActive ? (
                            <div className="space-y-2 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                                <p className="text-sm text-gray-300">
                                    Your offer: <span className="text-white font-bold">{userOffer.offerPrice} BNB</span>
                                </p>
                                <Button
                                    onClick={handleCancelOffer}
                                    disabled={isLoading}
                                    variant="outline"
                                    className="w-full border-red-500 text-red-500 hover:bg-red-500/10"
                                    size="sm"
                                >
                                    Cancel Offer (Get Refund)
                                </Button>
                            </div>
                        ) : (
                            <>
                                {!showOfferForm ? (
                                    <Button
                                        onClick={() => setShowOfferForm(true)}
                                        variant="outline"
                                        className="w-full border-yellow-500 text-yellow-500 hover:bg-yellow-500/10"
                                    >
                                        Make an Offer
                                    </Button>
                                ) : (
                                    <div className="space-y-2">
                                        <Input
                                            type="number"
                                            step="0.001"
                                            placeholder="Offer amount in BNB"
                                            value={offerAmount}
                                            onChange={(e) => setOfferAmount(e.target.value)}
                                            className="bg-slate-800 border-gray-600"
                                        />
                                        <p className="text-xs text-gray-400">
                                            BNB will be locked as escrow until offer is accepted or cancelled
                                        </p>
                                        <div className="flex gap-2">
                                            <Button
                                                onClick={handleMakeOffer}
                                                disabled={isLoading}
                                                className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-black"
                                            >
                                                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Place Offer'}
                                            </Button>
                                            <Button
                                                onClick={() => setShowOfferForm(false)}
                                                variant="outline"
                                                className="flex-1"
                                            >
                                                Cancel
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </>
                )}
            </div>

            {/* Marketplace Fee Info */}
            <div className="text-xs text-gray-500 text-center pt-2 border-t border-gray-700">
                2% marketplace fee on all sales · Payments in BNB
            </div>
        </Card>
    )
}
