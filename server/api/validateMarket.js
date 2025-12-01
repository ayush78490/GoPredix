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

// Category definitions
const CATEGORIES = {
  CRYPTO: "Cryptocurrency & Blockchain",
  POLITICS: "Politics & Governance",
  SPORTS: "Sports & Competitions",
  TECHNOLOGY: "Technology & AI",
  FINANCE: "Finance & Economics",
  ENTERTAINMENT: "Entertainment & Media",
  SCIENCE: "Science & Health",
  WORLD: "World Events",
  OTHER: "Other"
};

/**
 * Enhanced OpenAI validation with retry logic
 */
async function makeOpenAICall(messages, maxRetries = 3) {
  let lastError;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await getOpenAI().chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: messages,
        max_tokens: 1000,
        temperature: 0.1,
        response_format: { type: "json_object" }
      });

      return response;
    } catch (error) {
      console.error(`OpenAI API call attempt ${attempt + 1} failed:`, error.message);
      lastError = error;

      // Exponential backoff for rate limits
      if (error.status === 429 && attempt < maxRetries - 1) {
        const waitTime = Math.pow(2, attempt) * 1000;
        await new Promise(resolve => setTimeout(resolve, waitTime));
        continue;
      }

      throw error;
    }
  }

  throw lastError || new Error('All OpenAI API attempts failed');
}

/**
 * Main validation function with enhanced checks
 */
async function validateWithOpenAI({ question, endTime, initialYes, initialNo }) {
  try {
    const currentDate = new Date();
    const marketEndDate = new Date(endTime * 1000);
    const daysUntilEnd = Math.ceil((marketEndDate - currentDate) / (1000 * 60 * 60 * 24));

    const systemPrompt = `You are an EXTREMELY STRICT prediction market validator. Your PRIMARY job is to ensure questions can be OBJECTIVELY RESOLVED before the market end date.

CRITICAL VALIDATION RULES (REJECT if ANY fail):

1. **HISTORICAL EVENT CHECK** (HIGHEST PRIORITY):
   - Current date: ${currentDate.toISOString()}
   - If the event ALREADY HAPPENED before today, REJECT immediately
   - If the outcome is ALREADY KNOWN or publicly available, REJECT
   - Check news, historical records, and common knowledge
   - Examples to REJECT: "Did Bitcoin reach $100k in 2024?", "Who won the 2020 election?", "Did SpaceX launch in March 2023?"

2. **DATE CONFLICT VALIDATION** (CRITICAL):
   - Current date: ${currentDate.toISOString()}
   - Market end date: ${marketEndDate.toISOString()}
   - Days until market ends: ${daysUntilEnd}
   
   STRICT RULES:
   - If question mentions a specific date/time, it MUST be BEFORE market end date
   - The event MUST occur or be resolvable BEFORE ${marketEndDate.toDateString()}
   - If event date is AFTER market end date, REJECT with clear explanation
   - If event date is SAME as market end date, REJECT (need time to verify outcome)
   - Event must be resolvable at least 1 day BEFORE market ends

3. **RESOLVABILITY CHECK** (MANDATORY):
   - Question MUST have a clear, verifiable outcome
   - Outcome MUST be determinable from PUBLIC sources (news, official announcements, blockchain data)
   - MUST be binary YES/NO - no ambiguity
   - Resolution criteria MUST be crystal clear
   - If outcome requires subjective judgment, REJECT
   - If outcome requires private/insider information, REJECT

4. **FUTURE EVENT VALIDATION**:
   - Event MUST be about the FUTURE relative to today (${currentDate.toDateString()})
   - Event MUST occur BEFORE market end date (${marketEndDate.toDateString()})
   - Outcome must be UNKNOWN at market creation time
   - If asking about past events, REJECT

5. **OBJECTIVE VERIFIABILITY**:
   - Must have clear YES/NO outcome
   - Must be verifiable through public sources (news sites, official data, blockchain explorers)
   - No subjective opinions ("Is X good?", "Will people like Y?")
   - No ambiguous phrasing
   - Must specify exact criteria for resolution

6. **SPECIFICITY REQUIREMENTS**:
   - Must be specific and well-defined
   - No vague terms without clear definitions
   - Must have clear resolution criteria
   - Single question only (no multiple parts)
   - Must specify what constitutes YES vs NO

7. **PROHIBITED CONTENT**:
   - No personal/private matters
   - No illegal activities
   - No harmful content
   - No manipulation attempts
   - No events impossible to verify
   - No events requiring insider knowledge

8. **DATE EXTRACTION AND VERIFICATION**:
   - Extract ALL dates mentioned in the question
   - Verify each date is BEFORE market end date
   - Check if dates are realistic and possible
   - Verify the event can happen by that date
   - Consider typical timelines for such events

RESPONSE FORMAT (JSON only):
{
  "valid": boolean,
  "reason": string (detailed explanation),
  "category": string,
  "eventAnalysis": {
    "alreadyHappened": boolean,
    "outcomeKnown": boolean,
    "eventDate": string | null,
    "dateConflict": boolean,
    "dateConflictReason": string,
    "timelineAnalysis": string,
    "canBeResolvedBeforeMarketEnd": boolean,
    "resolutionMethod": string (how to verify outcome)
  },
  "validationDetails": {
    "isObjective": boolean,
    "isSpecific": boolean,
    "isVerifiable": boolean,
    "isFutureEvent": boolean,
    "hasPublicResolution": boolean,
    "resolutionSource": string (where to check outcome)
  }
}`;

    const userPrompt = `Analyze this prediction market question with EXTREME SCRUTINY: "${question}"

TIMING CONTEXT:
- Today's date: ${currentDate.toDateString()} (${currentDate.toISOString()})
- Market end date: ${marketEndDate.toDateString()} (${marketEndDate.toISOString()})
- Time until market ends: ${daysUntilEnd} days
- Initial liquidity: YES ${initialYes} BNB, NO ${initialNo} BNB

MANDATORY CHECKS (ALL must pass):

1. **Historical Event Check:**
   - Has this event ALREADY HAPPENED?
   - Is the outcome ALREADY KNOWN from news, records, or common knowledge?
   - Search your knowledge for any information about this event
   - If yes to either, REJECT immediately

2. **Date Extraction and Validation:**
   - Extract ALL dates mentioned in the question (explicit or implicit)
   - For each date found:
     * Is it BEFORE the market end date (${marketEndDate.toDateString()})?
     * Is it realistic and achievable?
     * Can the outcome be verified by that date?
   - If ANY date is after market end, REJECT
   - If date is same as market end, REJECT (need verification time)

3. **Resolvability Analysis:**
   - HOW will the outcome be determined?
   - WHAT public sources will provide the answer? (be specific)
   - WHEN will the outcome be known?
   - Can it be verified at least 1 day before ${marketEndDate.toDateString()}?
   - Is the resolution method objective and clear?
   - If any answer is unclear, REJECT

4. **Timeline Feasibility:**
   - Is ${daysUntilEnd} days enough time for this event to occur AND be verified?
   - Consider typical timelines for such events
   - Consider announcement delays, verification time
   - If timeline is too tight, REJECT

5. **Objectivity Check:**
   - Is this a YES/NO question with NO gray area?
   - Can two people independently verify and get the same answer?
   - Are the criteria for YES vs NO crystal clear?
   - If any subjectivity exists, REJECT

6. **Public Verifiability:**
   - Will the outcome be publicly announced?
   - What specific sources will report it? (news sites, official announcements, blockchain, etc.)
   - Is insider knowledge required? If yes, REJECT
   - Is it based on private information? If yes, REJECT

PROVIDE DETAILED ANALYSIS:
- List all dates found in the question
- Explain the timeline for event occurrence
- Specify exact resolution method and sources
- Explain why it passes or fails each check
- Be thorough and specific in your reasoning

If you have ANY doubt about resolvability, date conflicts, or objectivity, REJECT the question.`;

    console.log('Calling OpenAI for validation...');

    const response = await makeOpenAICall([
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt }
    ]);

    if (!response.choices || !response.choices[0] || !response.choices[0].message) {
      throw new Error('Invalid OpenAI response format');
    }

    const aiText = response.choices[0].message.content;
    console.log('OpenAI response:', aiText);

    // Parse JSON response
    let result;
    try {
      result = JSON.parse(aiText);
    } catch (parseError) {
      console.error('JSON parse error, using fallback analysis');
      return analyzeFallback(aiText, question, endTime, currentDate);
    }

    // Validate and normalize category
    let category = (result.category || 'OTHER').toUpperCase().replace(/[^A-Z]/g, '');
    if (!CATEGORIES[category]) {
      category = determineCategoryFromKeywords(question);
    }

    // Check for historical events
    if (result.eventAnalysis?.alreadyHappened || result.eventAnalysis?.outcomeKnown) {
      return {
        valid: false,
        reason: result.reason || 'This event has already happened and the outcome is known. Prediction markets require future events with unknown outcomes.',
        category: category,
        eventAnalysis: result.eventAnalysis,
        validationDetails: result.validationDetails,
        apiError: false
      };
    }

    // Check for date conflicts
    if (result.eventAnalysis?.dateConflict) {
      return {
        valid: false,
        reason: result.eventAnalysis.dateConflictReason || 'Event date conflicts with market end date',
        category: category,
        eventAnalysis: result.eventAnalysis,
        validationDetails: result.validationDetails,
        apiError: false
      };
    }

    // Check if event can be resolved before market end
    if (result.eventAnalysis?.canBeResolvedBeforeMarketEnd === false) {
      return {
        valid: false,
        reason: 'This event cannot be resolved before the market end date. The outcome must be verifiable before the market closes.',
        category: category,
        eventAnalysis: result.eventAnalysis,
        validationDetails: result.validationDetails,
        apiError: false
      };
    }

    // Check for public verifiability
    if (result.validationDetails?.hasPublicResolution === false) {
      return {
        valid: false,
        reason: 'This event cannot be publicly verified. Prediction markets require outcomes that can be independently verified through public sources.',
        category: category,
        eventAnalysis: result.eventAnalysis,
        validationDetails: result.validationDetails,
        apiError: false
      };
    }

    // Check if it's a future event
    if (result.validationDetails?.isFutureEvent === false) {
      return {
        valid: false,
        reason: 'This question is not about a future event. Prediction markets require events that have not yet occurred.',
        category: category,
        eventAnalysis: result.eventAnalysis,
        validationDetails: result.validationDetails,
        apiError: false
      };
    }

    // Return final validation result
    return {
      valid: Boolean(result.valid),
      reason: result.reason || 'Validation completed',
      category: category,
      eventAnalysis: result.eventAnalysis || {},
      validationDetails: result.validationDetails || {},
      apiError: false
    };

  } catch (error) {
    console.error('Validation error:', error);

    return {
      valid: false,
      reason: 'AI validation service is temporarily unavailable. Please try again in a moment.',
      category: 'OTHER',
      apiError: true,
      error: error.message
    };
  }
}

/**
 * Fallback analysis when JSON parsing fails
 */
function analyzeFallback(aiText, question, endTime, currentDate) {
  const lowerText = aiText.toLowerCase();

  // Check for historical event indicators
  const historicalIndicators = [
    'already happened', 'already occurred', 'past event', 'outcome is known',
    'outcome known', 'historical', 'has occurred', 'took place', 'previously'
  ];

  const isHistorical = historicalIndicators.some(indicator => lowerText.includes(indicator));

  if (isHistorical) {
    return {
      valid: false,
      reason: 'This appears to be a historical event with a known outcome. Prediction markets require future events.',
      category: determineCategoryFromKeywords(question),
      eventAnalysis: {
        alreadyHappened: true,
        outcomeKnown: true,
        dateConflict: false,
        timelineAnalysis: 'Event appears to be historical based on AI analysis'
      },
      apiError: false
    };
  }

  // Extract dates from question
  const dateRegex = /(\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{1,2},?\s+\d{4})|(\d{1,2}\/\d{1,2}\/\d{4})|(\d{4}-\d{1,2}-\d{1,2})/gi;
  const datesFound = question.match(dateRegex) || [];

  const marketEndDate = new Date(endTime * 1000);
  let dateConflict = false;
  let dateConflictReason = '';

  // Check for date conflicts
  for (const dateStr of datesFound) {
    try {
      const eventDate = new Date(dateStr);

      // Check if event is in the past
      if (eventDate < currentDate) {
        return {
          valid: false,
          reason: `The event date (${eventDate.toDateString()}) is in the past. The event may have already occurred.`,
          category: determineCategoryFromKeywords(question),
          eventAnalysis: {
            alreadyHappened: true,
            outcomeKnown: true,
            eventDate: eventDate.toISOString(),
            dateConflict: true,
            dateConflictReason: 'Event date is in the past'
          },
          apiError: false
        };
      }

      // Check if event is after market end
      if (eventDate > marketEndDate) {
        dateConflict = true;
        dateConflictReason = `Event date (${eventDate.toDateString()}) is after market end date (${marketEndDate.toDateString()})`;
      }
    } catch (e) {
      // Ignore date parsing errors
    }
  }

  if (dateConflict) {
    return {
      valid: false,
      reason: dateConflictReason,
      category: determineCategoryFromKeywords(question),
      eventAnalysis: {
        alreadyHappened: false,
        outcomeKnown: false,
        dateConflict: true,
        dateConflictReason: dateConflictReason,
        datesFound: datesFound
      },
      apiError: false
    };
  }

  // Analyze sentiment for validation
  const positiveIndicators = ['valid', 'appropriate', 'suitable', 'clear', 'objective'];
  const negativeIndicators = ['invalid', 'not suitable', 'subjective', 'unclear', 'ambiguous'];

  const positiveCount = positiveIndicators.filter(ind => lowerText.includes(ind)).length;
  const negativeCount = negativeIndicators.filter(ind => lowerText.includes(ind)).length;

  const category = determineCategoryFromKeywords(question);

  return {
    valid: positiveCount > negativeCount,
    reason: positiveCount > negativeCount
      ? 'Question appears valid based on AI analysis'
      : 'Question may have validation issues',
    category: category,
    eventAnalysis: {
      alreadyHappened: false,
      outcomeKnown: false,
      dateConflict: false,
      timelineAnalysis: 'Fallback analysis - no major issues detected'
    },
    apiError: false
  };
}

/**
 * Determine category from keywords
 */
function determineCategoryFromKeywords(question) {
  const lowerQuestion = question.toLowerCase();

  const categoryKeywords = {
    CRYPTO: [
      'bitcoin', 'ethereum', 'crypto', 'blockchain', 'btc', 'eth', 'defi', 'nft', 'token', 'binance', 'bnb',
      'ton', 'toncoin', 'solana', 'sol', 'cardano', 'ada', 'polkadot', 'dot',
      'ripple', 'xrp', 'dogecoin', 'doge', 'shiba', 'matic', 'polygon', 'avalanche', 'avax',
      'chainlink', 'link', 'uniswap', 'uni', 'litecoin', 'ltc', 'stellar', 'xlm', 'cosmos', 'atom',
      'tron', 'trx', 'monero', 'xmr', 'eos', 'tezos', 'xtz', 'algorand', 'algo', 'fantom', 'ftm',
      'near', 'aptos', 'apt', 'sui', 'arbitrum', 'optimism', 'base', 'zksync', 'starknet',
      'cryptocurrency', 'altcoin', 'stablecoin', 'usdt', 'usdc', 'dai', 'busd',
      'web3', 'dao', 'dapp', 'smart contract', 'mining', 'staking', 'yield', 'liquidity',
      'metamask', 'wallet', 'exchange', 'coinbase', 'kraken', 'dex', 'cex'
    ],
    POLITICS: ['election', 'president', 'government', 'policy', 'senate', 'congress', 'vote', 'minister', 'parliament'],
    SPORTS: ['game', 'match', 'tournament', 'championship', 'olympics', 'team', 'player', 'win', 'score'],
    TECHNOLOGY: ['launch', 'release', 'update', 'software', 'hardware', 'ai', 'artificial intelligence', 'tech'],
    FINANCE: ['stock', 'market', 'earnings', 'economic', 'gdp', 'inflation', 'interest rate', 'price'],
    ENTERTAINMENT: ['movie', 'film', 'oscar', 'award', 'celebrity', 'music', 'album', 'box office'],
    SCIENCE: ['discovery', 'research', 'study', 'medical', 'health', 'space', 'nasa', 'clinical'],
    WORLD: ['earthquake', 'hurricane', 'summit', 'conference', 'international', 'global', 'country']
  };

  for (const [category, keywords] of Object.entries(categoryKeywords)) {
    if (keywords.some(keyword => lowerQuestion.includes(keyword))) {
      return category;
    }
  }

  return 'OTHER';
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
      valid: false,
      reason: 'Method not allowed. Use POST.',
      apiError: false
    });
  }

  try {
    console.log('Validation request received:', req.body);

    const { question, endTime, initialYes, initialNo } = req.body;

    // Input validation
    if (!question || typeof question !== 'string' || question.trim().length === 0) {
      return res.status(400).json({
        valid: false,
        reason: 'Valid question string is required',
        category: 'OTHER',
        apiError: false
      });
    }

    if (!endTime || isNaN(parseInt(endTime))) {
      return res.status(400).json({
        valid: false,
        reason: 'Valid endTime timestamp is required',
        category: 'OTHER',
        apiError: false
      });
    }

    if (!initialYes || !initialNo) {
      return res.status(400).json({
        valid: false,
        reason: 'Both initialYes and initialNo amounts are required',
        category: 'OTHER',
        apiError: false
      });
    }

    // Parse and validate numeric values
    const endTimeNum = parseInt(endTime);
    const yesAmount = parseFloat(initialYes);
    const noAmount = parseFloat(initialNo);

    // Time validation
    const now = Math.floor(Date.now() / 1000);
    const oneHourFromNow = now + 3600;

    if (endTimeNum <= oneHourFromNow) {
      return res.status(400).json({
        valid: false,
        reason: 'Market end time must be at least 1 hour from now',
        category: 'OTHER',
        apiError: false
      });
    }

    // Liquidity validation
    if (yesAmount <= 0 || noAmount <= 0) {
      return res.status(400).json({
        valid: false,
        reason: 'Both YES and NO liquidity must be greater than 0',
        category: 'OTHER',
        apiError: false
      });
    }

    const totalLiquidity = yesAmount + noAmount;
    if (totalLiquidity < 0.01) {
      return res.status(400).json({
        valid: false,
        reason: 'Total liquidity must be at least 0.01 BNB',
        category: 'OTHER',
        apiError: false
      });
    }

    // Question length validation
    if (question.length > 500) {
      return res.status(400).json({
        valid: false,
        reason: 'Question must be less than 500 characters',
        category: 'OTHER',
        apiError: false
      });
    }

    console.log('Input validation passed, calling AI validator...');

    // Call AI validation
    const validation = await validateWithOpenAI({
      question: question.trim(),
      endTime: endTimeNum,
      initialYes: initialYes.toString(),
      initialNo: initialNo.toString()
    });

    console.log('Validation result:', validation);

    return res.status(200).json(validation);

  } catch (error) {
    console.error('Validation endpoint error:', error);

    return res.status(500).json({
      valid: false,
      reason: 'Internal server error during validation. Please try again.',
      category: 'OTHER',
      apiError: true,
      error: error.message
    });
  }
};













