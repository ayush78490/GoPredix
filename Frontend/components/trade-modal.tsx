"use client"

import { useState, useEffect, useMemo } from "react"
import { X, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { useWeb3Context } from "@/lib/wallet-context"
import { usePredictionMarket } from "@/hooks/use-predection-market"
import { ethers } from "ethers"

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
  const [yesPrice, setYesPrice] = useState<number | null>(null)
  const [noPrice, setNoPrice] = useState<number | null>(null)
  const [expectedOut, setExpectedOut] = useState<string | null>(null)
  const [feeEstimated, setFeeEstimated] = useState<string | null>(null)
  const [slippage, setSlippage] = useState<number>(2) // percent

  const { account, connectWallet, isCorrectNetwork, switchNetwork, signer } = useWeb3Context()
  const { contract, getAmountOut } = usePredictionMarket()

  const numAmount = parseFloat(amount) || 0
  const hasAmount = numAmount > 0
  const outcomeLabel = outcome === "YES" ? "YES" : outcome === "NO" ? "NO" : "outcome"

  // Fetch price & estimate when market/outcome/amount changes
  useEffect(() => {
    let mounted = true
    async function update() {
      if (!contract || !market) return
      try {
        // Get on-chain price (scaled to 10000 in contract)
        const [yPriceRaw, nPriceRaw] = await (contract as any).getPrice(market.id)
        const y = Number(yPriceRaw) / 10000
        const n = Number(nPriceRaw) / 10000
        if (!mounted) return
        setYesPrice(y)
        setNoPrice(n)

        // Estimate amountOut using getAmountOut
        if (hasAmount && outcome) {
          const yesInFlag = outcome === "YES" ? false : true
          const result = await getAmountOut(market.id, amount, yesInFlag)
          if (!mounted) return
          setExpectedOut(result.amountOut)
          setFeeEstimated(result.fee)
        } else {
          setExpectedOut(null)
          setFeeEstimated(null)
        }
      } catch (err: any) {
        console.error(err)
        if (!mounted) return
        setError(err?.reason || err?.message || "Failed to fetch prices")
      }
    }
    update()
    return () => { mounted = false }
  }, [contract, market, amount, outcome, getAmountOut, hasAmount])

  const handleTrade = async () => {
    setError(null)
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
    setTxHash(null)
    try {
      const amountInWei = ethers.parseEther(amount)
      // Get estimate from getAmountOut to build minOut with slippage
      const yesInFlag = outcome === "YES" ? false : true
      const result = await getAmountOut(market.id, amount, yesInFlag)
      const minOutBn = ethers.parseEther((parseFloat(result.amountOut) * (1 - slippage / 100)).toString())

      let tx
      const contractWithSigner = contract.connect(signer)
      if (outcome === "YES") {
        tx = await (contractWithSigner as any).buyYesWithBNB(market.id, minOutBn, { value: amountInWei })
      } else {
        tx = await (contractWithSigner as any).buyNoWithBNB(market.id, minOutBn, { value: amountInWei })
      }
      setTxHash(tx.hash)
      await tx.wait()
      setAmount("")
      onClose()
    } catch (err: any) {
      console.error(err)
      setError(err?.reason || err?.message || "Transaction failed")
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 sm:p-6">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <Card className="relative w-full max-w-md sm:max-w-lg rounded-lg shadow-lg overflow-auto">
        <div className="p-4 sm:p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">{market?.question || "Trade"}</h3>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="space-y-4">
            {/* Outcome Selection */}
            <div className="flex gap-2">
              <Button 
                className="flex-1"
                variant={outcome === "YES" ? "default" : "outline"}
                onClick={() => onOutcomeChange("YES")}
              >
                YES
              </Button>
              <Button
                className="flex-1"
                variant={outcome === "NO" ? "default" : "outline"}
                onClick={() => onOutcomeChange("NO")}
              >
                NO
              </Button>
            </div>

            {/* Amount Input */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Amount (BNB)
              </label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.0"
              />
            </div>

            {/* Price Display & Trade Details */}
            {yesPrice !== null && noPrice !== null && (
              <div className="text-sm space-y-1 text-gray-700">
                <div className="flex gap-3">
                  <div className="flex-1 p-2 rounded-md bg-green-950/10 text-green-400">
                    <div className="text-xs">YES</div>
                    <div className="font-semibold">{(yesPrice * 100).toFixed(2)}%</div>
                  </div>
                  <div className="flex-1 p-2 rounded-md bg-red-950/10 text-red-400">
                    <div className="text-xs">NO</div>
                    <div className="font-semibold">{(noPrice * 100).toFixed(2)}%</div>
                  </div>
                </div>

                {expectedOut && (
                  <p className="mt-2">Estimated {outcome}: <span className="font-medium">{Number(expectedOut).toFixed(6)}</span></p>
                )}

                {feeEstimated && (
                  <p className="text-xs text-muted-foreground">Estimated protocol fee (approx): {Number(feeEstimated).toFixed(6)} BNB</p>
                )}

                {/* Slippage Tolerance */}
                <div className="flex items-center gap-2">
                  <label className="text-xs">Slippage tolerance</label>
                  <Input 
                    className="w-20" 
                    type="number" 
                    min="0" 
                    max="50" 
                    step="0.1" 
                    value={slippage} 
                    onChange={(e) => setSlippage(Number(e.target.value))} 
                  />
                </div>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <p className="text-sm text-red-500">{error}</p>
            )}

            {/* Transaction Hash */}
            {txHash && (
              <p className="text-sm text-green-500">
                Transaction submitted! Hash: {txHash.slice(0, 10)}...
              </p>
            )}

            {/* Action Button */}
            <Button
              className="w-full"
              onClick={handleTrade}
              disabled={isProcessing || !hasAmount}
            >
              {isProcessing ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              {!account ? "Connect Wallet" :
               !isCorrectNetwork ? "Switch Network" :
               !outcome ? "Select Outcome" :
               `Buy ${outcomeLabel} Tokens`}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}