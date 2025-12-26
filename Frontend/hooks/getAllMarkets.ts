import { useState, useCallback, useEffect, useRef } from 'react'
import { usePredictionMarketBNB } from './use-predection-market'
import { usePredictionMarketPDX } from './use-prediction-market-pdx'

export interface UnifiedMarket {
  id: string           // Composite ID like "BNB-0" or "PDX-0"
  numericId: number    // Original numeric ID for contract calls
  creator: string
  question: string
  category: string
  endTime: number
  status: number
  outcome: number
  yesToken: string
  noToken: string
  yesPool: string
  noPool: string
  lpTotalSupply?: string
  totalBacking: string
  platformFees?: string
  resolutionRequestedAt?: number
  disputeDeadline?: number
  resolutionReason?: string
  resolutionConfidence?: number
  yesPrice: number
  noPrice: number
  yesMultiplier: number
  noMultiplier: number
  paymentToken: "BNB" | "PDX"
}

// Market status constants
const MARKET_STATUS = {
  OPEN: 0,
  CLOSED: 1,
  RESOLUTION_REQUESTED: 2,
  RESOLVED: 3,
  DISPUTED: 4
}

export function useAllMarkets() {
  const [markets, setMarkets] = useState<UnifiedMarket[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasLoaded, setHasLoaded] = useState(false)  // New: Guard for one-time initial load

  // Get both hooks
  const bnbHook = usePredictionMarketBNB()
  const pdxHook = usePredictionMarketPDX()

  // Separate function for fetching BNB market
  const fetchBNBMarket = useCallback(
    async (marketId: number): Promise<UnifiedMarket | null> => {
      try {
        const market = await bnbHook.getMarket(marketId)
        if (market) {
          return {
            ...market,
            id: `BNB-${marketId}`,
            numericId: marketId,
            yesPrice: market.yesPrice ?? 50,
            noPrice: market.noPrice ?? 50,
            yesMultiplier: market.yesMultiplier ?? 2,
            noMultiplier: market.noMultiplier ?? 2,
            paymentToken: "BNB" as const
          }
        }
        return null
      } catch (error) {
        console.error(`❌ Error fetching BNB market ${marketId}:`, error)
        return null
      }
    },
    [bnbHook]
  )

  // Separate function for fetching PDX market
  const fetchPDXMarket = useCallback(
    async (marketId: number): Promise<UnifiedMarket | null> => {
      try {
        const market = await pdxHook.getPDXMarket(marketId)
        if (market) {
          return {
            id: `PDX-${marketId}`,
            numericId: marketId,
            creator: market.creator,
            question: market.question,
            category: market.category,
            endTime: market.endTime,
            status: market.status,
            outcome: market.outcome,
            yesToken: market.yesToken,
            noToken: market.noToken,
            yesPool: market.yesPool,
            noPool: market.noPool,
            totalBacking: market.totalBacking,
            yesPrice: market.yesPrice || 50,
            noPrice: market.noPrice || 50,
            yesMultiplier: market.yesMultiplier || 2,
            noMultiplier: market.noMultiplier || 2,
            paymentToken: "PDX" as const
          }
        }
        return null
      } catch (error) {
        return null
      }
    },
    [pdxHook]
  )

  // Fetch all BNB markets by iterating through IDs
  const getAllBNBMarkets = useCallback(async (): Promise<UnifiedMarket[]> => {
    try {

      if (!bnbHook.marketContract) {
        return []
      }

      try {
        const nextMarketId = await bnbHook.marketContract.nextMarketId()
        const totalMarkets = Number(nextMarketId)


        if (totalMarkets === 0) {
          return []
        }

        const marketPromises: Promise<UnifiedMarket | null>[] = []
        for (let i = 0; i < totalMarkets; i++) {
          marketPromises.push(fetchBNBMarket(i))
        }

        const results = await Promise.all(marketPromises)
        const validMarkets = results.filter((m): m is UnifiedMarket => m !== null)

        return validMarkets
      } catch (err) {
        console.error("❌ Error iterating BNB markets:", err)
        return []
      }
    } catch (error) {
      console.error("❌ Error fetching BNB markets:", error)
      return []
    }
  }, [bnbHook, fetchBNBMarket])

  // Fetch all PDX markets by iterating through IDs
  const getAllPDXMarkets = useCallback(async (): Promise<UnifiedMarket[]> => {
    try {

      if (!pdxHook.isContractReady) {
        return []
      }

      try {
        const marketIds = await pdxHook.getPDXMarketIds()


        if (marketIds.length === 0) {
          return []
        }

        // Fetch all markets in parallel using the IDs
        const marketPromises = marketIds.map(id => fetchPDXMarket(id))
        const results = await Promise.all(marketPromises)
        const validMarkets = results.filter((m): m is UnifiedMarket => m !== null)

        return validMarkets
      } catch (err) {
        console.error("❌ Error iterating PDX markets:", err)
        return []
      }
    } catch (error) {
      console.error("❌ Error fetching PDX markets:", error)
      return []
    }
  }, [pdxHook, fetchPDXMarket])

  // Fetch all markets (both BNB and PDX)
  const getAllMarkets = useCallback(async (): Promise<UnifiedMarket[]> => {
    try {

      const [bnbMarkets, pdxMarkets] = await Promise.all([
        getAllBNBMarkets(),
        getAllPDXMarkets()
      ])

      const allMarkets = [...bnbMarkets, ...pdxMarkets].sort((a, b) =>
        (b.endTime || 0) - (a.endTime || 0)
      )

      return allMarkets
    } catch (error) {
      console.error("❌ Error fetching all markets:", error)
      throw error
    }
  }, [getAllBNBMarkets, getAllPDXMarkets])

  // Load markets
  const loadMarkets = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const marketsData = await getAllMarkets()
      setMarkets(marketsData)

      // PERSIST TO LOCALSTORAGE SO DATA SURVIVES PAGE REFRESH
      try {
        localStorage.setItem('cachedMarkets_v4', JSON.stringify(marketsData))
        localStorage.setItem('marketsCacheTime_v4', Date.now().toString())
      } catch (e) {
      }

      if (marketsData.length === 0) {
        setError("No markets found on the blockchain")
      } else {
      }
    } catch (err: any) {
      console.error('Error loading markets:', err)
      setError(err.message || 'Failed to load markets from blockchain')
      setMarkets([])
    } finally {
      setIsLoading(false)
    }
  }, [getAllMarkets])

  // NEW: Ref to stable-ify loadMarkets for the effect (avoids dep chain issues)
  const loadMarketsRef = useRef(loadMarkets)
  loadMarketsRef.current = loadMarkets

  // FIXED: Load only once when contracts become ready (no dep on loadMarkets; use ref + guard)
  useEffect(() => {
    const anyReady = bnbHook.isContractReady || pdxHook.isContractReady
    if (anyReady && !hasLoaded) {
      loadMarketsRef.current().then(() => {
        setHasLoaded(true)  // Mark as loaded after success
      }).catch(() => {
        // Still mark loaded on error to avoid retry loops
        setHasLoaded(true)
      })
    }
  }, [bnbHook.isContractReady, pdxHook.isContractReady, hasLoaded])  // Only stable deps

  // NEW: Reset loaded flag if contracts become *un*ready (e.g., wallet disconnect)
  // This allows reload on reconnect without manual refresh
  useEffect(() => {
    const anyReady = bnbHook.isContractReady || pdxHook.isContractReady
    if (!anyReady) {
      setHasLoaded(false)
    }
  }, [bnbHook.isContractReady, pdxHook.isContractReady])

  // NEW: Restore cached markets on mount (BEFORE contracts load)
  useEffect(() => {
    try {
      const cached = localStorage.getItem('cachedMarkets_v4')
      if (cached) {
        const cachedMarkets = JSON.parse(cached)
        setMarkets(cachedMarkets)
      }
    } catch (e) {
    }
  }, [])

  // Refresh markets
  const refreshMarkets = useCallback(async () => {
    // Reset guard for manual refresh
    setHasLoaded(false)
    await loadMarkets()
  }, [loadMarkets])

  // Filter markets by token
  const getBNBMarkets = useCallback(() => {
    return markets.filter(m => m.paymentToken === "BNB")
  }, [markets])

  const getPDXMarkets = useCallback(() => {
    return markets.filter(m => m.paymentToken === "PDX")
  }, [markets])

  // Filter markets by status
  const getOpenMarkets = useCallback(() => {
    return markets.filter(m => m.status === MARKET_STATUS.OPEN)
  }, [markets])

  const getResolvedMarkets = useCallback(() => {
    return markets.filter(m => m.status === MARKET_STATUS.RESOLVED)
  }, [markets])

  const getResolvingMarkets = useCallback(() => {
    return markets.filter(m => m.status === MARKET_STATUS.RESOLUTION_REQUESTED)
  }, [markets])

  const getDisputedMarkets = useCallback(() => {
    return markets.filter(m => m.status === MARKET_STATUS.DISPUTED)
  }, [markets])

  // Search markets
  const searchMarkets = useCallback((query: string) => {
    const lowerQuery = query.toLowerCase()
    return markets.filter(m =>
      m.question.toLowerCase().includes(lowerQuery) ||
      m.category.toLowerCase().includes(lowerQuery)
    )
  }, [markets])

  // Get markets by creator
  const getMarketsByCreator = useCallback((creator: string) => {
    return markets.filter(m => m.creator.toLowerCase() === creator.toLowerCase())
  }, [markets])

  // Get markets by category
  const getMarketsByCategory = useCallback((category: string) => {
    return markets.filter(m => m.category.toUpperCase() === category.toUpperCase())
  }, [markets])

  // Get active markets (open and not ended)
  const getActiveMarkets = useCallback(() => {
    const now = Math.floor(Date.now() / 1000)
    return markets.filter(m =>
      m.status === MARKET_STATUS.OPEN && m.endTime > now
    )
  }, [markets])

  // Get ended but not resolved markets
  const getEndedUnresolvedMarkets = useCallback(() => {
    const now = Math.floor(Date.now() / 1000)
    return markets.filter(m =>
      m.status === MARKET_STATUS.OPEN && m.endTime <= now
    )
  }, [markets])

  return {
    // Market data
    markets,

    // Loading states
    isLoading,
    error,

    // Refresh functions
    refreshMarkets,
    loadMarkets,

    // Fetch functions (for single markets)
    getAllMarkets,
    getAllBNBMarkets,
    getAllPDXMarkets,

    // Filter functions - by token
    getBNBMarkets,
    getPDXMarkets,

    // Filter functions - by status
    getOpenMarkets,
    getResolvedMarkets,
    getResolvingMarkets,
    getDisputedMarkets,

    // Filter functions - by time
    getActiveMarkets,
    getEndedUnresolvedMarkets,

    // Filter functions - by other criteria
    searchMarkets,
    getMarketsByCreator,
    getMarketsByCategory,

    // Status
    isContractReady: bnbHook.isContractReady || pdxHook.isContractReady,
    isBNBReady: bnbHook.isContractReady,
    isPDXReady: pdxHook.isContractReady,
  }
}