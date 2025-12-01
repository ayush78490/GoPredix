const OpenAI = require('openai');

// Initialize OpenAI client
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
 * AI-powered market resolution endpoint
 * Determines the outcome of a prediction market question
 */
async function resolveMarketWithAI({ question, endTime, marketId }) {
    try {
        console.log(`🤖 Resolving market ${marketId}: "${question}"`);

        const currentDate = new Date();
        const marketEndDate = new Date(endTime * 1000);

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

        const userPrompt = `Resolve this prediction market question:

Question: "${question}"
Market End Date: ${marketEndDate.toDateString()}
Current Date: ${currentDate.toDateString()}

ANALYSIS REQUIRED:
1. What is the question asking?
2. What evidence exists about this event/outcome?
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
