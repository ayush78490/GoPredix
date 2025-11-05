"use client"

import { useState } from "react"
import { X, ArrowRight, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { useWeb3Context } from "@/lib/wallet-context"

// YOU SHOULD use the correct path for your actual hook
import { usePredictionMarket } from "@/hooks/use-predection-market"
import React from "react";

interface TradeModalProps {
  market: any;
  outcome: "YES" | "NO" | null;
  onOutcomeChange: (o: "YES" | "NO") => void;
  onClose: () => void;
}

export default function TradeModal({ 
  market, 
  outcome, 
  onOutcomeChange, 
  onClose 
}: TradeModalProps) {
  const [amount, setAmount] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [txHash, setTxHash] = useState<string | null>(null)

  const { account, connectWallet, isConnecting, isCorrectNetwork, switchNetwork, signer } = useWeb3Context()
  const { contract } = usePredictionMarket() // Instead of getAmountOut, just get contract with ABI/address

  const numAmount = parseFloat(amount) || 0
  const hasAmount = numAmount > 0
  const outcomeLabel = outcome === "YES" ? "YES" : outcome === "NO" ? "NO" : "outcome"

  const handleTrade = async () => {
    if (!account) {
      await connectWallet()
      return
    }
    if (!isCorrectNetwork) {
      await switchNetwork()
      return
    }
    if (!amount || numAmount <= 0) {
      setError("Please enter a valid BNB amount")
      return
    }
    if (!outcome) {
      setError("Please select YES or NO")
      return
    }
    if (!signer || !contract) {
      setError("Wallet provider/contract not ready")
      return
    }
    setIsProcessing(true)
    setError(null)
    setTxHash(null)
    try {
      const { ethers } = await import("ethers")
      const amountInWei = ethers.parseEther(amount)
      const minTokensOut = 0 // For slippage tolerance, use output from `getAmountOut` if desired

      let tx
      if (outcome === "YES") {
        tx = await contract.buyYesWithBNB(market.id, minTokensOut, { value: amountInWei })
      } else {
        tx = await contract.buyNoWithBNB(market.id, minTokensOut, { value: amountInWei })
      }
      setTxHash(tx.hash)
      await tx.wait()
      setAmount("")
      setTimeout(onClose, 2000)
    } catch (err: any) {
      setError(err.reason || err.message || "Transaction failed")
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 sm:p-6">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-md sm:max-w-lg rounded-lg bg-card text-card-foreground shadow-lg overflow-auto">
        <div className="p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">{market?.question || "Trade"}</h3>
            <button onClick={onClose} className="text-muted-foreground">Close</button>
          </div>

          <div className="mt-4 space-y-4">
            <div className="flex gap-2">
              <button className={`flex-1 py-2 rounded-md ${outcome === "YES" ? "bg-green-600 text-white" : "bg-input text-foreground"}`} onClick={() => onOutcomeChange("YES")}>YES</button>
              <button className={`flex-1 py-2 rounded-md ${outcome === "NO" ? "bg-red-600 text-white" : "bg-input text-foreground"}`} onClick={() => onOutcomeChange("NO")}>NO</button>
            </div>

            <div>
              <label className="block text-sm mb-1">Amount (BNB)</label>
              <input className="w-full rounded-md p-2 bg-input text-foreground border border-border" />
            </div>

            <div className="flex justify-end">
              <button className="bg-black text-white px-4 py-2 rounded-md">Confirm</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
