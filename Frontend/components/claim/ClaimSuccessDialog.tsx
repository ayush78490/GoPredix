"use client"

import { useEffect } from "react"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { CheckCircle2, ExternalLink } from "lucide-react"
import { formatDistanceToNow } from "date-fns"

interface ClaimSuccessDialogProps {
    isOpen: boolean
    onClose: () => void
    txHash: string
    amount?: string
    timestamp?: number
    autoCloseMs?: number
}

export function ClaimSuccessDialog({
    isOpen,
    onClose,
    txHash,
    amount,
    timestamp,
    autoCloseMs = 3000
}: ClaimSuccessDialogProps) {
    useEffect(() => {
        if (isOpen) {
            const timer = setTimeout(() => {
                onClose()
            }, autoCloseMs)

            return () => clearTimeout(timer)
        }
    }, [isOpen, onClose, autoCloseMs])

    const formatAddress = (address: string) => {
        return `${address.slice(0, 10)}...${address.slice(-8)}`
    }

    const getBscScanLink = (txHash: string) => {
        return `https://testnet.bscscan.com/tx/${txHash}`
    }

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md backdrop-blur-sm bg-card/95 border-green-500/50">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-green-500">
                        <CheckCircle2 className="w-6 h-6" />
                        Claim Successful!
                    </DialogTitle>
                    <DialogDescription>
                        Your winnings have been claimed successfully
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    {amount && (
                        <div className="flex justify-between items-center p-3 bg-green-500/10 rounded-lg border border-green-500/20">
                            <span className="text-sm text-muted-foreground">Amount Claimed</span>
                            <span className="text-lg font-bold text-green-500">{amount}</span>
                        </div>
                    )}

                    <div className="space-y-2">
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">Transaction</span>
                            <a
                                href={getBscScanLink(txHash)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 text-sm text-primary hover:underline"
                            >
                                <code className="bg-muted px-2 py-1 rounded text-xs">
                                    {formatAddress(txHash)}
                                </code>
                                <ExternalLink className="w-3 h-3" />
                            </a>
                        </div>

                        {timestamp && (
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-muted-foreground">Time</span>
                                <span className="text-sm">
                                    {formatDistanceToNow(new Date(timestamp * 1000), { addSuffix: true })}
                                </span>
                            </div>
                        )}
                    </div>

                    <div className="text-center text-xs text-muted-foreground">
                        This dialog will close automatically in {autoCloseMs / 1000} seconds
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
