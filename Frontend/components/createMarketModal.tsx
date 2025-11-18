"use client"

import { useState } from "react"
import { X, Loader2, Plus, Shield, AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { useWeb3Context } from "@/lib/wallet-context"
import { usePredictionMarketBNB } from "@/hooks/use-predection-market"
import { usePredictionMarketPDX } from "@/hooks/use-prediction-market-pdx"

interface CreateMarketModalProps {
  onClose: () => void
  onSuccess?: (marketId: number) => void
}

interface ValidationResult {
  valid: boolean
  reason?: string
  category?: string
  error?: string
}

type PaymentToken = "BNB" | "PDX"

export default function CreateMarketModal({ onClose, onSuccess }: CreateMarketModalProps) {
  const [question, setQuestion] = useState("")
  const [endDate, setEndDate] = useState("")
  const [endTime, setEndTime] = useState("")
  const [initialYes, setInitialYes] = useState("0.1")
  const [initialNo, setInitialNo] = useState("0.1")
  const [paymentToken, setPaymentToken] = useState<PaymentToken>("BNB")
  const [isProcessing, setIsProcessing] = useState(false)
  const [isValidating, setIsValidating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [txHash, setTxHash] = useState<string | null>(null)
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null)

  // Get Web3 context
  const { account, connectWallet, isConnecting, isCorrectNetwork, switchNetwork } = useWeb3Context()
  
  // Get both hooks
  const bnbHook = usePredictionMarketBNB()
  const pdxHook = usePredictionMarketPDX()

  // Use appropriate hook based on payment token
  const currentHook = paymentToken === "BNB" ? bnbHook : pdxHook
  const { isLoading, isContractReady } = currentHook

  // Calculate liquidity preview
  const totalLiquidity = parseFloat(initialYes || "0") + parseFloat(initialNo || "0")
  const yesPercent = totalLiquidity > 0 ? (parseFloat(initialYes || "0") / totalLiquidity) * 100 : 50
  const noPercent = 100 - yesPercent

  // Validate question with AI
  const validateQuestion = async () => {
    if (!question || question.length < 10) {
      setError("Question must be at least 10 characters")
      return false
    }

    if (question.length > 280) {
      setError("Question must be less than 280 characters")
      return false
    }

    if (!endDate || !endTime) {
      setError("Please set an end date and time first")
      return false
    }

    const endDateTime = new Date(`${endDate}T${endTime}`)
    const endTimeUnix = Math.floor(endDateTime.getTime() / 1000)

    // Validate end time is at least 1 hour from now
    const now = new Date()
    const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000)
    if (endDateTime <= oneHourFromNow) {
      setError("End time must be at least 1 hour from now")
      return false
    }

    // Validate liquidity amounts
    const yesAmount = parseFloat(initialYes)
    const noAmount = parseFloat(initialNo)
    if (yesAmount <= 0 || noAmount <= 0) {
      setError("Both YES and NO liquidity must be greater than 0")
      return false
    }
    if (totalLiquidity < 0.01) {
      setError(`Total liquidity must be at least 0.01 ${paymentToken}`)
      return false
    }

    setIsValidating(true)
    setError(null)
    setValidationResult(null)

    try {
      const response = await fetch('https://sigma-predection.vercel.app/api/validate-market', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question: question.trim(),
          endTime: endTimeUnix,
          initialYes,
          initialNo
        })
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Validation API error: ${response.status} - ${errorText}`)
      }

      const validation = await response.json()
      setValidationResult(validation)
      return validation.valid

    } catch (err: any) {
      console.error('❌ AI validation error:', err)
      
      // Fallback to basic validation when AI service is unavailable
      const basicValidation = performBasicValidation(question, endTimeUnix, initialYes, initialNo)
      setValidationResult(basicValidation)
      
      if (!basicValidation.valid) {
        setError(`AI validation unavailable. Basic validation: ${basicValidation.reason}`)
      } else {
        setError("AI validation service is temporarily unavailable. Using basic validation.")
      }
      
      return basicValidation.valid
    } finally {
      setIsValidating(false)
    }
  }

  // Basic validation fallback
  const performBasicValidation = (question: string, endTime: number, initialYes: string, initialNo: string): ValidationResult => {
    if (!question.includes('?')) {
      return {
        valid: false,
        reason: 'Question must end with a question mark',
        category: 'OTHER'
      }
    }
    
    if (question.length < 10) {
      return {
        valid: false,
        reason: 'Question must be at least 10 characters long',
        category: 'OTHER'
      }
    }
    
    if (question.length > 280) {
      return {
        valid: false,
        reason: 'Question must be less than 280 characters',
        category: 'OTHER'
      }
    }
    
    const invalidPatterns = [
      /\b(opinion|think|believe|feel|probably|maybe)\b/i,
      /\b(subjective|arbitrary|pointless)\b/i,
      /\?.*\?/,
      /\b(and|or)\b.*\?/
    ]
    
    for (const pattern of invalidPatterns) {
      if (pattern.test(question)) {
        return {
          valid: false,
          reason: 'Question contains ambiguous or subjective language',
          category: 'OTHER'
        }
      }
    }
    
    const category = determineCategory(question)
    
    return {
      valid: true,
      reason: 'Passes basic validation checks (AI service unavailable)',
      category: category
    }
  }

  // Determine category based on question content
  const determineCategory = (question: string): string => {
    const lowerQuestion = question.toLowerCase()
    
    const categoryKeywords = {
      CRYPTO: ['bitcoin', 'ethereum', 'crypto', 'blockchain', 'btc', 'eth', 'defi', 'nft', 'token', 'pdx'],
      POLITICS: ['election', 'president', 'government', 'policy', 'senate', 'congress', 'vote'],
      SPORTS: ['game', 'match', 'tournament', 'championship', 'olympics', 'team', 'player'],
      TECHNOLOGY: ['launch', 'release', 'update', 'software', 'hardware', 'ai', 'artificial intelligence'],
      FINANCE: ['stock', 'market', 'earnings', 'economic', 'gdp', 'inflation', 'interest rate'],
      ENTERTAINMENT: ['movie', 'film', 'oscar', 'award', 'celebrity', 'music', 'album'],
      SCIENCE: ['discovery', 'research', 'study', 'medical', 'health', 'space', 'nasa'],
      WORLD: ['earthquake', 'hurricane', 'summit', 'conference', 'international', 'global']
    }
    
    for (const [category, keywords] of Object.entries(categoryKeywords)) {
      if (keywords.some(keyword => lowerQuestion.includes(keyword))) {
        return category
      }
    }
    
    return 'OTHER'
  }

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

    // Step 4: Validate question with AI if not already done
    if (!validationResult) {
      const isValid = await validateQuestion()
      if (!isValid) {
        setError("Please validate your question first")
        return
      }
    }

    // Step 5: Check if validation passed
    if (validationResult && !validationResult.valid) {
      setError(`Question validation failed: ${validationResult.reason}`)
      return
    }

    // Step 6: Validate end date/time
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

    // Step 7: Validate liquidity amounts
    const yesAmount = parseFloat(initialYes)
    const noAmount = parseFloat(initialNo)

    if (yesAmount <= 0 || noAmount <= 0) {
      setError("Both YES and NO liquidity must be greater than 0")
      return
    }

    if (totalLiquidity < 0.01) {
      setError(`Total liquidity must be at least 0.01 ${paymentToken}`)
      return
    }

    // Step 8: Proceed with market creation
    setIsProcessing(true)
    setError(null)
    setTxHash(null)

    try {
      const endTimeUnix = Math.floor(endDateTime.getTime() / 1000)

      let marketId: number

      if (paymentToken === "BNB") {
        marketId = await bnbHook.createMarket({
          question,
          category: validationResult?.category || "GENERAL",
          endTime: endTimeUnix,
          initialYes,
          initialNo,
        })
      } else {
        marketId = await pdxHook.createMarketWithPDX({
          question,
          category: validationResult?.category || "GENERAL",
          endTime: endTimeUnix,
          initialYes,
          initialNo,
        })
      }

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

  // Clear validation when question changes
  const handleQuestionChange = (value: string) => {
    setQuestion(value)
    setValidationResult(null)
    setError(null)
  }

  // Handle token switch
  const handleTokenSwitch = (token: PaymentToken) => {
    setPaymentToken(token)
    setValidationResult(null)
    setError(null)
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
      <Card className="w-full h-[90vh] overflow-scroll max-w-2xl p-6 relative my-8">
        <button 
          onClick={onClose} 
          className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
          disabled={isProcessing}
        >
          <X className="w-5 h-5" />
        </button>

        <h2 className="text-2xl font-bold mb-6">Create Prediction Market</h2>

        <div className="space-y-6">
          {/* Payment Token Selection */}
          <div>
            <label className="text-sm font-medium mb-3 block">
              Payment Token <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => handleTokenSwitch("BNB")}
                className={`p-4 rounded-lg border-2 transition-all ${
                  paymentToken === "BNB"
                    ? 'border-yellow-500 bg-yellow-500/10'
                    : 'border-muted hover:border-muted-foreground/50'
                }`}
                disabled={isProcessing}
              >
                <div className="font-semibold">🔶 BNB</div>
                <div className="text-xs text-muted-foreground">Native Token</div>
              </button>
              <button
                onClick={() => handleTokenSwitch("PDX")}
                className={`p-4 rounded-lg border-2 transition-all ${
                  paymentToken === "PDX"
                    ? 'border-purple-500 bg-purple-500/10'
                    : 'border-muted hover:border-muted-foreground/50'
                }`}
                disabled={isProcessing}
              >
                <div className="font-semibold">PDX</div>
                <div className="text-xs text-muted-foreground">ERC-20 Token</div>
              </button>
            </div>
            {paymentToken === "PDX" && (
              <div className="mt-3 p-3 bg-purple-950/20 border border-purple-600/50 rounded-lg text-sm text-purple-300">
                ℹ️ You'll need to approve PDX transfer before creating the market
              </div>
            )}
            {paymentToken === "BNB" && (
              <div className="mt-3 p-3 bg-yellow-950/20 border border-yellow-600/50 rounded-lg text-sm text-yellow-300">
                ℹ️ Market will be funded with BNB from your wallet
              </div>
            )}
          </div>

          {/* Question Section */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium">
                Market Question <span className="text-red-500">*</span>
              </label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={validateQuestion}
                disabled={isValidating || !question || question.length < 10 || !endDate || !endTime}
              >
                {isValidating ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Shield className="w-4 h-4 mr-2" />
                )}
                {isValidating ? "Validating..." : "Validate with AI"}
              </Button>
            </div>
            <Textarea
              placeholder="Will Bitcoin reach $100k by end of 2024?"
              value={question}
              onChange={(e) => handleQuestionChange(e.target.value)}
              className="min-h-[100px]"
              maxLength={280}
              disabled={isProcessing}
            />
            <div className="text-xs text-muted-foreground mt-1 text-right">
              {question.length}/280 characters
            </div>
          </div>

          {/* Validation Result */}
          {validationResult && (
            <div className={`p-3 rounded-lg border ${
              validationResult.valid 
                ? 'bg-green-950/20 border-green-500 text-green-400' 
                : 'bg-red-950/20 border-red-500 text-red-400'
            }`}>
              <div className="flex items-start gap-2">
                {validationResult.valid ? (
                  <Shield className="w-4 h-4 mt-0.5 flex-shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                )}
                <div>
                  <div className="font-medium">
                    {validationResult.valid ? '✓ Validation Passed' : '✗ Validation Failed'}
                    {validationResult.reason?.includes('basic validation') && ' (Basic)'}
                  </div>
                  <div className="text-sm mt-1">{validationResult.reason}</div>
                  {validationResult.valid && validationResult.category && (
                    <div className="text-sm mt-1">
                      <strong>Category:</strong> {validationResult.category}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* End Date & Time Section */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">
                End Date <span className="text-red-500">*</span>
              </label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value)
                  setValidationResult(null)
                }}
                min={minDateString}
                disabled={isProcessing}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">
                End Time <span className="text-red-500">*</span>
              </label>
              <Input
                type="time"
                value={endTime}
                onChange={(e) => {
                  setEndTime(e.target.value)
                  setValidationResult(null)
                }}
                disabled={isProcessing}
              />
            </div>
          </div>

          {/* Initial Liquidity Section */}
          <div>
            <label className="text-sm font-medium mb-2 block">
              Initial Liquidity ({paymentToken})
            </label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">YES Pool</label>
                <Input
                  type="number"
                  placeholder="0.1"
                  value={initialYes}
                  onChange={(e) => {
                    setInitialYes(e.target.value)
                    setValidationResult(null)
                  }}
                  step="0.01"
                  min="0.001"
                  disabled={isProcessing}
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">NO Pool</label>
                <Input
                  type="number"
                  placeholder="0.1"
                  value={initialNo}
                  onChange={(e) => {
                    setInitialNo(e.target.value)
                    setValidationResult(null)
                  }}
                  step="0.01"
                  min="0.001"
                  disabled={isProcessing}
                />
              </div>
            </div>

            {/* Liquidity Preview */}
            {totalLiquidity > 0 && (
              <div className="mt-4 p-4 bg-muted rounded-lg space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total Liquidity:</span>
                  <span className="font-semibold">{totalLiquidity.toFixed(4)} {paymentToken}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Initial YES Price:</span>
                  <span className="font-semibold text-green-500">{yesPercent.toFixed(1)}%</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Initial NO Price:</span>
                  <span className="font-semibold text-red-500">{noPercent.toFixed(1)}%</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">YES Multiplier:</span>
                  <span className="font-semibold text-green-500">
                    {yesPercent > 0 ? (100 / yesPercent).toFixed(2) : '∞'}x
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">NO Multiplier:</span>
                  <span className="font-semibold text-red-500">
                    {noPercent > 0 ? (100 / noPercent).toFixed(2) : '∞'}x
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Info Box */}
          <div className="p-4 bg-blue-950/20 border border-blue-500 rounded-lg">
            <h3 className="font-semibold text-blue-400 mb-2">How it works:</h3>
            <ul className="text-sm text-blue-300 space-y-1 list-disc list-inside">
              <li>Choose to pay with BNB or PDX token</li>
              <li>Questions are validated by AI to ensure quality and clarity</li>
              <li>You'll provide initial liquidity to start the market</li>
              <li>The ratio of YES/NO liquidity sets the initial odds and multipliers</li>
              <li>You'll receive LP tokens representing your liquidity share</li>
              <li>Traders pay fees that go to liquidity providers</li>
              <li>Markets are automatically resolved by AI after the end time</li>
            </ul>
          </div>

          {/* Error Display */}
          {error && (
            <div className="p-3 bg-red-950/20 border border-red-500 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Success Display */}
          {txHash && (
            <div className="p-3 bg-green-950/20 border border-green-500 rounded-lg text-green-400 text-sm">
              ✅ Market created successfully! Redirecting...
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button 
              onClick={onClose} 
              variant="outline" 
              className="flex-1" 
              disabled={isProcessing}
            >
              Cancel
            </Button>
            
            {!account ? (
              <Button 
                onClick={connectWallet} 
                className="flex-1" 
                disabled={isConnecting}
              >
                {isConnecting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 mr-2" />
                    Connect Wallet
                  </>
                )}
              </Button>
            ) : !isCorrectNetwork ? (
              <Button 
                onClick={switchNetwork} 
                className="flex-1" 
                variant="destructive"
              >
                Switch to BSC Testnet
              </Button>
            ) : !isContractReady ? (
              <Button 
                disabled 
                className="flex-1"
                variant="outline"
              >
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Loading Contract...
              </Button>
            ) : (
              <Button 
                onClick={handleCreate} 
                className="flex-1 bg-white text-black" 
                disabled={Boolean(isProcessing || isLoading || (validationResult && !validationResult.valid))}
              >
                {isProcessing || isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 mr-2" />
                    Create {paymentToken} Market
                  </>
                )}
              </Button>
            )}
          </div>

          {/* Wallet Info */}
          {account && (
            <div className="text-center text-xs text-muted-foreground">
              Connected: {account.slice(0, 6)}...{account.slice(-4)}
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}