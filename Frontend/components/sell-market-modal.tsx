"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useState, useMemo, useEffect } from "react"
import { useAccount } from "wagmi"
import { useAllMarkets } from "@/hooks/getAllMarkets"
import { useMarketMarketplace } from "@/hooks/use-market-marketplace"
import { useBNBCustodialMarketplace } from "@/hooks/use-bnb-custodial-marketplace"
import { usePredictionMarketBNB } from "@/hooks/use-predection-market"
import { Loader2, DollarSign, CheckCircle2, ArrowRight } from "lucide-react"
import { toast } from "@/hooks/use-toast"

interface SellMarketModalProps {
    isOpen: boolean
    onClose: () => void
    onSuccess: () => void
}

export default function SellMarketModal({ isOpen, onClose, onSuccess }: SellMarketModalProps) {
    const { address } = useAccount()
    const { markets, refreshMarkets } = useAllMarkets()

    // PDX Custodial Marketplace (3-step process)
    const {
        listMarket: listMarketPDX,
        transferOwnership: transferOwnershipPDX,
        confirmTransfer: confirmTransferPDX,
        isMarketListed: isMarketListedPDX,
        isOwnershipTransferred: isOwnershipTransferredPDX
    } = useMarketMarketplace()

    // BNB Custodial Marketplace (3-step process)
    const {
        listMarket: listMarketBNB,
        confirmTransfer: confirmTransferBNB,
        isMarketListed: isMarketListedBNB,
        isOwnershipTransferred: isOwnershipTransferredBNB,
        isContractReady: isBNBMarketplaceReady,
        marketplaceAddress: bnbMarketplaceAddress
    } = useBNBCustodialMarketplace()

    const bnbHook = usePredictionMarketBNB()

    const [selectedMarketId, setSelectedMarketId] = useState<number | null>(null)
    const [price, setPrice] = useState("")
    const [isProcessing, setIsProcessing] = useState(false)
    const [step, setStep] = useState<1 | 2 | 3>(1) // 1: List, 2: Transfer (PDX only), 3: Confirm
    const [selectedMarketplaceType, setSelectedMarketplaceType] = useState<'PDX' | 'BNB'>('PDX') // User's choice of marketplace

    const userMarkets = useMemo(() => {

        if (!address) return []

        // Filter for markets created by user that are Open
        const filtered = markets.filter(m => {
            const isCreator = m.creator.toLowerCase() === address.toLowerCase()
            const isOpen = Number(m.status) === 0 // Ensure market is Open


            return isCreator && isOpen
        })

        return filtered
    }, [markets, address])

    const selectedMarket = useMemo(() =>
        markets.find(m => m.numericId === selectedMarketId),
        [markets, selectedMarketId])

    const marketPaymentToken = selectedMarket?.paymentToken === 'PDX' ? 'PDX' : 'BNB'

    // Determine currency symbol for pricing
    const currencySymbol = selectedMarketplaceType === 'BNB' ? 'BNB' : 'PDX'
    const maxSteps = 3 // Both marketplaces now use 3-step process

    useEffect(() => {
        console.log('📊 [Sell Modal] Market:', selectedMarketId, 'Step:', step, 'Marketplace:', selectedMarketplaceType)
    }, [selectedMarketId, step, selectedMarketplaceType])

    // Refresh markets when modal opens - REMOVED as per user request to avoid cache filling
    // useEffect(() => {
    //     if (isOpen) {
    //         console.log('🔄 Refreshing markets for Sell Modal...')
    //         refreshMarkets()
    //     }
    // }, [isOpen, refreshMarkets])

    const handleAction = async () => {
        if (selectedMarketId === null || !price) return

        setIsProcessing(true)

        try {
            // Select the correct marketplace functions based on type
            const listMarket = selectedMarketplaceType === 'BNB' ? listMarketBNB : listMarketPDX
            const transferOwnership = selectedMarketplaceType === 'PDX' ? transferOwnershipPDX : null
            const confirmTransfer = selectedMarketplaceType === 'BNB' ? confirmTransferBNB : confirmTransferPDX
            const isMarketListed = selectedMarketplaceType === 'BNB' ? isMarketListedBNB : isMarketListedPDX
            const isOwnershipTransferred = selectedMarketplaceType === 'BNB' ? isOwnershipTransferredBNB : isOwnershipTransferredPDX

            // ✅ NEW: Execute all 3 steps automatically in sequence

            // STEP 1: List the market (if not already listed)
            const isListed = await isMarketListed(selectedMarketId)
            if (!isListed) {
                toast({
                    title: "Step 1/3: Listing Market",
                    description: `Creating listing on ${selectedMarketplaceType} marketplace...`,
                })
                await listMarket(selectedMarketId, price)
            }

            // STEP 2: Transfer ownership (if not already transferred)
            const isTransferred = await isOwnershipTransferred(selectedMarketId)
            if (!isTransferred) {
                toast({
                    title: "Step 2/3: Transferring Ownership",
                    description: "Transferring market ownership to marketplace...",
                })

                if (selectedMarketplaceType === 'PDX') {
                    if (transferOwnership) {
                        await transferOwnership(selectedMarketId, 'PDX')
                    }
                } else {
                    // BNB: Use BNB prediction market hook to transfer to BNB marketplace
                    if (bnbHook.transferMarketOwnership && bnbMarketplaceAddress) {
                        await bnbHook.transferMarketOwnership(selectedMarketId, bnbMarketplaceAddress)
                    } else {
                        throw new Error('BNB market transfer not available')
                    }
                }
            }

            // STEP 3: Confirm transfer to activate the listing
            toast({
                title: "Step 3/3: Activating Listing",
                description: "Confirming transfer and activating marketplace listing...",
            })
            await confirmTransfer(selectedMarketId)

            // ✅ All done!
            toast({
                title: "Market Listed Successfully! 🎉",
                description: `Your market is now live on the ${selectedMarketplaceType} marketplace.`,
            })
            onSuccess()
            onClose()

            // Reset
            setSelectedMarketId(null)
            setPrice("")
            setStep(1)

        } catch (error: any) {
            console.error('❌ Error:', error)
            toast({
                title: "Action Failed",
                description: error.message || "Something went wrong",
                variant: "destructive"
            })
        } finally {
            setIsProcessing(false)
        }
    }

    const getButtonText = () => {
        if (isProcessing) return <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Listing Market...</>
        return "List Market for Sale"
    }

    const getStepDescription = () => {
        return "List your market on the marketplace. All steps will be executed automatically."
    }

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[600px] bg-black/90 border-white/10 text-white">
                <DialogHeader>
                    <DialogTitle className="text-xl font-bold">Sell Your Market</DialogTitle>
                    <DialogDescription asChild>
                        <div className="text-muted-foreground pt-2 space-y-2">
                            <p>List your <span className="text-yellow-400 font-semibold">prediction market</span> for sale.</p>
                            <div className="flex items-center gap-2 text-sm bg-blue-950/30 p-2 rounded border border-blue-500/20">
                                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${step >= 1 ? 'bg-blue-500 text-white' : 'bg-gray-700'}`}>1</div>
                                <ArrowRight className="w-4 h-4 text-muted-foreground" />
                                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${step >= 2 ? 'bg-blue-500 text-white' : 'bg-gray-700'}`}>2</div>
                                <ArrowRight className="w-4 h-4 text-muted-foreground" />
                                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${step >= 3 ? 'bg-blue-500 text-white' : 'bg-gray-700'}`}>3</div>
                                <span className="ml-2 text-blue-200">{getStepDescription()}</span>
                            </div>
                        </div>
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    {step === 1 && (
                        <div className="space-y-2">
                            <div className="flex justify-between items-center">
                                <label className="text-sm font-medium">Select Your Market</label>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => refreshMarkets()}
                                    className="h-6 text-xs text-blue-400 hover:text-blue-300"
                                >
                                    Refresh List
                                </Button>
                            </div>
                            <div className="grid grid-cols-1 gap-2 max-h-[200px] overflow-y-auto pr-2">
                                {userMarkets.length === 0 ? (
                                    <div className="text-center py-8 px-4 bg-white/5 rounded-lg">
                                        <p className="text-muted-foreground mb-2">No markets found.</p>
                                        <p className="text-xs text-yellow-500">
                                            If you just deployed new contracts, your old markets are gone.
                                            Please create a new market to test listing.
                                        </p>
                                    </div>
                                ) : (
                                    userMarkets.map((market) => (
                                        <div
                                            key={market.id}
                                            onClick={() => {
                                                setSelectedMarketId(market.numericId)
                                            }}
                                            className={`p-3 rounded-lg border cursor-pointer transition-all ${selectedMarketId === market.numericId
                                                ? "bg-primary/20 border-primary"
                                                : "bg-white/5 border-white/10 hover:bg-white/10"
                                                }`}
                                        >
                                            <div className="font-medium truncate">{market.question}</div>
                                            <div className="text-xs text-muted-foreground mt-1">ID: {market.id} • Vol: {parseFloat(market.totalBacking || "0").toFixed(2)}</div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    )}

                    {selectedMarketId !== null && step === 1 && (
                        <>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Select Marketplace</label>
                                <div className="flex gap-2">
                                    <Button
                                        type="button"
                                        variant={selectedMarketplaceType === 'PDX' ? 'default' : 'outline'}
                                        onClick={() => setSelectedMarketplaceType('PDX')}
                                        className="flex-1"
                                    >
                                        PDX Marketplace
                                    </Button>
                                    <Button
                                        type="button"
                                        variant={selectedMarketplaceType === 'BNB' ? 'default' : 'outline'}
                                        onClick={() => setSelectedMarketplaceType('BNB')}
                                        className="flex-1"
                                        disabled={!isBNBMarketplaceReady}
                                    >
                                        BNB Marketplace {!isBNBMarketplaceReady && '(Not Ready)'}
                                    </Button>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Asking Price ({currencySymbol})</label>
                                <div className="relative">
                                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                    <Input
                                        type="number"
                                        placeholder={`Price in ${currencySymbol}`}
                                        value={price}
                                        onChange={(e) => setPrice(e.target.value)}
                                        className="pl-9 bg-white/5 border-white/10"
                                    />
                                </div>
                            </div>
                        </>
                    )}

                    {step > 1 && (
                        <div className="p-4 bg-green-900/20 border border-green-500/30 rounded-lg text-center">
                            <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-2" />
                            <h3 className="text-lg font-bold text-green-400">Listing in Progress</h3>
                            <p className="text-sm text-muted-foreground">
                                Market ID: {selectedMarketId} <br />
                                Price: {price} {currencySymbol}
                            </p>
                        </div>
                    )}
                </div>

                <div className="flex justify-end gap-3">
                    <Button variant="outline" onClick={onClose} disabled={isProcessing} className="border-white/10 hover:bg-white/10">
                        Cancel
                    </Button>
                    <Button
                        onClick={handleAction}
                        disabled={selectedMarketId === null || !price || isProcessing}
                        className="bg-primary text-primary-foreground hover:bg-primary/90 min-w-[150px]"
                    >
                        {getButtonText()}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    )
}
