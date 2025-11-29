"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useState, useMemo, useEffect } from "react"
import { useAccount } from "wagmi"
import { useAllMarkets } from "@/hooks/getAllMarkets"
import { useMarketMarketplace } from "@/hooks/use-market-marketplace"
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
    const { markets } = useAllMarkets()
    const { listMarket, transferOwnership, confirmTransfer, isMarketListed } = useMarketMarketplace()
    const bnbHook = usePredictionMarketBNB()

    const [selectedMarketId, setSelectedMarketId] = useState<number | null>(null)
    const [price, setPrice] = useState("")
    const [isProcessing, setIsProcessing] = useState(false)
    const [step, setStep] = useState<1 | 2 | 3>(1) // 1: List, 2: Transfer, 3: Confirm

    const userMarkets = useMemo(() => {
        console.log('🔍 Sell Modal - Total markets:', markets.length)
        console.log('🔍 Sell Modal - User address:', address)

        if (!address) return []

        // Filter for BNB markets only - the marketplace contract only supports BNB prediction markets
        const filtered = markets.filter(m => {
            const isCreator = m.creator.toLowerCase() === address.toLowerCase()
            const isBNB = m.paymentToken === "BNB"

            console.log(`Market ${m.id}:`, {
                creator: m.creator,
                paymentToken: m.paymentToken,
                isCreator,
                isBNB,
                passes: isCreator && isBNB
            })

            return isCreator && isBNB
        })

        console.log('🔍 Sell Modal - Filtered markets:', filtered.length)
        return filtered
    }, [markets, address])

    useEffect(() => {
        console.log('🔍 selectedMarketId changed to:', selectedMarketId, 'step:', step)
    }, [selectedMarketId, step])

    const handleAction = async () => {
        if (selectedMarketId === null || !price) return

        setIsProcessing(true)

        try {
            if (step === 1) {
                console.log(`📡 Step 1: Initializing listing...`)
                console.log(`📊 Selected Market ID: ${selectedMarketId} (type: ${typeof selectedMarketId})`)

                // Find the selected market in the list
                const selectedMarket = userMarkets.find(m => m.numericId === selectedMarketId)
                if (!selectedMarket) {
                    throw new Error(`Market ID ${selectedMarketId} not found in your markets list. Please refresh the page.`)
                }

                console.log(`📋 Market details:`, {
                    id: selectedMarket.id,
                    numericId: selectedMarket.numericId,
                    question: selectedMarket.question,
                    creator: selectedMarket.creator
                })

                // Pre-flight checks
                const isListed = await isMarketListed(selectedMarketId)
                if (isListed) throw new Error('This market is already listed')

                await listMarket(selectedMarketId, price)

                toast({
                    title: "Step 1 Complete",
                    description: "Listing initialized. Now please transfer ownership.",
                })
                setStep(2)
            }
            else if (step === 2) {
                console.log(`📡 Step 2: Transferring ownership...`)
                await transferOwnership(selectedMarketId)

                toast({
                    title: "Step 2 Complete",
                    description: "Ownership transferred. Now please confirm to activate.",
                })
                setStep(3)
            }
            else if (step === 3) {
                console.log(`📡 Step 3: Confirming transfer...`)
                await confirmTransfer(selectedMarketId)

                toast({
                    title: "Market Listed Successfully! 🎉",
                    description: `Your market is now listed for ${price} PDX`,
                })
                onSuccess()
                onClose()

                // Reset
                setSelectedMarketId(null)
                setPrice("")
                setStep(1)
            }

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
        if (isProcessing) return <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processing...</>
        if (step === 1) return "Initialize Listing"
        if (step === 2) return "Transfer Ownership"
        if (step === 3) return "Confirm & Activate"
        return "List Market"
    }

    const getStepDescription = () => {
        if (step === 1) return "Step 1/3: Create the listing record on the marketplace."
        if (step === 2) return "Step 2/3: Transfer market ownership to the marketplace contract."
        if (step === 3) return "Step 3/3: Confirm the transfer to activate your listing."
        return ""
    }

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[600px] bg-black/90 border-white/10 text-white">
                <DialogHeader>
                    <DialogTitle className="text-xl font-bold">Sell Your Market</DialogTitle>
                    <DialogDescription asChild>
                        <div className="text-muted-foreground pt-2 space-y-2">
                            <p>List your <span className="text-yellow-400 font-semibold">🔶 BNB market</span> for sale.</p>
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
                            <label className="text-sm font-medium">Select Your BNB Market</label>
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
                                                console.log('🔍 Market clicked:', market.id, 'numericId:', market.numericId)
                                                setSelectedMarketId(market.numericId)
                                                console.log('🔍 Selected market ID set to:', market.numericId)
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
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Asking Price (PDX)</label>
                            <div className="relative">
                                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <Input
                                    type="number"
                                    placeholder="Price in PDX"
                                    value={price}
                                    onChange={(e) => setPrice(e.target.value)}
                                    className="pl-9 bg-white/5 border-white/10"
                                />
                            </div>
                        </div>
                    )}

                    {step > 1 && (
                        <div className="p-4 bg-green-900/20 border border-green-500/30 rounded-lg text-center">
                            <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-2" />
                            <h3 className="text-lg font-bold text-green-400">Listing in Progress</h3>
                            <p className="text-sm text-muted-foreground">
                                Market ID: {selectedMarketId} <br />
                                Price: {price} PDX
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
