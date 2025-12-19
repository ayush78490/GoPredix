import OpenAI from 'openai';

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
 * AI-powered dispute validation endpoint
 * Validates if a dispute reason is legitimate and has merit
 */
async function validateDisputeWithAI({
    question,
    currentResolution,
    currentOutcome,
    disputeReason,
    endTime,
    marketId
}) {
    try {
        console.log(`🔍 Validating dispute for market ${marketId}: "${question}"`);

        const currentDate = new Date();
        const marketEndDate = new Date(endTime * 1000);
        const outcomeText = currentOutcome === 1 ? 'YES' : currentOutcome === 2 ? 'NO' : 'UNDECIDED';

        // System prompt for dispute validation
        const systemPrompt = `You are an AI dispute validator for prediction markets.

Your job is to determine if a dispute against a market resolution has LEGITIMATE MERIT.

CRITICAL RULES:
1. The market was resolved as: ${outcomeText}
2. Original resolution reason: ${currentResolution}
3. The disputer claims this is incorrect
4. Analyze if the dispute has factual basis
5. Consider if there's reasonable doubt about the current resolution
6. Only validate disputes with STRONG factual evidence

DISPUTE LEGITIMACY CRITERIA:
- Has verifiable factual evidence
- Provides credible sources
- Points out clear errors in original resolution
- Not based on semantics or technicalities
- Has reasonable chance of being correct

RESPONSE FORMAT (JSON only):
{
  "valid": true/false,
  "confidence": 0-100,
  "reason": "why the dispute is/isn't legitimate",
  "evidence_strength": "weak/moderate/strong",
  "recommendation": "approve/reject/review",
  "alternative_outcome": 1 or 2 or null,
  "analysis": "detailed analysis of the dispute merit"
}`;

        const userPrompt = `Evaluate this dispute:

MARKET QUESTION: "${question}"
MARKET END DATE: ${marketEndDate.toDateString()}
CURRENT DATE: ${currentDate.toDateString()}

CURRENT RESOLUTION:
- Outcome: ${outcomeText}
- Reason: ${currentResolution}

DISPUTE CLAIM:
"${disputeReason}"

ANALYSIS REQUIRED:
1. Does the dispute provide factual evidence?
2. Are the disputer's claims verifiable?
3. Is there reasonable doubt about the current resolution?
4. What is the evidence strength?
5. Should this dispute be approved?

Provide detailed analysis of the dispute's legitimacy.`;

        console.log('Calling OpenAI for dispute validation...');

        const response = await getOpenAI().chat.completions.create({
            model: "gpt-4o",
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt }
            ],
            max_tokens: 1000,
            temperature: 0.2,
            response_format: { type: "json_object" }
        });

        if (!response.choices || !response.choices[0] || !response.choices[0].message) {
            throw new Error('Invalid OpenAI response format');
        }

        const aiText = response.choices[0].message.content;
        console.log('OpenAI dispute validation response:', aiText);

        let result;
        try {
            result = JSON.parse(aiText);
        } catch (parseError) {
            console.error('JSON parse error:', parseError);
            return {
                valid: false,
                confidence: 0,
                reason: 'Failed to parse AI response',
                evidence_strength: 'none',
                recommendation: 'reject',
                alternative_outcome: null,
                analysis: 'System error during validation',
                apiError: true
            };
        }

        // Ensure confidence is a number
        result.confidence = parseInt(result.confidence) || 0;

        console.log(`✅ Dispute validation complete: Valid=${result.valid}, Confidence=${result.confidence}%`);

        return {
            valid: result.valid || false,
            confidence: result.confidence,
            reason: result.reason || 'Dispute validation completed',
            evidence_strength: result.evidence_strength || 'unknown',
            recommendation: result.recommendation || 'review',
            alternative_outcome: result.alternative_outcome,
            analysis: result.analysis || '',
            apiError: false
        };

    } catch (error) {
        console.error('AI dispute validation error:', error);

        return {
            valid: false,
            confidence: 0,
            reason: 'Could not validate dispute at this time',
            evidence_strength: 'unknown',
            recommendation: 'review',
            alternative_outcome: null,
            analysis: 'Service temporarily unavailable',
            apiError: true,
            error: error.message
        };
    }
}

/**
 * Main handler for Vercel serverless function
 */
export default async (req, res) => {
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
            valid: false,
            reason: 'Method not allowed. Use POST.',
            apiError: false
        });
    }

    try {
        console.log('Dispute validation request received:', req.body);

        const {
            question,
            currentResolution,
            currentOutcome,
            disputeReason,
            endTime,
            marketId
        } = req.body;

        // Input validation
        if (!question || typeof question !== 'string' || question.trim().length === 0) {
            return res.status(400).json({
                valid: false,
                reason: 'Valid question string is required',
                apiError: false
            });
        }

        if (!disputeReason || typeof disputeReason !== 'string' || disputeReason.trim().length === 0) {
            return res.status(400).json({
                valid: false,
                reason: 'Valid dispute reason is required',
                apiError: false
            });
        }

        if (disputeReason.trim().length < 20) {
            return res.status(400).json({
                valid: false,
                reason: 'Dispute reason must be at least 20 characters',
                confidence: 0,
                evidence_strength: 'insufficient',
                recommendation: 'reject',
                apiError: false
            });
        }

        if (!currentResolution || typeof currentResolution !== 'string') {
            return res.status(400).json({
                valid: false,
                reason: 'Current resolution reason is required',
                apiError: false
            });
        }

        if (currentOutcome === undefined || ![1, 2, null].includes(currentOutcome)) {
            return res.status(400).json({
                valid: false,
                reason: 'Valid current outcome (1=YES, 2=NO, null=UNDECIDED) is required',
                apiError: false
            });
        }

        if (!endTime || isNaN(parseInt(endTime))) {
            return res.status(400).json({
                valid: false,
                reason: 'Valid endTime timestamp is required',
                apiError: false
            });
        }

        console.log('Input validation passed, calling AI dispute validator...');

        // Call AI dispute validation
        const validation = await validateDisputeWithAI({
            question: question.trim(),
            currentResolution: currentResolution.trim(),
            currentOutcome: parseInt(currentOutcome),
            disputeReason: disputeReason.trim(),
            endTime: parseInt(endTime),
            marketId: marketId || 'unknown'
        });

        console.log('Dispute validation result:', validation);

        return res.status(200).json(validation);

    } catch (error) {
        console.error('Dispute validation endpoint error:', error);

        return res.status(500).json({
            valid: false,
            confidence: 0,
            reason: 'Internal server error during dispute validation',
            evidence_strength: 'unknown',
            recommendation: 'review',
            alternative_outcome: null,
            analysis: '',
            apiError: true,
            error: error.message
        });
    }
};
