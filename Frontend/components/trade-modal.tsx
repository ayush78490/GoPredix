"use client"

import { useState } from "react"
import { X, ArrowRight, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { useWeb3Context } from "@/lib/wallet-context"

// YOU SHOULD use the correct path for your actual hook
import { usePredictionMarket } from "@/hooks/use-predection-market"

interface TradeModalProps {
  market: any
  outcome: "YES" | "NO" | null
  onOutcomeChange: (outcome: "YES" | "NO") => void
  onClose: () => void
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
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-md p-6 relative">
        <button 
          onClick={onClose} 
          className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"
          disabled={isProcessing}
        >
          <X className="w-5 h-5" />
        </button>
        <h2 className="text-2xl font-bold mb-6">Trade on Market</h2>
        {/* Outcome Selector */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <button
            onClick={() => onOutcomeChange("YES")}
            className={`p-4 rounded-lg border-2 transition-all ${
              outcome === "YES"
                ? "border-green-500 bg-green-950/30"
                : "border-border bg-muted hover:bg-muted/80"
            }`}
            disabled={isProcessing}
          >
            <div className="text-sm text-muted-foreground mb-1">YES</div>
            <div className={`text-2xl font-bold ${outcome === "YES" ? "text-green-500" : ""}`}>
              {market.yesOdds?.toFixed(1) || "0"}%
            </div>
          </button>
          <button
            onClick={() => onOutcomeChange("NO")}
            className={`p-4 rounded-lg border-2 transition-all ${
              outcome === "NO" 
                ? "border-red-500 bg-red-950/30" 
                : "border-border bg-muted hover:bg-muted/80"
            }`}
            disabled={isProcessing}
          >
            <div className="text-sm text-muted-foreground mb-1">NO</div>
            <div className={`text-2xl font-bold ${outcome === "NO" ? "text-red-500" : ""}`}>
              {market.noOdds?.toFixed(1) || "0"}%
            </div>
          </button>
        </div>
        {/* Amount Input */}
        <div className="mb-6">
          <label className="text-sm text-muted-foreground mb-2 block">
            Amount to spend (BNB)
          </label>
          <Input
            type="number"
            placeholder="0.00"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            className="text-lg"
            step="0.001"
            min="0"
            disabled={isProcessing}
          />
          <p className="text-xs text-muted-foreground mt-1">Min: 0.001 BNB</p>
        </div>
        {/* Transaction Summary */}
        {hasAmount && (
          <div className="space-y-3 mb-6 p-4 bg-muted rounded-lg">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">You spend:</span>
              <span className="font-semibold">{numAmount.toFixed(4)} BNB</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Outcome:</span>
              <span className={`font-semibold ${outcome === "YES" ? "text-green-500" : "text-red-500"}`}>{outcomeLabel}</span>
            </div>
          </div>
        )}
        {/* Error Display */}
        {error && (
          <div className="mb-4 p-3 bg-red-950/20 border border-red-500 rounded-lg text-red-400 text-sm">
            ❌ {error}
          </div>
        )}
        {/* Success Display */}
        {txHash && (
          <div className="mb-4 p-3 bg-green-950/20 border border-green-500 rounded-lg text-green-400 text-sm">
            ✅ Transaction successful! Closing...
          </div>
        )}
        {/* Wallet Buttons*/}
        {!account ? (
          <Button onClick={connectWallet} className="w-full" size="lg" disabled={isConnecting}>
            {isConnecting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Connecting...
              </>
            ) : (
              "Connect Wallet"
            )}
          </Button>
        ) : !isCorrectNetwork ? (
          <Button onClick={switchNetwork} className="w-full" size="lg" variant="destructive">
            Switch to BSC Testnet
          </Button>
        ) : (
          <Button
            onClick={handleTrade}
            className="w-full"
            size="lg"
            disabled={!amount || numAmount <= 0 || isProcessing || !outcome}
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                Buy {outcomeLabel} with BNB
                <ArrowRight className="w-4 h-4 ml-2" />
              </>
            )}
          </Button>
        )}
        {/* Wallet Info */}
        {account && (
          <div className="mt-4 text-center text-xs text-muted-foreground">
            Connected: {account.slice(0, 6)}...{account.slice(-4)}
          </div>
        )}
      </Card>
    </div>
  )
}
