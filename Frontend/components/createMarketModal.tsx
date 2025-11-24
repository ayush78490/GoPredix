"use client"

import { useState } from "react"
import { X, Loader2, Plus, Shield, AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { ConnectButton } from "@rainbow-me/rainbowkit"
import { useAccount, useChainId, useWalletClient } from "wagmi"

import { usePredictionMarketBNB } from "@/hooks/use-predection-market"
import { usePredictionMarketPDX } from "@/hooks/use-prediction-market-pdx"

const TWITTER_HANDLE = "your_twitter_handle"
const BSC_TESTNET_CHAIN_ID = 97

const createTweetMessage = (question: string, marketUrl: string) => {
  return `Predict on: "${question}"\nCheck it out at ${marketUrl}\nTagging @${TWITTER_HANDLE}`
}

const handleTweet = (question: string, marketUrl: string) => {
  const tweetText = encodeURIComponent(createTweetMessage(question, marketUrl))
  const tweetIntentUrl = `https://twitter.com/intent/tweet?text=${tweetText}`
  window.open(tweetIntentUrl, "_blank")
}

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
  const [marketUrl, setMarketUrl] = useState<string | null>(null)
  const [showTweetPopup, setShowTweetPopup] = useState(false)

  // Wagmi hooks for wallet state
  const { address: account, isConnected } = useAccount()
  const chainId = useChainId()
  const { data: walletClient } = useWalletClient()
  
  const isCorrectNetwork = chainId === BSC_TESTNET_CHAIN_ID
  const canTransact = isConnected && isCorrectNetwork && !!walletClient

  // Get both hooks
  const bnbHook = usePredictionMarketBNB()
  const pdxHook = usePredictionMarketPDX()

  // Use appropriate hook based on payment token
  const currentHook = paymentToken === "BNB" ? bnbHook : pdxHook
  const { isLoading, isContractReady } = currentHook
  
  // Contract is ready only if wallet can transact
  const isFullyReady = isContractReady && canTransact

  // Calculate liquidity preview
  const totalLiquidity = parseFloat(initialYes || "0") + parseFloat(initialNo || "0")
  const yesPercent = totalLiquidity > 0 ? (parseFloat(initialYes || "0") / totalLiquidity) * 100 : 50
  const noPercent = 100 - yesPercent

  // Validate question with AI
  const validateQuestion = async () => {
  // Clear previous states
  setError(null)
  setValidationResult(null)

  // Basic input validation
  if (!question || question.trim().length === 0) {
    setError("Question is required")
    return false
  }

  if (question.trim().length < 10) {
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

  // Date validation with detailed debugging
  let endDateTime
  let endTimeUnix
  try {
    endDateTime = new Date(`${endDate}T${endTime}:00`)
    
    // Debug date parsing
    console.log('📅 Date Validation Debug:', {
      input: `${endDate}T${endTime}:00`,
      parsedDate: endDateTime.toString(),
      parsedISO: endDateTime.toISOString(),
      parsedTimestamp: endDateTime.getTime()
    })

    if (isNaN(endDateTime.getTime())) {
      setError("Invalid date or time format")
      return false
    }

    endTimeUnix = Math.floor(endDateTime.getTime() / 1000)

    // Validate end time is at least 1 hour from now
    const now = new Date()
    const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000)
    
    console.log('⏰ Time Comparison Debug:', {
      now: now.toString(),
      nowTimestamp: now.getTime(),
      oneHourFromNow: oneHourFromNow.toString(),
      endDateTime: endDateTime.toString(),
      timeDifferenceMs: endDateTime.getTime() - now.getTime(),
      timeDifferenceHours: (endDateTime.getTime() - now.getTime()) / (1000 * 60 * 60),
      isValid: endDateTime > oneHourFromNow
    })

    if (endDateTime <= oneHourFromNow) {
      setError(`End time must be at least 1 hour from now. Selected: ${endDateTime.toLocaleString()}`)
      return false
    }

    // Validate it's not too far in future (optional safety check)
    const oneYearFromNow = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000)
    if (endDateTime > oneYearFromNow) {
      setError("End time cannot be more than 1 year from now")
      return false
    }

  } catch (dateError) {
    console.error('❌ Date parsing error:', dateError)
    setError("Invalid date format. Please check your date and time.")
    return false
  }

  // Liquidity validation
  try {
    const yesAmount = parseFloat(initialYes)
    const noAmount = parseFloat(initialNo)
    const totalLiquidity = yesAmount + noAmount

    if (isNaN(yesAmount) || isNaN(noAmount)) {
      setError("Invalid liquidity amounts")
      return false
    }

    if (yesAmount <= 0 || noAmount <= 0) {
      setError("Both YES and NO liquidity must be greater than 0")
      return false
    }

    if (totalLiquidity < 0.01) {
      setError(`Total liquidity must be at least 0.01 ${paymentToken}`)
      return false
    }

    // Validate reasonable maximum (optional)
    if (totalLiquidity > 1000) {
      setError(`Total liquidity cannot exceed 1000 ${paymentToken}`)
      return false
    }

  } catch (liquidityError) {
    console.error('❌ Liquidity validation error:', liquidityError)
    setError("Invalid liquidity values")
    return false
  }

  // AI Validation
  setIsValidating(true)

  try {
    console.log('🔄 Starting AI validation with:', {
      question: question.trim(),
      endTime: endTimeUnix,
      initialYes,
      initialNo,
      timestamp: new Date().toISOString()
    })

    const requestBody = {
      question: question.trim(),
      endTime: endTimeUnix,
      initialYes,
      initialNo
    }

    console.log('📤 Sending request to validation API...')
    
    const response = await fetch('https://sigma-predection.vercel.app/api/validateMarket', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
      // Add timeout
      signal: AbortSignal.timeout(30000) // 30 second timeout
    })

    console.log('📨 Response received:', {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok
    })

    if (!response.ok) {
      let errorDetail = `HTTP ${response.status}`
      
      try {
        const errorData = await response.json()
        errorDetail += ` - ${errorData.reason || errorData.error || JSON.stringify(errorData)}`
      } catch (parseError) {
        const errorText = await response.text()
        errorDetail += ` - ${errorText || response.statusText}`
      }
      
      throw new Error(`Validation API error: ${errorDetail}`)
    }

    const validation = await response.json()
    console.log('✅ Validation API response:', validation)

    // Validate response structure
    if (typeof validation.valid !== 'boolean') {
      console.warn('⚠️ Invalid validation response structure:', validation)
      throw new Error('Invalid response from validation service')
    }

    setValidationResult(validation)
    
    if (!validation.valid) {
      console.log('❌ Question rejected by AI validation:', validation.reason)
    } else {
      console.log('✅ Question approved by AI validation')
    }

    return validation.valid

  } catch (err: any) {
    console.error('❌ AI validation error details:', {
      name: err.name,
      message: err.message,
      stack: err.stack
    })

    // Handle different error types
    if (err.name === 'AbortError' || err.name === 'TimeoutError') {
      setError("Validation request timed out. Please try again.")
    } else if (err.message.includes('Failed to fetch') || err.message.includes('NetworkError')) {
      setError("Network error. Please check your connection and try again.")
    } else if (err.message.includes('HTTP 5')) {
      setError("Validation service is temporarily unavailable. Please try again in a moment.")
    } else {
      setError(`Validation error: ${err.message}`)
    }

    // Fallback to basic validation
    console.log('🔄 Falling back to basic validation...')
    const basicValidation = performBasicValidation(question, endTimeUnix, initialYes, initialNo)
    setValidationResult(basicValidation)

    if (!basicValidation.valid) {
      console.log('❌ Basic validation also failed:', basicValidation.reason)
      // Don't override the original error if basic validation also fails
      if (!err.message.includes('HTTP 5')) {
        setError(`AI validation failed and basic validation rejected: ${basicValidation.reason}`)
      }
      return false
    } else {
      console.log('✅ Basic validation passed, proceeding with caution')
      // If AI failed but basic passed, we can proceed with warning
      setError("AI validation unavailable, but question passes basic checks. You may proceed.")
      return true
    }

  } finally {
    setIsValidating(false)
  }
}

// Enhanced basic validation fallback
const performBasicValidation = (question: string, endTime: number, initialYes: string, initialNo: string): ValidationResult => {
  console.log('🔄 Running basic validation...')
  
  const trimmedQuestion = question.trim()
  
  // Question structure validation
  if (!trimmedQuestion.includes('?')) {
    return {
      valid: false,
      reason: 'Question must end with a question mark',
      category: 'OTHER'
    }
  }

  if (trimmedQuestion.length < 10) {
    return {
      valid: false,
      reason: 'Question must be at least 10 characters long',
      category: 'OTHER'
    }
  }

  if (trimmedQuestion.length > 280) {
    return {
      valid: false,
      reason: 'Question must be less than 280 characters',
      category: 'OTHER'
    }
  }

  // Check for multiple questions
  if ((trimmedQuestion.match(/\?/g) || []).length > 1) {
    return {
      valid: false,
      reason: 'Please ask only one question per market',
      category: 'OTHER'
    }
  }

  // Subjective/ambiguous language patterns
  const invalidPatterns = [
    { pattern: /\b(opinion|think|believe|feel|probably|maybe)\b/i, reason: 'Avoid subjective language like "think" or "believe"' },
    { pattern: /\b(subjective|arbitrary|pointless)\b/i, reason: 'Question should be objective and verifiable' },
    { pattern: /\?.*\?/, reason: 'Multiple questions detected' },
    { pattern: /\b(and|or)\b.*\?.*\b(and|or)\b/i, reason: 'Avoid complex "and/or" questions' },
    { pattern: /\b(should|ought to)\b/i, reason: 'Avoid normative language like "should"' },
    { pattern: /\b(best|worst|better|worse)\b.*\?/i, reason: 'Avoid comparative language without clear criteria' }
  ]

  for (const { pattern, reason } of invalidPatterns) {
    if (pattern.test(trimmedQuestion)) {
      return {
        valid: false,
        reason,
        category: 'OTHER'
      }
    }
  }

  // Check for past tense (historical events)
  const pastTensePatterns = [
    /\b(did|was|were|had|happened|occurred)\b.*\?/i,
    /\b(in|during)\s+(202[0-3]|2024\b)/, // Past years
    /\b(last\s+(year|month|week))\b/i
  ]

  for (const pattern of pastTensePatterns) {
    if (pattern.test(trimmedQuestion)) {
      return {
        valid: false,
        reason: 'Questions about past events are not allowed',
        category: 'OTHER'
      }
    }
  }

  const category = determineCategory(trimmedQuestion)

  return {
    valid: true,
    reason: 'Passes basic validation checks',
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
    // Validation checks
    if (!isConnected) {
      setError("Please connect your wallet first")
      return
    }

    if (!isCorrectNetwork) {
      setError("Please switch to BSC Testnet (Chain ID 97)")
      return
    }

    if (!walletClient) {
      setError("Wallet provider not ready. Please try reconnecting.")
      return
    }

    // Check contract readiness
    if (!isFullyReady) {
      setError("Contract not ready. Please wait or refresh the page.")
      return
    }

    // Validate question with AI if not already done
    if (!validationResult) {
      const isValid = await validateQuestion()
      if (!isValid) {
        setError("Please validate your question first")
        return
      }
    }

    if (validationResult && !validationResult.valid) {
      setError(`Question validation failed: ${validationResult.reason}`)
      return
    }

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
        // Check PDX balance before creating market
        const totalRequired = (parseFloat(initialYes) + parseFloat(initialNo)).toFixed(4)
        console.log('🔍 Checking PDX balance before market creation...')
        
        if (pdxHook.checkPDXBalance) {
          const balanceCheck = await pdxHook.checkPDXBalance(totalRequired)
          console.log('Balance check result:', balanceCheck)
          
          if (!balanceCheck.hasBalance) {
            setError(`Insufficient PDX balance. You have ${balanceCheck.currentBalance} PDX but need ${balanceCheck.required} PDX to create this market.`)
            return
          }
        }

        marketId = await pdxHook.createMarketWithPDX({
          question,
          category: validationResult?.category || "GENERAL",
          endTime: endTimeUnix,
          initialYes,
          initialNo,
        })
      }

      const newMarketUrl = `https://www.gopredix.xyz/markets/${marketId}`
      setMarketUrl(newMarketUrl)
      setShowTweetPopup(true)

      if (onSuccess) {
        onSuccess(marketId)
      }
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
                <div className="font-semibold">💜 PDX</div>
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

          {/* Connection Status Info */}
          {!canTransact && (
            <div className="p-3 bg-yellow-950/20 border border-yellow-600/50 rounded-lg text-sm text-yellow-300">
              {!isConnected ? (
                "⚠️ Please connect your wallet to create a market"
              ) : !isCorrectNetwork ? (
                "⚠️ Please switch to BSC Testnet to create a market"
              ) : !walletClient ? (
                "⚠️ Wallet provider not ready. Please try reconnecting."
              ) : (
                "⚠️ Connecting to contracts..."
              )}
            </div>
          )}

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

          {/* Action Buttons using RainbowKit ConnectButton.Custom */}
          <div className="flex gap-3">
            <Button 
              onClick={onClose} 
              variant="outline" 
              className="flex-1" 
              disabled={isProcessing}
            >
              Cancel
            </Button>

            <ConnectButton.Custom>
              {({
                account: cbAccount,
                chain,
                openAccountModal,
                openChainModal,
                openConnectModal,
                authenticationStatus,
                mounted,
              }) => {
                const ready = mounted && authenticationStatus !== 'loading'
                const connected = ready && cbAccount && chain && (!authenticationStatus || authenticationStatus === 'authenticated')
                const wrongNetwork = connected && chain?.id !== BSC_TESTNET_CHAIN_ID

                if (!connected) {
                  return (
                    <Button
                      onClick={openConnectModal}
                      className="flex-1"
                      disabled={!ready}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Connect Wallet
                    </Button>
                  )
                }

                if (wrongNetwork) {
                  return (
                    <Button
                      onClick={openChainModal}
                      className="flex-1"
                      variant="destructive"
                    >
                      Switch to BSC Testnet
                    </Button>
                  )
                }

                if (!isContractReady) {
                  return (
                    <Button 
                      disabled 
                      className="flex-1"
                      variant="outline"
                    >
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {!canTransact ? "Checking Wallet..." : "Loading Contract..."}
                    </Button>
                  )
                }

                return (
                  <Button 
                    onClick={handleCreate} 
                    className="flex-1 bg-white text-black hover:bg-white/90" 
                    disabled={Boolean(isProcessing || isLoading || (validationResult && !validationResult.valid) || !canTransact)}
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
                )
              }}
            </ConnectButton.Custom>
          </div>

          {/* Wallet Info */}
          {isConnected && account && (
            <div className="text-center text-xs text-muted-foreground space-y-1">
              <div>
                Connected: {account.slice(0, 6)}...{account.slice(-4)}
              </div>
              {!isCorrectNetwork && (
                <div className="text-red-400 font-semibold">
                  ⚠️ Wrong Network - Switch to BSC Testnet
                </div>
              )}
              {!walletClient && isCorrectNetwork && (
                <div className="text-yellow-400">
                  ⚠️ Wallet provider not ready
                </div>
              )}
              {canTransact && !isFullyReady && (
                <div className="text-blue-400">
                  <Loader2 className="inline w-3 h-3 mr-1 animate-spin" />
                  Initializing {paymentToken} contracts...
                </div>
              )}
            </div>
          )}
        </div>
      </Card>

      {/* Tweet Popup - Outside Card to prevent unmounting */}
      {showTweetPopup && marketUrl && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[999]">
          <div className="bg-white dark:bg-slate-950 rounded-xl shadow-xl p-8 w-full max-w-md flex flex-col items-center">
            <h3 className="text-xl font-bold mb-4 text-center text-black dark:text-white">🎉 Market Created!</h3>
            <div className="bg-gray-100 dark:bg-slate-800 rounded-md p-4 w-full mb-4">
              <p className="text-sm font-semibold mb-2 text-black dark:text-white">Market Question:</p>
              <p className="mb-2 text-black dark:text-gray-300">{question}</p>
              <a
                href={marketUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline text-xs"
              >
                {marketUrl}
              </a>
            </div>
            <Button
              onClick={() => {
                handleTweet(question, marketUrl)
                setShowTweetPopup(false)
              }}
              className="w-full mb-2"
            >
              📢 Share on Twitter
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowTweetPopup(false)}
              className="w-full"
            >
              Close
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}