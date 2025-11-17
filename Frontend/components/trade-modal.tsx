"use client"

import { useState, useEffect, useMemo, useRef } from "react"
import { X, Loader2, AlertTriangle, Info } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { useWeb3Context } from "@/lib/wallet-context"
import { usePredictionMarketBNB } from "@/hooks/use-predection-market"
import { usePredictionMarketPDX } from "@/hooks/use-prediction-market-pdx"
import { ethers } from "ethers"

interface TradeModalProps {
  market: any
  paymentToken: "BNB" | "PDX"
  outcome: "YES" | "NO" | null
  onOutcomeChange: (o: "YES" | "NO") => void
  onClose: () => void
}

export default function TradeModal({
  market,
  paymentToken,
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
  const [slippage, setSlippage] = useState(40) // ✅ Start with 40% based on your logs
  const [isEstimating, setIsEstimating] = useState(false)
  const [showSlippageWarning, setShowSlippageWarning] = useState(false)

  const { account, connectWallet, isCorrectNetwork, switchNetwork, signer, provider } = useWeb3Context()
  const bnbHook = usePredictionMarketBNB()
  const pdxHook = usePredictionMarketPDX()

  // Use the correct hook based on payment token
  const currentHook = paymentToken === "BNB" ? bnbHook : pdxHook
  const isContractReady = currentHook?.isContractReady === true

  const numAmount = parseFloat(amount) || 0
  const hasAmount = numAmount >= 0.001
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Helper to validate market ID (allow 0 as valid starting ID)
  const validateMarketId = (id: any): number => {
    if (id == null || id === '') throw new Error("Market ID not found")
    const idNum = Number(id)
    if (isNaN(idNum) || idNum < 0) throw new Error("Invalid market ID: must be non-negative number")
    return idNum
  }

  // Early check for invalid market on mount
  useEffect(() => {
    try {
      validateMarketId(market?.id)
    } catch (err: any) {
      setError(err.message)
      setTimeout(onClose, 2000)
    }
  }, [market?.id, onClose])

  // ============================================
  // ✅ FIXED SLIPPAGE CALCULATION USING PYTHON FORMULA
  // ============================================

  /**
   * Calculate minimum output with proper slippage tolerance
   * Using the Python formula: min_tokens = int(amount_out * (1 - (slippage / 100)))
   * 
   * @param expectedOutput - The expected output amount as string
   * @param slippagePercent - Slippage percentage (e.g., 40 for 40%)
   * @returns Minimum output as string with 18 decimals
   */
  const calculateMinimumOutput = (expectedOutput: string, slippagePercent: number): string => {
    try {
      const expectedNum = parseFloat(expectedOutput)
      if (isNaN(expectedNum) || expectedNum <= 0) {
        throw new Error("Invalid expected output")
      }

      // ✅ Apply the Python formula: amount_out * (1 - (slippage / 100))
      const slippageMultiplier = 1 - (slippagePercent / 100)
      const minOut = expectedNum * slippageMultiplier
      
      console.log("📊 Slippage Calculation:", {
        expectedOutput,
        slippagePercent: `${slippagePercent}%`,
        multiplier: slippageMultiplier,
        minimumOutput: minOut.toFixed(6),
        difference: `${slippagePercent}%`
      })

      // Return with 18 decimals for contract precision
      return minOut.toFixed(18)
    } catch (error) {
      console.error("❌ Slippage calculation error:", error)
      throw new Error("Failed to calculate minimum output")
    }
  }

  /**
   * Validate slippage calculation matches intended slippage
   */
  const validateSlippageCalculation = (
    expectedOut: string, 
    minOut: string, 
    slippagePercent: number
  ): boolean => {
    try {
      const expected = parseFloat(expectedOut)
      const minimum = parseFloat(minOut)
      
      if (isNaN(expected) || isNaN(minimum)) return false
      if (minimum <= 0) return false
      if (minimum > expected) return false
      
      // Calculate actual slippage percentage
      const actualSlippage = ((expected - minimum) / expected) * 100
      
      // Allow small rounding tolerance
      const isValid = Math.abs(actualSlippage - slippagePercent) < 0.01
      
      console.log("🔍 Validation:", {
        expected,
        minimum,
        intendedSlippage: `${slippagePercent}%`,
        actualSlippage: `${actualSlippage.toFixed(2)}%`,
        valid: isValid
      })
      
      return isValid
    } catch (error) {
      console.error("❌ Validation error:", error)
      return false
    }
  }

  // ============================================
  // CALCULATION FUNCTIONS
  // ============================================

  // Load market prices
  const loadMarketPrices = async () => {
    if (!market?.id || !isContractReady) return

    try {
      const marketId = validateMarketId(market.id)
      console.log(`📊 Loading ${paymentToken} market prices for ID ${marketId}...`)
      
      let priceData
      if (paymentToken === "BNB") {
        priceData = await bnbHook.getCurrentMultipliers(marketId)
        setYesPrice(priceData.yesPrice)
        setNoPrice(priceData.noPrice)
      } else {
        priceData = await pdxHook.getCurrentMultipliers(marketId)
        setYesPrice(priceData.yesPrice)
        setNoPrice(priceData.noPrice)
      }
      
      console.log("✅ Prices loaded:", priceData)
    } catch (err: any) {
      console.error("❌ Price fetch error:", err)
      if (err.message.includes("Market ID")) {
        setError(err.message)
      }
    }
  }

  // Calculate expected outcome with fresh data
  const calculateExpectedOutcome = async () => {
    try {
      const marketId = validateMarketId(market?.id)
    } catch (err: any) {
      setExpectedOut(null)
      setFeeEstimated(null)
      setIsEstimating(false)
      setError((err as Error).message)
      return
    }

    if (!hasAmount || !outcome || !isContractReady || !market?.id) {
      setExpectedOut(null)
      setFeeEstimated(null)
      setIsEstimating(false)
      return
    }

    setIsEstimating(true)
    setError(null)

    try {
      console.log(`🔍 Calculating ${paymentToken} outcome...`)
      
      const marketId = validateMarketId(market.id)
      let result
      
      if (paymentToken === "BNB") {
        if (outcome === "YES") {
          result = await bnbHook.getBuyYesMultiplier(marketId, amount)
        } else {
          result = await bnbHook.getBuyNoMultiplier(marketId, amount)
        }
      } else {
        if (outcome === "YES") {
          result = await pdxHook.getBuyYesMultiplier(marketId, amount)
        } else {
          result = await pdxHook.getBuyNoMultiplier(marketId, amount)
        }
      }

      if (result && parseFloat(result.totalOut || "0") > 0) {
        setExpectedOut(result.totalOut)
        setFeeEstimated(result.totalFee)
        
        // ✅ Always validate our slippage calculation
        const minOut = calculateMinimumOutput(result.totalOut, slippage)
        const isValid = validateSlippageCalculation(result.totalOut, minOut, slippage)
        
        if (!isValid) {
          console.warn("⚠️ Slippage calculation validation failed")
          setError("Slippage calculation error. Please adjust slippage and try again.")
        }
        
        console.log("✅ Calculation complete:", { 
          ...result, 
          calculatedMinOut: parseFloat(minOut).toFixed(6),
          slippageValid: isValid 
        })
      } else {
        throw new Error("No payout available - market may lack liquidity or be closed")
      }
    } catch (err: any) {
      console.error("❌ Calculation failed:", err)
      setExpectedOut(null)
      setFeeEstimated(null)
      if (!error) {
        setError(err.message || "Failed to calculate payout. Try a different amount.")
      }
    } finally {
      setIsEstimating(false)
    }
  }

  // ============================================
  // BALANCE CHECK HELPERS
  // ============================================
  const BNB_GAS_BUFFER = ethers.parseEther("0.01")

  const ensureSufficientBNBBalance = async (valueWei: bigint) => {
    if (!signer || !provider) throw new Error("Wallet not connected")

    try {
      const userAddress = await signer.getAddress()
      const balance: bigint = await provider.getBalance(userAddress)
      const required = valueWei + BNB_GAS_BUFFER

      if (balance < required) {
        const have = Number(ethers.formatEther(balance)).toFixed(6)
        const need = Number(ethers.formatEther(required)).toFixed(6)

        const msg = `Insufficient BNB balance. Have: ${have} BNB — required (amount + gas buffer): ~${need} BNB`
        const e: any = new Error(msg)
        e.code = "INSUFFICIENT_FUNDS"
        throw e
      }

      return true
    } catch (err) {
      throw err
    }
  }

  const ensureSufficientPDXBalance = async (pdxAmountWei: bigint) => {
    if (!pdxHook?.pdxTokenContract || !account) throw new Error("PDX token contract not available")
    try {
      const balance: bigint = await (pdxHook.pdxTokenContract as any).balanceOf(account)
      if (balance < pdxAmountWei) {
        const have = Number(ethers.formatEther(balance)).toFixed(6)
        const need = Number(ethers.formatEther(pdxAmountWei)).toFixed(6)
        const msg = `Insufficient PDX token balance. Have: ${have} PDX — required: ${need} PDX`
        const e: any = new Error(msg)
        e.code = "INSUFFICIENT_FUNDS"
        throw e
      }
      return true
    } catch (err) {
      throw err
    }
  }

  // ============================================
  // ✅ FIXED TRADE EXECUTION WITH PYTHON FORMULA
  // ============================================

  const executeBNBTrade = async () => {
    const marketId = validateMarketId(market?.id)
    if (!bnbHook?.buyYesWithBNB || !bnbHook?.buyNoWithBNB) {
      throw new Error("BNB trade functions not available")
    }
    if (!signer) throw new Error("Wallet not connected")
    if (!expectedOut || parseFloat(expectedOut) <= 0) {
      throw new Error("Invalid expected payout")
    }

    // ✅ Use the displayed expectedOut (what user saw)
    const userExpectedOut = expectedOut

    // ✅ Apply Python formula: min_tokens = amount_out * (1 - (slippage / 100))
    const minOut = calculateMinimumOutput(userExpectedOut, slippage)
    
    // Validate the calculation
    const isValid = validateSlippageCalculation(userExpectedOut, minOut, slippage)
    if (!isValid) {
      throw new Error("Slippage calculation error. Please try again.")
    }

    // Ensure sufficient balance
    const valueWei: bigint = ethers.parseEther(amount)
    await ensureSufficientBNBBalance(valueWei)

    console.log(`📤 Executing BNB trade:`, {
      marketId,
      outcome,
      amount,
      userExpectedOut,
      slippageTolerance: `${slippage}%`,
      minOut,
      minOutFormatted: parseFloat(minOut).toFixed(6),
      formula: `minOut = ${userExpectedOut} * (1 - ${slippage/100}) = ${minOut}`,
      validationPassed: isValid
    })

    // Execute trade with validated minimum
    if (outcome === "YES") {
      return await bnbHook.buyYesWithBNB(marketId, minOut, amount)
    } else {
      return await bnbHook.buyNoWithBNB(marketId, minOut, amount)
    }
  }

  const executePDXTrade = async () => {
  const marketId = validateMarketId(market?.id)
  if (!pdxHook?.buyYesWithPDX || !pdxHook?.buyNoWithPDX) {
    throw new Error("PDX trade functions not available")
  }
  if (!signer || !account) throw new Error("Wallet not connected")

  // Ensure sufficient balance
  const pdxAmountWei = ethers.parseEther(amount)
  await ensureSufficientPDXBalance(pdxAmountWei)

  // ✅ FIX: Get FRESH prices right before transaction
  console.log("🔄 Refreshing prices before transaction...")
  let freshResult
  try {
    if (outcome === "YES") {
      freshResult = await pdxHook.getBuyYesMultiplier(marketId, amount)
    } else {
      freshResult = await pdxHook.getBuyNoMultiplier(marketId, amount)
    }
  } catch (err) {
    console.error("❌ Failed to get fresh prices:", err)
    throw new Error("Failed to recalculate prices. Market may have changed. Try again.")
  }

  if (!freshResult || parseFloat(freshResult.totalOut || "0") <= 0) {
    throw new Error("No payout available - market conditions changed. Try again.")
  }

  // ✅ Use FRESH expectedOut (not the old one from UI)
  const freshExpectedOut = freshResult.totalOut
  console.log("📊 Fresh calculation:", {
    oldExpectedOut: expectedOut,
    freshExpectedOut,
    difference: expectedOut ? ((parseFloat(freshExpectedOut) - parseFloat(expectedOut)) / parseFloat(expectedOut) * 100).toFixed(2) + "%" : "N/A"
  })

  // ✅ Calculate minOut from FRESH prices
  const minOut = calculateMinimumOutput(freshExpectedOut, slippage)
  
  console.log(`📤 Executing PDX trade with FRESH prices:`, {
    marketId,
    outcome,
    amount,
    freshExpectedOut,  // ✅ Using fresh, not old
    slippageTolerance: `${slippage}%`,
    minOut,
    minOutFormatted: parseFloat(minOut).toFixed(6)
  })

  // ✅ FIXED: minOut FIRST, then amount (same as BNB)
  if (outcome === "YES") {
    return await pdxHook.buyYesWithPDX(marketId, minOut, amount)
  } else {
    return await pdxHook.buyNoWithPDX(marketId, minOut, amount)
  }
}


  const executeTrade = async () => {
    console.log(`🚀 Executing ${paymentToken} trade...`)

    // Pre-flight validation
    if (!signer) throw new Error("Wallet not connected")
    validateMarketId(market?.id)
    if (!expectedOut || parseFloat(expectedOut) <= 0) {
      throw new Error("Invalid expected payout")
    }

    let receipt
    if (paymentToken === "BNB") {
      receipt = await executeBNBTrade()
    } else {
      receipt = await executePDXTrade()
    }

    if (!receipt) {
      throw new Error("Transaction failed - no receipt received")
    }

    return receipt
  }

  // ============================================
  // LIFECYCLE HOOKS
  // ============================================

  // Load prices on mount
  useEffect(() => {
    loadMarketPrices()
  }, [market?.id, isContractReady, paymentToken])

  // Calculate outcome when inputs change (with debounce)
  useEffect(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    if (!hasAmount || !outcome || !isContractReady || !market?.id) {
      setExpectedOut(null)
      setFeeEstimated(null)
      setIsEstimating(false)
      return
    }

    timeoutRef.current = setTimeout(() => {
      calculateExpectedOutcome()
    }, 500)

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [amount, outcome, hasAmount, isContractReady, market?.id, paymentToken, slippage])

  // Show warning for low slippage
  useEffect(() => {
    setShowSlippageWarning(slippage < 35) // Warn if below 35% based on your logs
  }, [slippage])

  // Early return for invalid market ID
  if (market?.id != null) {
    try {
      validateMarketId(market.id)
    } catch (err: any) {
      return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/90 backdrop-blur-sm" onClick={onClose} />
          <Card className="relative w-full max-w-md p-6 text-center">
            <h3 className="text-lg font-semibold mb-4">Invalid Market</h3>
            <p className="text-muted-foreground mb-4">{err.message}. Please refresh or select another market.</p>
            <Button onClick={onClose} className="w-full">Close</Button>
          </Card>
        </div>
      )
    }
  }

  // ============================================
  // EVENT HANDLERS
  // ============================================

  const handleTrade = async () => {
    setError(null)

    // Comprehensive validation
    if (!account) {
      connectWallet()
      return
    }
    if (!isCorrectNetwork) {
      switchNetwork()
      return
    }
    if (!amount || numAmount <= 0) {
      setError(`Please enter a valid ${paymentToken} amount`)
      return
    }
    if (numAmount < 0.001) {
      setError(`Minimum trade amount is 0.001 ${paymentToken}`)
      return
    }
    if (!outcome) {
      setError("Please select YES or NO")
      return
    }
    if (!signer) {
      setError("Wallet provider not ready")
      return
    }
    if (!isContractReady) {
      setError("Contracts are still initializing. Please wait...")
      return
    }
    if (!expectedOut || parseFloat(expectedOut || "0") <= 0 || isEstimating) {
      setError("Still calculating expected payout. Please wait...")
      return
    }
    if (!market?.id && market?.id !== 0) {
      setError("Invalid market data")
      return
    }

    try {
      validateMarketId(market.id)
    } catch (err: any) {
      setError(err.message)
      return
    }

    if (paymentToken === "BNB") {
      if (!bnbHook?.buyYesWithBNB || !bnbHook?.buyNoWithBNB) {
        setError("BNB trading functions not available")
        return
      }
    } else if (paymentToken === "PDX") {
      if (!pdxHook?.buyYesWithPDX || !pdxHook?.buyNoWithPDX) {
        setError("PDX trading functions not available")
        return
      }
    }

    setIsProcessing(true)
    setTxHash(null)

    try {
      const receipt = await executeTrade()
      
      setTxHash(receipt?.transactionHash || "success")
      console.log("✅ Trade successful:", receipt)

      // Reset and close
      setAmount("")
      setExpectedOut(null)
      setFeeEstimated(null)
      setTimeout(() => onClose(), 2500)

    } catch (err: any) {
      console.error("❌ Trade failed:", err)
      handleTradeError(err)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleTradeError = (err: any): void => {
    console.error("❌ Trade error details:", {
      message: err?.message,
      code: err?.code,
      reason: err?.reason,
      data: err?.data
    })

    // Handle slippage exceeded error
    if ((err?.message && err.message.includes("Slippage exceeded")) || 
        (err?.reason && err.reason.includes("Slippage exceeded"))) {
      const suggestedSlippage = Math.min(slippage + 15, 70) // More aggressive increase
      setError(
        `⚠️ SLIPPAGE EXCEEDED\n\n` +
        `The price moved more than ${slippage}% between calculation and execution.\n\n` +
        `Current slippage: ${slippage}%\n` +
        `Suggested: ${suggestedSlippage}%\n\n` +
        `Try:\n` +
        `• Increase slippage to ${suggestedSlippage}%\n` +
        `• Wait 10-30 seconds and retry\n` +
        `• Use smaller trade amounts\n` +
        `• Trade during less volatile periods`
      )
      setSlippage(suggestedSlippage)
      return
    }

    // Handle other errors
    if (err?.code === "CALL_EXCEPTION" && !err?.reason && !err?.data) {
      setError(
        `Transaction simulation failed.\n\n` +
        `Possible causes:\n` +
        `• Market closed or paused\n` +
        `• Insufficient liquidity\n` +
        `• Network congestion\n\n` +
        `Try:\n` +
        `• Refresh the market\n` +
        `• Reduce trade amount\n` +
        `• Increase slippage to ${Math.min(slippage + 15, 70)}%`
      )
      return
    }

    if (err?.code === "INSUFFICIENT_FUNDS" || 
        (err?.message && err.message.toLowerCase().includes("insufficient funds"))) {
      setError(err.message || `Insufficient ${paymentToken} balance for trade + gas fees.`)
    } else if (err?.message?.includes("insufficient liquidity")) {
      setError(`Insufficient liquidity in the market.\n\nTry reducing your trade size or increasing slippage.`)
    } else if (err?.code === "ACTION_REJECTED") {
      setError("Transaction was cancelled by user")
    } else if (err?.message?.includes("market not open") || err?.message?.includes("market ended")) {
      setError("Market is not open for trading or has ended")
    } else if (err?.message?.includes("Invalid market")) {
      setError("Invalid market data. Please refresh and try again.")
    } else if (err?.message?.includes("functions not available")) {
      setError("Trading functions not available. Please refresh the page.")
    } else if (err?.message && err?.message.includes("missing revert data")) {
      setError("Transaction failed with no revert reason. Try a smaller amount or increase slippage.")
    } else if (err?.message?.includes("Unable to get current price")) {
      setError(err.message)
    } else {
      setError(
        err?.message || 
        `Transaction failed. Try:\n• Increase slippage to ${Math.min(slippage + 15, 70)}%\n• Use smaller amount\n• Wait and retry`
      )
    }
  }

  // ============================================
  // COMPUTED VALUES
  // ============================================

  const normalizedYes = useMemo(() => yesPrice !== null ? yesPrice / 100 : null, [yesPrice])
  const normalizedNo = useMemo(() => noPrice !== null ? noPrice / 100 : null, [noPrice])

  const yesOdds = useMemo(() => (normalizedYes && normalizedYes > 0) ? 1 / normalizedYes : null, [normalizedYes])
  const noOdds = useMemo(() => (normalizedNo && normalizedNo > 0) ? 1 / normalizedNo : null, [normalizedNo])

  const expectedPayout = useMemo(() => {
    if (!numAmount || !expectedOut || numAmount <= 0) return null
    return parseFloat(expectedOut)
  }, [numAmount, expectedOut])

  const payoutMultiplier = useMemo(() => {
    if (!numAmount || !expectedPayout || numAmount <= 0) return null
    return expectedPayout / numAmount
  }, [numAmount, expectedPayout])

  // Calculate minimum payout using Python formula
  const minPayout = useMemo(() => {
    if (!expectedPayout) return null
    // ✅ Python formula: amount_out * (1 - (slippage / 100))
    const multiplier = 1 - (slippage / 100)
    return expectedPayout * multiplier
  }, [expectedPayout, slippage])

  // Calculate actual slippage percentage for display
  const actualSlippagePercent = useMemo(() => {
    if (!expectedPayout || !minPayout) return null
    return ((expectedPayout - minPayout) / expectedPayout) * 100
  }, [expectedPayout, minPayout])

  // ============================================
  // FORMATTING UTILITIES
  // ============================================

  const formatMultiplier = (multiplier: number | null) => {
    if (!multiplier) return "-"
    return multiplier.toFixed(2) + "x"
  }

  const formatPercentage = (value: number | null) => {
    if (value === null || value === undefined) return "-"
    const percentValue = value * 100
    return percentValue.toFixed(1) + "%"
  }

  const formatTokenAmount = (value: number | null) => {
    if (value === null || value === undefined) return "-"
    if (value >= 1000) return value.toFixed(0)
    if (value >= 100) return value.toFixed(1)
    if (value >= 10) return value.toFixed(2)
    if (value >= 1) return value.toFixed(3)
    return value.toFixed(4)
  }

  const getTokenSymbol = () => paymentToken === "BNB" ? "🔶 BNB" : "💜 PDX"

  // ============================================
  // RENDER
  // ============================================

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 sm:p-6">
      <div className="absolute inset-0 bg-black/90 backdrop-blur-sm" onClick={onClose} />
      
      <Card className="relative w-full max-w-md sm:max-w-lg rounded-lg shadow-xl overflow-auto max-h-[90vh]">
        <div className="p-4 sm:p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <h3 className="text-lg font-semibold line-clamp-2">{market?.question || "Trade"}</h3>
              <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full flex-shrink-0 ${
                paymentToken === "BNB"
                  ? "bg-yellow-500/20 border border-yellow-600/50 text-yellow-400"
                  : "bg-purple-500/20 border border-purple-600/50 text-purple-400"
              }`}>
                {getTokenSymbol()}
              </span>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose} className="shrink-0 ml-2">
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Connection Alerts */}
          {!isContractReady && (
            <div className="mb-4 p-3 bg-blue-100 dark:bg-blue-950 border border-blue-300 dark:border-blue-700 rounded-md text-blue-800 dark:text-blue-400 text-center">
              <div className="flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Initializing {paymentToken} contracts...
              </div>
            </div>
          )}

          {!account && isContractReady && (
            <div className="mb-4 p-3 bg-yellow-100 dark:bg-yellow-950 border border-yellow-300 dark:border-yellow-700 rounded-md text-yellow-800 dark:text-yellow-400 text-center">
              <Button onClick={connectWallet} disabled={isProcessing}>
                Connect Wallet
              </Button>
            </div>
          )}

          {!isCorrectNetwork && account && isContractReady && (
            <div className="mb-4 p-3 bg-yellow-100 dark:bg-yellow-950 border border-yellow-300 dark:border-yellow-700 rounded-md text-yellow-800 dark:text-yellow-400 text-center">
              <Button onClick={switchNetwork} disabled={isProcessing}>
                Switch to BSC Testnet
              </Button>
            </div>
          )}

          <div className="space-y-4">
            {/* Outcome Selection */}
            <div className="flex gap-2">
              <Button
                className={`flex-1 ${outcome === "YES" ? "bg-green-600 text-white" : "bg-gray-200 dark:bg-gray-800"}`}
                onClick={() => onOutcomeChange("YES")}
                disabled={isProcessing || !isContractReady}
              >
                YES
              </Button>
              <Button
                className={`flex-1 ${outcome === "NO" ? "bg-red-600 text-white" : "bg-gray-200 dark:bg-gray-800"}`}
                onClick={() => onOutcomeChange("NO")}
                disabled={isProcessing || !isContractReady}
              >
                NO
              </Button>
            </div>

            {/* Amount Input */}
            <div>
              <label className="block text-sm font-medium mb-2">Amount ({getTokenSymbol()})</label>
              <Input
                type="number"
                min="0.001"
                step="0.001"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.001"
                disabled={isProcessing || !isContractReady}
              />
              <p className="text-xs text-muted-foreground mt-1">Minimum: 0.001 {paymentToken}</p>
            </div>

            {/* Slippage Control */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-sm font-medium">
                  Slippage Tolerance: <span className="font-bold text-blue-600 dark:text-blue-400">{slippage}%</span>
                </label>
                {showSlippageWarning && (
                  <span className="text-xs text-orange-600 dark:text-orange-400 flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    Low slippage
                  </span>
                )}
              </div>
              <div className="flex gap-2">
                {[35, 40, 50, 60, 70].map((preset) => (
                  <Button
                    key={preset}
                    type="button"
                    variant={slippage === preset ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSlippage(preset)}
                    disabled={isProcessing}
                    className="flex-1"
                  >
                    {preset}%
                  </Button>
                ))}
              </div>
              <div className="p-2 bg-blue-50 dark:bg-blue-950 rounded-md border border-blue-200 dark:border-blue-800">
                <div className="flex items-start gap-2">
                  <Info className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-blue-800 dark:text-blue-300">
                    <strong>Python Formula Applied:</strong> min_tokens = expected_output × (1 - {slippage/100})<br/>
                    Your transaction will succeed if price moves ≤{slippage}% worse. 
                    {slippage < 40 && " ⚠️ 40%+ recommended for volatile markets."}
                    {slippage >= 40 && " ✅ Good protection level."}
                  </p>
                </div>
              </div>
            </div>

            {/* Trade Preview */}
            {hasAmount && outcome && (
              <div className="space-y-3">
                {isEstimating ? (
                  <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800 text-center">
                    <Loader2 className="h-4 w-4 animate-spin inline mr-2" />
                    Calculating payout...
                  </div>
                ) : expectedPayout && payoutMultiplier ? (
                  <div className="space-y-3">
                    {/* Main Payout Info */}
                    <div className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 rounded-lg border-2 border-blue-300 dark:border-blue-700">
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Your Investment:</span>
                          <span className="font-bold text-lg">{formatTokenAmount(numAmount)} {paymentToken}</span>
                        </div>
                        
                        <div className="flex justify-between items-center pt-2 border-t border-blue-200 dark:border-blue-800">
                          <span className="text-sm font-medium">Expected Payout:</span>
                          <span className="font-bold text-xl text-green-600 dark:text-green-400">
                            {formatTokenAmount(expectedPayout)} {paymentToken}
                          </span>
                        </div>
                        
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium">Multiplier:</span>
                          <span className="font-bold text-lg text-blue-600 dark:text-blue-400">
                            {formatMultiplier(payoutMultiplier)}
                          </span>
                        </div>

                        {feeEstimated && parseFloat(feeEstimated) > 0 && (
                          <div className="flex justify-between items-center text-sm">
                            <span className="text-muted-foreground">Platform Fee:</span>
                            <span className="font-medium">{formatTokenAmount(parseFloat(feeEstimated))} {paymentToken}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Slippage Protection Details */}
                    <div className="p-3 bg-yellow-50 dark:bg-yellow-950 rounded-lg border border-yellow-300 dark:border-yellow-700">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 mb-2">
                          <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                          <span className="text-sm font-semibold text-yellow-800 dark:text-yellow-300">
                            Slippage Protection Active
                          </span>
                        </div>
                        
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-yellow-800 dark:text-yellow-300">Minimum You'll Receive:</span>
                          <span className="font-bold text-yellow-900 dark:text-yellow-200">
                            {formatTokenAmount(minPayout)} {paymentToken}
                          </span>
                        </div>
                        
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-yellow-800 dark:text-yellow-300">Protection Level:</span>
                          <span className="font-bold text-yellow-900 dark:text-yellow-200">
                            {slippage}% slippage tolerance
                          </span>
                        </div>

                        <div className="pt-2 border-t border-yellow-300 dark:border-yellow-700">
                          <p className="text-xs text-yellow-800 dark:text-yellow-300">
                            📊 <strong>Python Formula:</strong> min_tokens = {expectedPayout.toFixed(6)} × (1 - {slippage/100}) = {minPayout?.toFixed(6)}<br/>
                            Your transaction will automatically fail if prices move more than {slippage}% worse.
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Price Movement Warning */}
                    <div className="p-2 bg-gray-50 dark:bg-gray-900 rounded-md border border-gray-200 dark:border-gray-700">
                      <p className="text-xs text-muted-foreground text-center">
                        ⏱️ Prices update every second. Your transaction uses the latest price at execution time.
                      </p>
                    </div>
                  </div>
                ) : null}
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="p-4 bg-red-50 dark:bg-red-950 border-2 border-red-300 dark:border-red-700 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-red-800 dark:text-red-300 whitespace-pre-line font-medium">{error}</p>
                </div>
              </div>
            )}

            {/* Success Message */}
            {txHash && (
              <div className="p-4 bg-green-50 dark:bg-green-950 border-2 border-green-300 dark:border-green-700 rounded-lg">
                <p className="text-sm text-green-800 dark:text-green-300 font-semibold text-center">
                  ✅ Transaction Successful!
                </p>
                <p className="text-xs text-green-700 dark:text-green-400 text-center mt-1">
                  Your trade has been executed. Closing in a moment...
                </p>
              </div>
            )}

            {/* Trade Button */}
            <Button
              className="w-full h-12 text-lg font-semibold"
              onClick={handleTrade}
              disabled={
                isProcessing || 
                !hasAmount || 
                !outcome || 
                isEstimating || 
                !expectedOut || 
                parseFloat(expectedOut || "0") <= 0 ||
                !isContractReady ||
                !account ||
                !isCorrectNetwork
              }
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin mr-2" />
                  Processing Transaction...
                </>
              ) : !account ? (
                "Connect Wallet First"
              ) : !isCorrectNetwork ? (
                "Switch to BSC Testnet"
              ) : !isContractReady ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin mr-2" />
                  Initializing...
                </>
              ) : isEstimating ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin mr-2" />
                  Calculating...
                </>
              ) : !hasAmount || !outcome ? (
                "Enter Amount & Select Outcome"
              ) : (
                `Buy ${outcome} - ${slippage}% Slippage Protection`
              )}
            </Button>

            {/* Status Text */}
            <div className="text-center space-y-1">
              <p className="text-xs text-muted-foreground">
                {!isContractReady 
                  ? `🔄 Connecting to ${paymentToken} contracts...`
                  : !expectedOut && hasAmount && outcome 
                  ? "⏳ Calculating your expected payout..."
                  : hasAmount && outcome && expectedPayout 
                  ? `📈 Best: ${formatTokenAmount(expectedPayout)} ${paymentToken} | 🛡️ Minimum: ${formatTokenAmount(minPayout)} ${paymentToken}`
                  : "👆 Enter amount and select YES or NO to see payout"
                }
              </p>
              
              {expectedPayout && minPayout && (
                <p className="text-xs font-medium text-blue-600 dark:text-blue-400">
                  💡 Formula: {expectedPayout.toFixed(6)} × (1 - {slippage/100}) = {minPayout?.toFixed(6)} {paymentToken}
                </p>
              )}
            </div>

            {/* Debug Info (only in development) */}
            {process.env.NODE_ENV === 'development' && expectedOut && (
              <div className="p-2 bg-gray-100 dark:bg-gray-900 rounded text-xs font-mono space-y-1">
                <div className="font-semibold text-gray-700 dark:text-gray-300 mb-1">🔧 Debug Info:</div>
                <div className="text-gray-600 dark:text-gray-400">Expected: {parseFloat(expectedOut).toFixed(6)}</div>
                <div className="text-gray-600 dark:text-gray-400">
                  MinOut: {minPayout ? minPayout.toFixed(6) : 'N/A'} 
                  (Python formula: ×{1 - (slippage/100)})
                </div>
                <div className="text-gray-600 dark:text-gray-400">
                  Calculation: {expectedOut} × (1 - {slippage / 100}) = {minPayout?.toFixed(6)}
                </div>
                <div className="text-gray-600 dark:text-gray-400">
                  Validation: {actualSlippagePercent?.toFixed(2)}% ≈ {slippage}% 
                  {actualSlippagePercent && Math.abs(actualSlippagePercent - slippage) < 0.1 ? ' ✅' : ' ⚠️'}
                </div>
              </div>
            )}
          </div>
        </div>
      </Card>
    </div>
  )
}