import { useState, useEffect, useCallback, useRef } from 'react'

interface BNBPriceData {
    price: number | null
    isLoading: boolean
    error: string | null
    lastUpdated: number | null
}

// Cache for BNB price (shared across all hook instances)
let cachedPrice: number | null = null
let cacheTimestamp: number | null = null
const CACHE_DURATION = 60 * 1000 // 60 seconds

/**
 * Custom hook to fetch and cache BNB/USD price from CoinGecko API
 * 
 * Features:
 * - Fetches current BNB price in USD
 * - Caches price for 60 seconds to avoid rate limits
 * - Auto-refreshes price in background
 * - Provides loading and error states
 * 
 * @param autoRefresh - Whether to automatically refresh price (default: true)
 * @param refreshInterval - How often to refresh in milliseconds (default: 60000)
 */
export function useBNBPrice(autoRefresh = true, refreshInterval = 60000): BNBPriceData {
    const [price, setPrice] = useState<number | null>(cachedPrice)
    const [isLoading, setIsLoading] = useState<boolean>(!cachedPrice)
    const [error, setError] = useState<string | null>(null)
    const [lastUpdated, setLastUpdated] = useState<number | null>(cacheTimestamp)
    const isMountedRef = useRef(true)

    const fetchBNBPrice = useCallback(async (forceRefresh = false) => {
        // Check cache first
        const now = Date.now()
        if (!forceRefresh && cachedPrice && cacheTimestamp && (now - cacheTimestamp < CACHE_DURATION)) {
            // Use cached price
            if (isMountedRef.current) {
                setPrice(cachedPrice)
                setLastUpdated(cacheTimestamp)
                setIsLoading(false)
                setError(null)
            }
            return
        }

        // Fetch fresh price
        if (isMountedRef.current) {
            setIsLoading(true)
            setError(null)
        }

        try {
            const response = await fetch(
                'https://api.coingecko.com/api/v3/simple/price?ids=binancecoin&vs_currencies=usd',
                {
                    method: 'GET',
                    headers: {
                        'Accept': 'application/json',
                    },
                }
            )

            if (!response.ok) {
                throw new Error(`CoinGecko API error: ${response.status} ${response.statusText}`)
            }

            const data = await response.json()

            if (!data.binancecoin || typeof data.binancecoin.usd !== 'number') {
                throw new Error('Invalid response format from CoinGecko API')
            }

            const newPrice = data.binancecoin.usd
            const timestamp = Date.now()

            // Update cache
            cachedPrice = newPrice
            cacheTimestamp = timestamp

            if (isMountedRef.current) {
                setPrice(newPrice)
                setLastUpdated(timestamp)
                setIsLoading(false)
                setError(null)
            }

        } catch (err: any) {
            console.error('Failed to fetch BNB price:', err)

            if (isMountedRef.current) {
                setError(err.message || 'Failed to fetch BNB price')
                setIsLoading(false)

                // If we have a cached price, keep using it despite the error
                if (cachedPrice) {
                    setPrice(cachedPrice)
                    setLastUpdated(cacheTimestamp)
                }
            }
        }
    }, [])

    // Initial fetch
    useEffect(() => {
        isMountedRef.current = true
        fetchBNBPrice()

        return () => {
            isMountedRef.current = false
        }
    }, [fetchBNBPrice])

    // Auto-refresh price at specified interval
    useEffect(() => {
        if (!autoRefresh) return

        const intervalId = setInterval(() => {
            fetchBNBPrice(true)
        }, refreshInterval)

        return () => {
            clearInterval(intervalId)
        }
    }, [autoRefresh, refreshInterval, fetchBNBPrice])

    return {
        price,
        isLoading,
        error,
        lastUpdated,
    }
}

/**
 * Helper hook that returns just the price value (or null)
 * Useful when you only need the price and don't care about loading/error states
 */
export function useBNBPriceValue(): number | null {
    const { price } = useBNBPrice()
    return price
}

/**
 * Get the current cached price without subscribing to updates
 * Returns null if price hasn't been fetched yet
 */
export function getCachedBNBPrice(): number | null {
    return cachedPrice
}
