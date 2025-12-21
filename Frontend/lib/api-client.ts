/**
 * API Utility with Fallback Support
 * Primary: Vercel (full features including duplicate detection)
 * Fallback: Cloudflare (fast, global edge network)
 */

const API_ENDPOINTS = {
    vercel: {
        validateMarket: 'https://sigma-predection.vercel.app/api/validateMarket',
        resolveMarket: 'https://sigma-predection.vercel.app/api/resolveMarket',
        disputeMarket: 'https://sigma-predection.vercel.app/api/disputeMarket',
    },
    cloudflare: {
        validateMarket: 'https://go-predix.tarunsingh78490.workers.dev/api/validateMarket',
        resolveMarket: 'https://go-predix.tarunsingh78490.workers.dev/api/resolveMarket',
        disputeMarket: 'https://go-predix.tarunsingh78490.workers.dev/api/disputeMarket',
    }
};

interface FetchWithFallbackOptions {
    endpoint: 'validateMarket' | 'resolveMarket' | 'disputeMarket';
    body: any;
    timeout?: number;
    skipCloudflare?: boolean;
}

interface FetchResponse {
    success: boolean;
    data: any;
    source: 'vercel' | 'cloudflare';
    error?: string;
    fallbackUsed: boolean;
}

/**
 * Fetch with automatic fallback from Vercel to Cloudflare
 * @param options - Fetch options
 * @returns Promise with response data and metadata
 */
export async function fetchWithFallback({
    endpoint,
    body,
    timeout = 10000, // 10 second timeout for Vercel
    skipCloudflare = false
}: FetchWithFallbackOptions): Promise<FetchResponse> {

    // Try Vercel first (primary)
    try {
        console.log(`🚀 [API] Calling Vercel ${endpoint}...`);

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        const response = await fetch(API_ENDPOINTS.vercel[endpoint], {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
            signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            throw new Error(`Vercel API returned ${response.status}`);
        }

        const data = await response.json();

        console.log(`✅ [API] Vercel ${endpoint} succeeded`);

        return {
            success: true,
            data,
            source: 'vercel',
            fallbackUsed: false,
        };

    } catch (vercelError: any) {
        console.warn(`⚠️ [API] Vercel ${endpoint} failed:`, vercelError.message);

        // If Cloudflare fallback is disabled, throw error
        if (skipCloudflare) {
            return {
                success: false,
                data: null,
                source: 'vercel',
                error: vercelError.message,
                fallbackUsed: false,
            };
        }

        // Try Cloudflare fallback
        try {
            console.log(`🔄 [API] Falling back to Cloudflare ${endpoint}...`);

            const fallbackResponse = await fetch(API_ENDPOINTS.cloudflare[endpoint], {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(body),
                // Cloudflare is fast, shorter timeout
                signal: AbortSignal.timeout(8000), // 8 seconds
            });

            if (!fallbackResponse.ok) {
                throw new Error(`Cloudflare API returned ${fallbackResponse.status}`);
            }

            const fallbackData = await fallbackResponse.json();

            console.log(`✅ [API] Cloudflare ${endpoint} succeeded (fallback)`);

            // Add note about duplicate checking if using validateMarket
            if (endpoint === 'validateMarket' && fallbackData.valid) {
                console.log(`ℹ️ [API] Note: Duplicate checking was skipped (Cloudflare fallback)`);
            }

            return {
                success: true,
                data: fallbackData,
                source: 'cloudflare',
                fallbackUsed: true,
            };

        } catch (cloudflareError: any) {
            console.error(`❌ [API] Both Vercel and Cloudflare failed for ${endpoint}`);

            return {
                success: false,
                data: null,
                source: 'cloudflare',
                error: `Primary and fallback APIs failed. Vercel: ${vercelError.message}, Cloudflare: ${cloudflareError.message}`,
                fallbackUsed: true,
            };
        }
    }
}

/**
 * Validate a market question
 */
export async function validateMarketAPI(
    question: string,
    endTime: number,
    initialYes: string,
    initialNo: string
) {
    return fetchWithFallback({
        endpoint: 'validateMarket',
        body: { question, endTime, initialYes, initialNo },
    });
}

/**
 * Resolve a market
 */
export async function resolveMarketAPI(
    question: string,
    endTime: number,
    marketId: string | number
) {
    return fetchWithFallback({
        endpoint: 'resolveMarket',
        body: { question, endTime, marketId },
    });
}

/**
 * Validate a dispute
 */
export async function disputeMarketAPI(
    question: string,
    disputeReason: string,
    currentResolution: string,
    currentOutcome: number,
    endTime: number,
    marketId?: string | number
) {
    return fetchWithFallback({
        endpoint: 'disputeMarket',
        body: { question, disputeReason, currentResolution, currentOutcome, endTime, marketId },
    });
}

/**
 * Get API health status
 */
export async function getAPIHealth() {
    const results = {
        vercel: { healthy: false, responseTime: 0 },
        cloudflare: { healthy: false, responseTime: 0 },
    };

    // Check Vercel
    try {
        const start = Date.now();
        const response = await fetch(API_ENDPOINTS.vercel.validateMarket, {
            method: 'OPTIONS',
            signal: AbortSignal.timeout(5000),
        });
        results.vercel.healthy = response.ok;
        results.vercel.responseTime = Date.now() - start;
    } catch (error) {
        results.vercel.healthy = false;
    }

    // Check Cloudflare
    try {
        const start = Date.now();
        const response = await fetch('https://go-predix.tarunsingh78490.workers.dev/health', {
            signal: AbortSignal.timeout(5000),
        });
        results.cloudflare.healthy = response.ok;
        results.cloudflare.responseTime = Date.now() - start;
    } catch (error) {
        results.cloudflare.healthy = false;
    }

    return results;
}
