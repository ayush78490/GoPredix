/**
 * Currency conversion and formatting utilities for BNB <-> USD
 */

/**
 * Convert BNB amount to USD
 * @param bnbAmount - Amount in BNB (can be string or number)
 * @param bnbPrice - Current BNB price in USD
 * @returns USD amount as a number
 */
export function bnbToUsd(bnbAmount: string | number, bnbPrice: number): number {
    const bnb = typeof bnbAmount === 'string' ? parseFloat(bnbAmount) : bnbAmount

    if (isNaN(bnb) || bnb < 0) {
        return 0
    }

    if (bnbPrice <= 0) {
        console.warn('Invalid BNB price provided to bnbToUsd:', bnbPrice)
        return 0
    }

    return bnb * bnbPrice
}

/**
 * Convert USD amount to BNB
 * @param usdAmount - Amount in USD (can be string or number)
 * @param bnbPrice - Current BNB price in USD
 * @returns BNB amount as a string (suitable for parseEther)
 */
export function usdToBnb(usdAmount: string | number, bnbPrice: number): string {
    const usd = typeof usdAmount === 'string' ? parseFloat(usdAmount) : usdAmount

    if (isNaN(usd) || usd < 0) {
        return '0'
    }

    if (bnbPrice <= 0) {
        console.warn('Invalid BNB price provided to usdToBnb:', bnbPrice)
        return '0'
    }

    const bnbAmount = usd / bnbPrice

    // Return with enough precision for blockchain operations (18 decimals)
    return bnbAmount.toFixed(18)
}

/**
 * Format USD amount with proper decimals and $ symbol
 * @param amount - Amount in USD
 * @param options - Formatting options
 * @returns Formatted USD string (e.g., "$1,234.56")
 */
export function formatUsd(
    amount: number,
    options: {
        showSymbol?: boolean
        decimals?: number
        compact?: boolean
    } = {}
): string {
    const {
        showSymbol = true,
        decimals = 2,
        compact = false
    } = options

    if (isNaN(amount)) {
        return showSymbol ? '$0.00' : '0.00'
    }

    // Handle very small amounts
    if (amount > 0 && amount < 0.01 && decimals === 2) {
        return showSymbol ? '<$0.01' : '<0.01'
    }

    // Compact notation for large numbers
    if (compact) {
        if (amount >= 1_000_000) {
            const millions = amount / 1_000_000
            return `${showSymbol ? '$' : ''}${millions.toFixed(2)}M`
        }
        if (amount >= 1_000) {
            const thousands = amount / 1_000
            return `${showSymbol ? '$' : ''}${thousands.toFixed(2)}K`
        }
    }

    // Format with commas and decimals
    const formatted = amount.toLocaleString('en-US', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
    })

    return showSymbol ? `$${formatted}` : formatted
}

/**
 * Convert BNB amount to USD and format in one step
 * @param bnbAmount - Amount in BNB
 * @param bnbPrice - Current BNB price in USD
 * @param options - Formatting options
 * @returns Formatted USD string
 */
export function formatBnbAsUsd(
    bnbAmount: string | number,
    bnbPrice: number,
    options?: {
        showSymbol?: boolean
        decimals?: number
        compact?: boolean
    }
): string {
    const usdAmount = bnbToUsd(bnbAmount, bnbPrice)
    return formatUsd(usdAmount, options)
}

/**
 * Format BNB amount (for helper text or transparency)
 * @param bnbAmount - Amount in BNB
 * @param decimals - Number of decimals to show (default: 4)
 * @returns Formatted BNB string (e.g., "0.0234 BNB")
 */
export function formatBnb(bnbAmount: string | number, decimals = 4): string {
    const bnb = typeof bnbAmount === 'string' ? parseFloat(bnbAmount) : bnbAmount

    if (isNaN(bnb)) {
        return '0 BNB'
    }

    // Handle very small amounts
    if (bnb > 0 && bnb < Math.pow(10, -decimals)) {
        return `<${Math.pow(10, -decimals)} BNB`
    }

    return `${bnb.toFixed(decimals)} BNB`
}

/**
 * Get smart decimal places based on amount size
 * Useful for dynamic formatting
 */
export function getSmartDecimals(amount: number): number {
    if (amount >= 1000) return 0
    if (amount >= 100) return 1
    if (amount >= 10) return 2
    if (amount >= 1) return 2
    if (amount >= 0.01) return 2
    if (amount >= 0.001) return 3
    return 4
}

/**
 * Format USD with smart decimal places
 */
export function formatUsdSmart(amount: number, showSymbol = true): string {
    const decimals = getSmartDecimals(amount)
    return formatUsd(amount, { showSymbol, decimals })
}

/**
 * Parse USD input string to number
 * Handles various input formats like "$123.45", "123.45", "$123,456.78"
 */
export function parseUsdInput(input: string): number {
    // Remove $ symbol and commas
    const cleaned = input.replace(/[$,]/g, '').trim()
    const parsed = parseFloat(cleaned)

    return isNaN(parsed) ? 0 : parsed
}

/**
 * Validate USD input
 * @param input - USD input string
 * @param min - Minimum allowed value
 * @param max - Maximum allowed value
 * @returns Validation result with error message if invalid
 */
export function validateUsdInput(
    input: string,
    min = 0,
    max = Infinity
): { valid: boolean; error?: string; value: number } {
    const value = parseUsdInput(input)

    if (isNaN(value)) {
        return { valid: false, error: 'Invalid amount', value: 0 }
    }

    if (value < min) {
        return { valid: false, error: `Minimum amount is ${formatUsd(min)}`, value }
    }

    if (value > max) {
        return { valid: false, error: `Maximum amount is ${formatUsd(max)}`, value }
    }

    return { valid: true, value }
}
