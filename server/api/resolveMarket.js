const OpenAI = require('openai');

// Initialize OpenAI client lazily
let openai;

function getOpenAI() {
    if (!openai) {
        if (!process.env.OPEN_AI_API_KEY) {
            throw new Error('OPEN_AI_API_KEY is not set');
        }
        openai = new OpenAI({
            apiKey: process.env.OPEN_AI_API_KEY,
        });
    }
    return openai;
}

/**
 * Fetch real-time cryptocurrency price data from CoinGecko
 */
async function getCryptoPriceData(symbol, timeRange) {
    try {
        // Map common symbols to CoinGecko IDs
        const symbolMap = {
            'btc': 'bitcoin',
            'bitcoin': 'bitcoin',
            'eth': 'ethereum',
            'ethereum': 'ethereum',
            'bnb': 'binancecoin',
            'sol': 'solana',
            'ada': 'cardano',
            'doge': 'dogecoin'
        };

        const coinId = symbolMap[symbol.toLowerCase()] || symbol.toLowerCase();

        // Get current price
        const currentPriceUrl = `https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=usd&include_24hr_change=true&include_last_updated_at=true`;
        const currentResponse = await fetch(currentPriceUrl);

        if (!currentResponse.ok) {
            throw new Error(`CoinGecko API error: ${currentResponse.status}`);
        }

        const currentData = await currentResponse.json();

        if (!currentData[coinId]) {
            throw new Error(`Cryptocurrency ${symbol} not found`);
        }

        const result = {
            symbol: symbol.toUpperCase(),
            coinId: coinId,
            currentPrice: currentData[coinId].usd,
            change24h: currentData[coinId].usd_24h_change,
            lastUpdated: new Date(currentData[coinId].last_updated_at * 1000).toISOString(),
            historicalData: null
        };

        // If timeRange is provided, get historical data
        if (timeRange) {
            const days = timeRange === '24h' ? 1 : timeRange === '7d' ? 7 : 30;
            const histUrl = `https://api.coingecko.com/api/v3/coins/${coinId}/market_chart?vs_currency=usd&days=${days}&interval=hourly`;
            const histResponse = await fetch(histUrl);

            if (histResponse.ok) {
                const histData = await histResponse.json();
                result.historicalData = {
                    prices: histData.prices,
                    timeRange: timeRange,
                    highPrice: Math.max(...histData.prices.map(p => p[1])),
                    lowPrice: Math.min(...histData.prices.map(p => p[1])),
                    avgPrice: histData.prices.reduce((sum, p) => sum + p[1], 0) / histData.prices.length
                };
            }
        }

        return result;
    } catch (error) {
        console.error('CoinGecko API error:', error);
        return null;
    }
}

/**
 * AI-powered market resolution endpoint
 * Determines the outcome of a prediction market question
 */
async function resolveMarketWithAI({ question, endTime, marketId }) {
    try {
        console.log(`🤖 Resolving market ${marketId}: "${question}"`);

        const currentDate = new Date();
        const marketEndDate = new Date(endTime * 1000);

        // Check if question is about cryptocurrency prices
        let cryptoData = null;
        const cryptoRegex = /(btc|bitcoin|eth|ethereum|bnb|sol|solana|ada|cardano|doge|dogecoin)/i;
        const priceRegex = /(\$[\d,]+|price|above|below|between)/i;

        if (cryptoRegex.test(question) && priceRegex.test(question)) {
            const match = question.match(cryptoRegex);
            if (match) {
                const symbol = match[1];
                console.log(`📊 Detected crypto price question for ${symbol.toUpperCase()}`);

                // Determine time range based on question
                const timeRange = question.match(/hour/i) ? '24h' : question.match(/day|daily/i) ? '7d' : '24h';

                cryptoData = await getCryptoPriceData(symbol, timeRange);

                if (cryptoData) {
                    console.log(`💰 Current ${symbol.toUpperCase()} price: $${cryptoData.currentPrice}`);
                    if (cryptoData.historicalData) {
                        console.log(`📈 24h High: $${cryptoData.historicalData.highPrice.toFixed(2)}, Low: $${cryptoData.historicalData.lowPrice.toFixed(2)}`);
                    }
                }
            }
        }

        // System prompt for resolution
        const systemPrompt = `You are an AI oracle that resolves prediction market questions with EXTREME ACCURACY.

Your job is to determine if a prediction market question resolved to YES or NO based on FACTUAL EVIDENCE.

CRITICAL RULES:
1. Only use information available as of ${currentDate.toISOString()}
2. The market ended on ${marketEndDate.toISOString()}
3. Search your knowledge base for factual information
4. If the outcome is UNCLEAR or UNKNOWN, return confidence = 0
5. Only return high confidence (70%+) if you have CLEAR EVIDENCE
6. Provide specific sources and reasoning

OUTCOME VALUES:
- 1 = YES (the event happened / statement is true)
- 2 = NO (the event did not happen / statement is false)
- null = UNCLEAR (cannot determine with confidence)

RESPONSE FORMAT (JSON only):
{
  "outcome": 1 or 2 or null,
  "confidence": 0-100,
  "reason": "detailed explanation",
  "sources": ["source1", "source2"],
  "evidence": "specific facts supporting the outcome",
  "resolvedAt": "ISO timestamp"
}`;

        // Add crypto price data to prompt if available
        let dataSection = '';
        if (cryptoData) {
            dataSection = `\n\nREAL-TIME CRYPTOCURRENCY DATA (from CoinGecko API):
Symbol: ${cryptoData.symbol}
Current Price: $${cryptoData.currentPrice.toFixed(2)}
24h Change: ${cryptoData.change24h?.toFixed(2)}%
Last Updated: ${cryptoData.lastUpdated}`;

            if (cryptoData.historicalData) {
                dataSection += `\n\nHISTORICAL DATA (${cryptoData.historicalData.timeRange}):
Highest Price: $${cryptoData.historicalData.highPrice.toFixed(2)}
Lowest Price: $${cryptoData.historicalData.lowPrice.toFixed(2)}
Average Price: $${cryptoData.historicalData.avgPrice.toFixed(2)}

Use this real-time data to accurately determine if the price conditions in the question were met.`;
            }
        }

        const userPrompt = `Resolve this prediction market question:

Question: "${question}"
Market End Date: ${marketEndDate.toDateString()}
Current Date: ${currentDate.toDateString()}${dataSection}

ANALYSIS REQUIRED:
1. What is the question asking?
2. What evidence exists about this event/outcome? ${cryptoData ? '(Use the REAL-TIME DATA provided above)' : ''}
3. Did the event happen by the market end date?
4. What is the clear outcome: YES or NO?
5. How confident are you (0-100%)?
6. What sources support this conclusion?

If you cannot determine the outcome with at least 70% confidence, return confidence = 0.

Provide a detailed, factual analysis with specific evidence.`;

        console.log('Calling OpenAI for market resolution...');

        const response = await getOpenAI().chat.completions.create({
            model: "gpt-4o",
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt }
            ],
            max_tokens: 1000,
            temperature: 0.1,
            response_format: { type: "json_object" }
        });

        if (!response.choices || !response.choices[0] || !response.choices[0].message) {
            throw new Error('Invalid OpenAI response format');
        }

        const aiText = response.choices[0].message.content;
        console.log('OpenAI resolution response:', aiText);

        let result;
        try {
            result = JSON.parse(aiText);
        } catch (parseError) {
            console.error('JSON parse error:', parseError);
            return {
                success: false,
                outcome: null,
                confidence: 0,
                reason: 'Failed to parse AI response',
                sources: [],
                evidence: '',
                resolvedAt: new Date().toISOString(),
                apiError: true
            };
        }

        // Validate outcome
        if (result.outcome !== null && result.outcome !== 1 && result.outcome !== 2) {
            console.warn('Invalid outcome value, setting to null');
            result.outcome = null;
            result.confidence = 0;
        }

        // Ensure confidence is a number
        result.confidence = parseInt(result.confidence) || 0;

        console.log(`✅ Resolution complete: Outcome=${result.outcome}, Confidence=${result.confidence}%`);

        return {
            success: true,
            outcome: result.outcome,
            confidence: result.confidence,
            reason: result.reason || 'AI resolution completed',
            sources: result.sources || [],
            evidence: result.evidence || '',
            resolvedAt: result.resolvedAt || new Date().toISOString(),
            apiError: false
        };

    } catch (error) {
        console.error('AI resolution error:', error);

        return {
            success: false,
            outcome: null,
            confidence: 0,
            reason: 'AI resolution service temporarily unavailable',
            sources: [],
            evidence: '',
            resolvedAt: new Date().toISOString(),
            apiError: true,
            error: error.message
        };
    }
}

/**
 * Main handler for Vercel serverless function
 */
module.exports = async (req, res) => {
    // CORS headers
    const allowedOrigins = [
        'https://sigma-predection.vercel.app',
        'https://gopredix.vercel.app',
        'https://sigma-prediction.vercel.app',
        'https://www.gopredix.xyz',
        'http://localhost:3000',
        'http://localhost:3001'
    ];

    const origin = req.headers.origin;
    if (allowedOrigins.includes(origin) || !origin) {
        res.setHeader('Access-Control-Allow-Origin', origin || '*');
    }

    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Credentials', 'true');

    // Handle preflight
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // Only allow POST
    if (req.method !== 'POST') {
        return res.status(405).json({
            success: false,
            reason: 'Method not allowed. Use POST.',
            apiError: false
        });
    }

    try {
        console.log('Resolution request received:', req.body);

        const { question, endTime, marketId } = req.body;

        // Input validation
        if (!question || typeof question !== 'string' || question.trim().length === 0) {
            return res.status(400).json({
                success: false,
                reason: 'Valid question string is required',
                apiError: false
            });
        }

        if (!endTime || isNaN(parseInt(endTime))) {
            return res.status(400).json({
                success: false,
                reason: 'Valid endTime timestamp is required',
                apiError: false
            });
        }

        // Check if market has actually ended
        const currentTime = Math.floor(Date.now() / 1000);
        const endTimeNum = parseInt(endTime);

        if (currentTime < endTimeNum) {
            return res.status(400).json({
                success: false,
                reason: 'Market has not ended yet',
                apiError: false
            });
        }

        console.log('Input validation passed, calling AI resolver...');

        // Call AI resolution
        const resolution = await resolveMarketWithAI({
            question: question.trim(),
            endTime: endTimeNum,
            marketId: marketId || 'unknown'
        });

        console.log('Resolution result:', resolution);

        return res.status(200).json(resolution);

    } catch (error) {
        console.error('Resolution endpoint error:', error);

        return res.status(500).json({
            success: false,
            outcome: null,
            confidence: 0,
            reason: 'Internal server error during resolution',
            sources: [],
            evidence: '',
            resolvedAt: new Date().toISOString(),
            apiError: true,
            error: error.message
        });
    }
};
