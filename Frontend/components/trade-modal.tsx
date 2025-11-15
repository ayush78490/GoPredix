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
  // states as before...
  const [amount, setAmount] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [txHash, setTxHash] = useState<string | null>(null)
  const [yesPrice, setYesPrice] = useState<number | null>(null)
  const [noPrice, setNoPrice] = useState<number | null>(null)
  const [expectedOut, setExpectedOut] = useState<string | null>(null)
  const [feeEstimated, setFeeEstimated] = useState<string | null>(null)
  const [slippage, setSlippage] = useState<number>(5)
  const [isEstimating, setIsEstimating] = useState(false)

  // wallet and contract hooks
  const { 
    account, 
    connectWallet, 
    isCorrectNetwork, 
    switchNetwork, 
    signer 
  } = useWeb3Context()
  
  const { contract, getCurrentMultipliers } = usePredictionMarket()

  const numAmount = parseFloat(amount) || 0
  const hasAmount = numAmount >= 0.001

  // Price normalization
  const normalizedYes = useMemo(() => yesPrice !== null ? yesPrice / 100 : null, [yesPrice])
  const normalizedNo = useMemo(() => noPrice !== null ? noPrice / 100 : null, [noPrice])

  // Odds calculations
  const yesOdds = useMemo(() => (normalizedYes && normalizedYes > 0) ? 1 / normalizedYes : null, [normalizedYes])
  const noOdds = useMemo(() => (normalizedNo && normalizedNo > 0) ? 1 / normalizedNo : null, [normalizedNo])

  // Expected payout
  const expectedPayout = useMemo(() => {
    if (!numAmount || !expectedOut || numAmount <= 0) return null
    return parseFloat(expectedOut)
  }, [numAmount, expectedOut])

  // Payout multiplier
  const payoutMultiplier = useMemo(() => {
    if (!numAmount || !expectedPayout || numAmount <= 0) return null
    return expectedPayout / numAmount
  }, [numAmount, expectedPayout])

  useEffect(() => {
    let mounted = true
    let timeoutId: NodeJS.Timeout

    async function update() {
      if (!contract || !market) return

      try {
        // Fetch market prices
        const multipliers = await getCurrentMultipliers(market.id)

        if (!mounted) return
        setYesPrice(multipliers.yesPrice)
        setNoPrice(multipliers.noPrice)

        // Estimate trade output
        if (hasAmount && outcome && numAmount >= 0.001) {
          setIsEstimating(true)
          try {
            const amountInWei = ethers.parseEther(amount)
            let result

            if (outcome === "YES") {
              result = await (contract as any).getBuyYesOutput(BigInt(market.id), amountInWei)
            } else {
              result = await (contract as any).getBuyNoOutput(BigInt(market.id), amountInWei)
            }

            if (!mounted) return

            const totalOut = ethers.formatEther(result[0])
            const totalFee = ethers.formatEther(result[1])

            setExpectedOut(totalOut)
            setFeeEstimated(totalFee)
          } catch (error: any) {
            console.error("Error estimating trade:", error)
            if (!mounted) return
            setExpectedOut(null)
            setFeeEstimated(null)
          } finally {
            if (mounted) setIsEstimating(false)
          }
        } else {
          if (!mounted) return
          setExpectedOut(null)
          setFeeEstimated(null)
          setIsEstimating(false)
        }
      } catch (err: any) {
        console.error("Price fetch error:", err)
        if (mounted) setIsEstimating(false)
      }
    }

    timeoutId = setTimeout(update, 400)

    return () => {
      mounted = false
      clearTimeout(timeoutId)
    }
  }, [contract, market, amount, outcome, hasAmount, numAmount, getCurrentMultipliers])

  const handleTrade = async () => {
    setError(null)

    if (!account) {
      connectWallet()
      return
    }
    if (!isCorrectNetwork) {
      switchNetwork()
      return
    }
    if (!amount || numAmount <= 0) {
      setError("Please enter a valid BNB amount")
      return
    }
    if (numAmount < 0.001) {
      setError("Minimum trade amount is 0.001 BNB")
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

      // Get fresh estimate
      let freshEstimate
      try {
        if (outcome === "YES") {
          freshEstimate = await (contract as any).getBuyYesOutput(BigInt(market.id), amountInWei)
        } else {
          freshEstimate = await (contract as any).getBuyNoOutput(BigInt(market.id), amountInWei)
        }
      } catch (estimateError: any) {
        console.error("Failed to get fresh estimate:", estimateError)
        if (estimateError?.message?.includes("market not open")) {
          throw new Error("Market is not open for trading")
        } else if (estimateError?.message?.includes("market ended")) {
          throw new Error("Market has ended")
        } else {
          throw new Error("Unable to estimate trade output. Market may have insufficient liquidity.")
        }
      }

      const estimatedOutWei = freshEstimate[0]

      if (estimatedOutWei <= BigInt(0)) {
        throw new Error("Trade output is zero. Market may have insufficient liquidity.")
      }

      const slippageBps = BigInt(Math.floor(slippage * 100))
      const minOutWei = (estimatedOutWei * (BigInt(10000) - slippageBps)) / BigInt(10000)

      if (minOutWei <= BigInt(0)) {
        throw new Error("Trade amount too small after slippage. Please increase the trade size.")
      }

      console.log("Trade details:", {
        marketId: market.id,
        outcome,
        amountBNB: amount,
        estimatedOut: ethers.formatEther(estimatedOutWei),
        minOut: ethers.formatEther(minOutWei),
        slippage: `${slippage}%`,
        amountWei: amountInWei.toString(),
        minOutWei: minOutWei.toString()
      })

      const contractWithSigner = contract.connect(signer) as any

      let tx
      if (outcome === "YES") {
        tx = await contractWithSigner.buyYesWithBNBFor(
          BigInt(market.id),
          account,
          minOutWei,
          { value: amountInWei }
        )
      } else {
        tx = await contractWithSigner.buyNoWithBNBFor(
          BigInt(market.id),
          account,
          minOutWei,
          { value: amountInWei }
        )
      }

      setTxHash(tx.hash)
      console.log("Transaction submitted:", tx.hash)

      const receipt = await tx.wait()
      console.log("Transaction confirmed:", receipt)

      if (receipt.status === 1) {
        setAmount("")
        setExpectedOut(null)
        setFeeEstimated(null)
        setTimeout(() => onClose(), 2500)
      } else {
        setError("Transaction failed")
      }
    } catch (err: any) {
      console.error("Trade error:", err)

      if (err?.message?.includes("slippage exceeded") || err?.reason?.includes("slippage exceeded")) {
        const suggestedSlippage = Math.min(slippage + 5, 20)
        setError(`Price moved unfavorably!

The market price changed between when you submitted and when the transaction was processed.

Solutions:
• Increase slippage to ${suggestedSlippage}%
• Use a smaller trade amount
• Wait and try again`)
      } else if (err?.code === "INSUFFICIENT_FUNDS" || err?.message?.includes("insufficient funds")) {
        setError("Insufficient BNB balance (including gas fees) or Switch your network to BNB testnet")
      } else if (
        err?.message?.includes("insufficient liquidity") ||
        err?.message?.includes("insufficient YES liquidity") ||
        err?.message?.includes("insufficient NO liquidity")
      ) {
        setError(`Insufficient liquidity in the market.

The pool doesn't have enough tokens to complete your trade.

Try:
• Reducing your trade size
• Trading in smaller increments`)
      } else if (err?.code === "ACTION_REJECTED" || err?.message?.includes("user rejected")) {
        setError("Transaction was cancelled")
      } else if (err?.code === "UNPREDICTABLE_GAS_LIMIT") {
        setError(`Unable to estimate gas fees.

This usually means the transaction would fail.

Try:
• Increasing slippage tolerance
• Reducing trade amount
• Refreshing and trying again`)
      } else if (err?.message?.includes("market not open")) {
        setError("Market is not open for trading")
      } else if (err?.message?.includes("market ended")) {
        setError("Market has ended and is no longer accepting trades")
      } else if (err?.message?.includes("zero BNB")) {
        setError("Trade amount must be greater than 0")
      } else if (err?.reason) {
        setError(`Transaction failed: ${err.reason}`)
      } else if (err?.message) {
        setError(err.message)
      } else {
        setError("Transaction failed. Please try again.")
      }
    } finally {
      setIsProcessing(false)
    }
  }

  const formatMultiplier = (multiplier: number | null) => {
    if (!multiplier) return "-"
    return multiplier.toFixed(2) + "x"
  }

  const formatPercentage = (value: number | null) => {
    if (value === null || value === undefined) return "-"
    const percentValue = value * 100
    return percentValue.toFixed(1) + "%"
  }

  const formatBNB = (value: number | null) => {
    if (value === null || value === undefined) return "-"
    if (value >= 1000) return value.toFixed(0)
    if (value >= 100) return value.toFixed(1)
    if (value >= 10) return value.toFixed(2)
    if (value >= 1) return value.toFixed(3)
    return value.toFixed(4)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 sm:p-6">
      <div className="absolute inset-0 bg-black/90 backdrop-blur-sm" onClick={onClose} />
      <Card className="relative w-full max-w-md sm:max-w-lg rounded-lg shadow-xl overflow-auto max-h-[90vh]">
        <div className="p-4 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold line-clamp-2">{market?.question || "Trade"}</h3>
            <Button variant="ghost" size="icon" onClick={onClose} className="shrink-0 ml-2">
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Alert for wallet connection and network */}
          {!account ? (
            <div className="mb-4 p-3 bg-yellow-100 border border-yellow-300 rounded-md text-yellow-800 font-semibold text-center">
              Please connect your wallet to continue.
              <Button 
                variant="outline"
                size="sm"
                className="ml-2"
                onClick={connectWallet}
                disabled={isProcessing}
              >
                Connect Wallet
              </Button>
            </div>
          ) : !isCorrectNetwork ? (
            <div className="mb-4 p-3 bg-yellow-100 border border-yellow-300 rounded-md text-yellow-800 font-semibold text-center">
              ⚠️ Please switch your wallet network to BNB Testnet (chainId: 97) to trade.
              <Button 
                variant="outline"
                size="sm"
                className="ml-2"
                onClick={switchNetwork}
                disabled={isProcessing}
              >
                Switch to BNB Testnet
              </Button>
            </div>
          ) : null}

          <div className="space-y-4">
            {/* Outcome Selection */}
            <div className="flex gap-2">
              <Button
                className="flex-1"
                variant={outcome === "YES" ? "outline" : "outline"}
                onClick={() => onOutcomeChange("YES")}
                disabled={isProcessing}
              >
                <div className="flex flex-col items-center">
                  <span className="font-semibold">YES</span>
                  {yesOdds && (
                    <span className="text-xs opacity-80 mt-1">
                      {formatMultiplier(yesOdds)}
                    </span>
                  )}
                </div>
              </Button>

              <Button
                className="flex-1"
                variant={outcome === "NO" ? "outline" : "outline"}
                onClick={() => onOutcomeChange("NO")}
                disabled={isProcessing}
              >
                <div className="flex flex-col items-center">
                  <span className="font-semibold">NO</span>
                  {noOdds && (
                    <span className="text-xs opacity-80 mt-1">
                      {formatMultiplier(noOdds)}
                    </span>
                  )}
                </div>
              </Button>
            </div>

            {/* Amount Input */}
            <div>
              <label className="block text-sm font-medium mb-2">Amount (BNB)</label>
              <Input
                type="number"
                min="0.001"
                step="0.001"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.001"
                className="text-lg"
                disabled={isProcessing}
              />
              <p className="text-xs text-muted-foreground mt-1">Minimum: 0.001 BNB</p>
            </div>

            {/* Market Data & Trade Preview */}
            {normalizedYes !== null && normalizedNo !== null && (
              <div className="space-y-3">
                {/* Market Probabilities */}
                <div className="flex gap-3">
                  <div className="flex-1 p-3 rounded-lg bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800">
                    <div className="text-xs text-green-600 dark:text-green-400 font-medium">YES</div>
                    <div className="text-lg font-bold text-green-700 dark:text-green-300">
                      {formatPercentage(normalizedYes)}
                    </div>
                    <div className="text-xs text-green-600 dark:text-green-400 mt-1">
                      Odds: {formatMultiplier(yesOdds)}
                    </div>
                  </div>

                  <div className="flex-1 p-3 rounded-lg bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800">
                    <div className="text-xs text-red-600 dark:text-red-400 font-medium">NO</div>
                    <div className="text-lg font-bold text-red-700 dark:text-red-300">
                      {formatPercentage(normalizedNo)}
                    </div>
                    <div className="text-xs text-red-600 dark:text-red-400 mt-1">
                      Odds: {formatMultiplier(noOdds)}
                    </div>
                  </div>
                </div>

                {/* Trade Details */}
                {isEstimating && hasAmount && outcome ? (
                  <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
                    <div className="flex items-center justify-center py-2">
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      <span className="text-sm text-blue-600 dark:text-blue-400">Calculating payout...</span>
                    </div>
                  </div>
                ) : expectedPayout && payoutMultiplier && hasAmount && outcome ? (
                  <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-blue-700 dark:text-blue-300 font-medium">Investment:</span>
                        <span className="font-bold text-blue-900 dark:text-blue-100">
                          {formatBNB(numAmount)} BNB
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-blue-700 dark:text-blue-300 font-medium">Expected Payout:</span>
                        <span className="font-bold text-blue-900 dark:text-blue-100">
                          ~{formatBNB(expectedPayout)} BNB
                        </span>
                      </div>
                      <div className="flex justify-between items-center pt-2 border-t border-blue-200 dark:border-blue-800">
                        <span className="text-sm text-blue-700 dark:text-blue-300 font-medium">Payout Multiplier:</span>
                        <span className="font-bold text-lg text-blue-700 dark:text-blue-300">
                          {formatMultiplier(payoutMultiplier)}
                        </span>
                      </div>
                      {feeEstimated && parseFloat(feeEstimated) > 0 && (
                        <div className="flex justify-between text-xs text-muted-foreground pt-1">
                          <span>Trading fee:</span>
                          <span>{parseFloat(feeEstimated).toFixed(6)} BNB</span>
                        </div>
                      )}
                    </div>
                  </div>
                ) : null}

                {/* Slippage Settings */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Slippage tolerance</label>
                  <div className="flex flex-wrap gap-2">
                    {[1, 2, 5, 10, 15].map((preset) => (
                      <Button
                        key={preset}
                        type="button"
                        variant={slippage === preset ? "outline" : "outline"}
                        size="sm"
                        onClick={() => setSlippage(preset)}
                        className="text-xs h-8"
                        disabled={isProcessing}
                      >
                        {preset}%
                      </Button>
                    ))}
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      className="w-24 text-right"
                      type="number"
                      min="0.1"
                      max="50"
                      step="0.5"
                      value={slippage}
                      onChange={(e) => {
                        const val = Number(e.target.value)
                        setSlippage(Math.max(0.1, Math.min(50, val)))
                      }}
                      disabled={isProcessing}
                    />
                    <span className="text-sm">%</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {slippage < 1
                      ? "⚠️ Very low - trades may fail"
                      : slippage > 15
                        ? "⚠️ High - you may get less than expected"
                        : slippage > 10
                          ? "Higher tolerance for volatile markets"
                          : "Recommended for most trades"}
                  </p>
                </div>
              </div>
            )}

            {/* Error Messages */}
            {error && (
              <div className="p-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-sm text-red-600 dark:text-red-400 whitespace-pre-line">{error}</p>
              </div>
            )}

            {/* Success Message */}
            {txHash && (
              <div className="p-3 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg">
                <p className="text-sm text-green-600 dark:text-green-400 font-medium">
                  ✓ Transaction successful!
                </p>
                <p className="text-xs text-green-600 dark:text-green-400 mt-1 break-all font-mono">
                  {txHash.slice(0, 10)}...{txHash.slice(-8)}
                </p>
              </div>
            )}

            {/* Action Button */}
            <Button
              className="w-full h-12 text-lg font-semibold"
              variant="outline"
              onClick={handleTrade}
              disabled={isProcessing || !hasAmount || !outcome || isEstimating}
              size="lg"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Processing...
                </>
              ) : !account ? (
                "Connect Wallet"
              ) : !isCorrectNetwork ? (
                "Switch Network"
              ) : isEstimating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Calculating...
                </>
              ) : (
                `Buy ${outcome}`
              )}
            </Button>

            {/* Help Text */}
            <p className="text-xs text-center text-muted-foreground">
              {hasAmount && outcome && expectedPayout && !isEstimating ? (
                `Expected payout: ${formatBNB(expectedPayout)} BNB (${formatMultiplier(payoutMultiplier)})`
              ) : hasAmount && outcome && isEstimating ? (
                "Calculating expected payout..."
              ) : (
                "Enter amount and select outcome to see expected payout"
              )}
            </p>
          </div>
        </div>
      </Card>
    </div>
  )
}
