"use client"

import { useState } from "react"
import { X, Loader2, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { useWeb3Context } from "@/lib/wallet-context"
import { usePredictionMarket } from "@/hooks/use-predection-market"
import React from "react";

interface CreateMarketModalProps {
  onClose: () => void
  onSuccess?: (marketId: number) => void
}

export default function CreateMarketModal({ onClose, onSuccess }: CreateMarketModalProps) {
  const [question, setQuestion] = useState("")
  const [endDate, setEndDate] = useState("")
  const [endTime, setEndTime] = useState("")
  const [initialYes, setInitialYes] = useState("0.1")
  const [initialNo, setInitialNo] = useState("0.1")
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [txHash, setTxHash] = useState<string | null>(null)

  // Get unified Web3 context
  const { account, connectWallet, isConnecting, isCorrectNetwork, switchNetwork } = useWeb3Context()
  const { createMarket, isLoading, isContractReady } = usePredictionMarket()

  // Calculate liquidity preview
  const totalLiquidity = parseFloat(initialYes || "0") + parseFloat(initialNo || "0")
  const yesPercent = totalLiquidity > 0 ? (parseFloat(initialYes || "0") / totalLiquidity) * 100 : 50
  const noPercent = 100 - yesPercent

  const handleCreate = async () => {
    // Step 1: Check if wallet is connected
    if (!account) {
      await connectWallet()
      return
    }

    // Step 2: Check if on correct network
    if (!isCorrectNetwork) {
      await switchNetwork()
      return
    }

    // Step 3: Check if contract is ready
    if (!isContractReady) {
      setError("Contract not ready. Please wait or refresh the page.")
      return
    }

    // Step 4: Validate question
    if (!question || question.length < 10) {
      setError("Question must be at least 10 characters")
      return
    }

    if (question.length > 280) {
      setError("Question must be less than 280 characters")
      return
    }

    // Step 5: Validate end date/time
    if (!endDate || !endTime) {
      setError("Please set an end date and time")
      return
    }

    const endDateTime = new Date(`${endDate}T${endTime}`)
    const now = new Date()
    const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000)

    if (endDateTime <= oneHourFromNow) {
      setError("End time must be at least 1 hour from now")
      return
    }

    // Step 6: Validate liquidity amounts
    const yesAmount = parseFloat(initialYes)
    const noAmount = parseFloat(initialNo)

    if (yesAmount <= 0 || noAmount <= 0) {
      setError("Both YES and NO liquidity must be greater than 0")
      return
    }

    if (totalLiquidity < 0.01) {
      setError("Total liquidity must be at least 0.01 BNB")
      return
    }

    // Step 7: Proceed with market creation
    setIsProcessing(true)
    setError(null)
    setTxHash(null)

    try {
      const endTimeUnix = Math.floor(endDateTime.getTime() / 1000)
      
      console.log("📝 Creating market with params:", {
        question,
        endTime: endTimeUnix,
        initialYes,
        initialNo
      })

      const marketId = await createMarket({
        question,
        endTime: endTimeUnix,
        initialYes,
        initialNo
      })

      console.log("✅ Market created successfully:", marketId)
      setTxHash("success")
      
      if (onSuccess) {
        onSuccess(marketId)
      }

      // Close modal after 2 seconds
      setTimeout(() => {
        onClose()
      }, 2000)
    } catch (err: any) {
      console.error("❌ Market creation error:", err)
      setError(err.reason || err.message || "Failed to create market")
    } finally {
      setIsProcessing(false)
    }
  }

  // Set minimum date to tomorrow
  const minDate = new Date()
  minDate.setDate(minDate.getDate() + 1)
  const minDateString = minDate.toISOString().split("T")[0]

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 sm:p-6">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-lg sm:rounded-lg bg-card text-card-foreground shadow-lg overflow-auto">
        <div className="p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Create Market</h3>
            <button onClick={onClose} className="text-muted-foreground">Close</button>
          </div>

          {/* Form fields */}
          <form className="mt-4 space-y-4">
            {/* keep your existing inputs — they will stretch to full width on mobile */}
            <div>
              <label className="block text-sm mb-1">Question</label>
              <input className="w-full rounded-md p-2 bg-input text-foreground border border-border" />
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <input className="flex-1 rounded-md p-2 bg-input text-foreground border border-border" placeholder="Initial YES" />
              <input className="flex-1 rounded-md p-2 bg-input text-foreground border border-border" placeholder="Initial NO" />
            </div>

            <div className="flex justify-end">
              <button type="submit" className="bg-black text-white px-4 py-2 rounded-md">Create</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
