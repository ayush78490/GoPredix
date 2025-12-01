const OpenAI = require('openai');

// Initialize OpenAI client
let openai;
try {
  openai = new OpenAI({
    apiKey: process.env.OPEN_AI_API_KEY,
  });
} catch (error) {
  console.error('Failed to initialize OpenAI:', error);
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
      const response = await openai.chat.completions.create({
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
















// require('dotenv').config();
// const express = require('express');
// const cors = require('cors');
// const bodyParser = require('body-parser');
// const { ethers } = require('ethers');
// const cron = require('node-cron');
// const OpenAI = require('openai');

// // Use native fetch for Node.js 18+, otherwise use node-fetch
// let fetch;
// if (parseInt(process.versions.node.split('.')[0]) < 18) {
//   fetch = require('node-fetch');
// } else {
//   fetch = globalThis.fetch;
// }

// const app = express();

// // -------------------- CORS CONFIG --------------------
// const corsOptions = {
//   origin: function (origin, callback) {
//     const allowedOrigins = [
//       'https://sigma-predection.vercel.app',
//       'https://gopredix.vercel.app', 
//       'https://sigma-prediction.vercel.app',
//       'https://www.gopredix.xyz',
//       'http://localhost:3000',
//       'http://localhost:3001',
//       'http://127.0.0.1:3000',
//       'http://127.0.0.1:3001',
//       'http://64.29.17.131'
//     ];
    
//     // Allow requests with no origin (like serverless functions)
//     if (!origin) return callback(null, true);
    
//     if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV === 'production') {
//       callback(null, true);
//     } else {
//       callback(new Error('Not allowed by CORS'));
//     }
//   },
//   credentials: true,
//   optionsSuccessStatus: 200
// };

// // Apply the npm cors middleware (keeps compatibility)
// app.use(cors({
//   origin: function (origin, callback) {
//     // Allow requests with no origin (like curl or server-to-server)
//     if (!origin) return callback(null, true);
//     if (corsOptions.origin.indexOf(origin) !== -1) {
//       return callback(null, true);
//     } else {
//       return callback(new Error('Not allowed by CORS: ' + origin));
//     }
//   },
//   methods: corsOptions.methods,
//   allowedHeaders: corsOptions.allowedHeaders,
//   credentials: corsOptions.credentials,
//   optionsSuccessStatus: corsOptions.optionsSuccessStatus
// }));

// // Explicit custom CORS headers middleware — ensures headers always present (preflight handling)
// app.use((req, res, next) => {
//   const origin = req.headers.origin;
//   // If the origin is in the whitelist, echo it back. Otherwise do not set Access-Control-Allow-Origin.
//   if (origin && corsOptions.origin.includes(origin)) {
//     res.setHeader('Access-Control-Allow-Origin', origin);
//     // Required for caching proxies to know response varies by origin
//     res.setHeader('Vary', 'Origin');
//   }
//   // Always set these so browser sees allowed methods/headers on preflight
//   res.setHeader('Access-Control-Allow-Methods', corsOptions.methods.join(','));
//   res.setHeader('Access-Control-Allow-Headers', corsOptions.allowedHeaders.join(','));
//   if (corsOptions.credentials) {
//     res.setHeader('Access-Control-Allow-Credentials', 'true');
//   }

//   // If it's a preflight request, immediately respond
//   if (req.method === 'OPTIONS') {
//     return res.status(corsOptions.optionsSuccessStatus).end();
//   }

//   next();
// });

// // Fallback route-level option handling (keeps safety)
// app.options('*', (req, res) => {
//   const origin = req.headers.origin;
//   if (origin && corsOptions.origin.includes(origin)) {
//     res.setHeader('Access-Control-Allow-Origin', origin);
//     res.setHeader('Vary', 'Origin');
//   }
//   res.setHeader('Access-Control-Allow-Methods', corsOptions.methods.join(','));
//   res.setHeader('Access-Control-Allow-Headers', corsOptions.allowedHeaders.join(','));
//   if (corsOptions.credentials) res.setHeader('Access-Control-Allow-Credentials', 'true');
//   return res.status(corsOptions.optionsSuccessStatus).end();
// });
// // ------------------ END CORS CONFIG ------------------

// app.use(bodyParser.json());

// // Initialize OpenAI client with proper error handling
// let openai;
// try {
//   if (!process.env.OPEN_AI_API_KEY) {
//     throw new Error('OPEN_AI_API_KEY environment variable is not set');
//   }

//   openai = new OpenAI({
//     apiKey: process.env.OPEN_AI_API_KEY,
//   });
//   console.log('✅ OpenAI client initialized successfully');
// } catch (error) {
//   console.error('❌ Failed to initialize OpenAI client:', error.message);
//   process.exit(1);
// }

// // API Health state tracking
// let apiHealth = {
//   lastChecked: null,
//   isHealthy: true,
//   lastError: null
// };

// // ==================== API HEALTH CHECK ====================

// async function checkAPIHealth() {
//   try {
//     console.log('🏥 Checking OpenAI API health...');

//     const response = await openai.chat.completions.create({
//       model: "gpt-3.5-turbo",
//       messages: [
//         { 
//           role: "user", 
//           content: "Respond with only: OK" 
//         }
//       ],
//       max_tokens: 5,
//       temperature: 0
//     });

//     console.log('✅ OpenAI API health check passed');
    
//     apiHealth.isHealthy = true;
//     apiHealth.lastChecked = new Date().toISOString();
//     apiHealth.lastError = null;
    
//     return {
//       healthy: true,
//       response: response
//     };
    
//   } catch (error) {
//     console.error('❌ OpenAI API health check failed:', error.message);
    
//     apiHealth.isHealthy = false;
//     apiHealth.lastChecked = new Date().toISOString();
//     apiHealth.lastError = error.message;
    
//     return {
//       healthy: false,
//       error: error.message
//     };
//   }
// }

// // ==================== ENHANCED API CALL FUNCTION ====================

// async function makeOpenAICall(messages, model = "gpt-4", maxTokens = 500, temperature = 0.1) {
//   const maxRetries = 3;
//   let lastError;

//   for (let attempt = 0; attempt < maxRetries; attempt++) {
//     console.log(`📤 OpenAI API Call Attempt ${attempt + 1} with model: ${model}`);

//     try {
//       const response = await openai.chat.completions.create({
//         model: model,
//         messages: messages,
//         max_tokens: maxTokens,
//         temperature: temperature,
//         response_format: { type: "json_object" }
//       });

//       console.log(`✅ OpenAI API call successful`);
      
//       apiHealth.isHealthy = true;
//       apiHealth.lastChecked = new Date().toISOString();
      
//       return response;
//     } catch (error) {
//       console.error(`❌ OpenAI API call error on attempt ${attempt + 1}:`, error.message);
//       lastError = error;
      
//       // If it's a rate limit error, wait before retrying
//       if (error.status === 429 && attempt < maxRetries - 1) {
//         const waitTime = Math.pow(2, attempt) * 1000; // Exponential backoff
//         console.log(`⏳ Rate limited, waiting ${waitTime}ms before retry...`);
//         await new Promise(resolve => setTimeout(resolve, waitTime));
//         continue;
//       }
      
//       apiHealth.isHealthy = false;
//       apiHealth.lastChecked = new Date().toISOString();
//       apiHealth.lastError = error.message;
      
//       throw error;
//     }
//   }

//   throw lastError || new Error('All OpenAI API call attempts failed');
// }

// // ==================== ENHANCED MARKET VALIDATION WITH DATE CHECKING ====================

// async function validateWithOpenAI({ question, endTime, initialYes, initialNo }) {
//   // Check API health first
//   const healthCheck = await checkAPIHealth();
  
//   if (!healthCheck.healthy) {
//     console.log('🚫 OpenAI API is unhealthy - rejecting market validation');
//     return {
//       valid: false,
//       reason: 'AI validation service is currently unavailable. Please try again later.',
//       category: 'OTHER',
//       apiError: true,
//       apiHealth: apiHealth
//     };
//   }

//   try {
//     console.log('🤖 Starting OpenAI validation for question:', question);
    
//     const currentDate = new Date();
//     const marketEndDate = new Date(endTime * 1000);
    
//     const systemPrompt = `You are a prediction market validator. Analyze if a question is suitable for a prediction market with STRICT date validation.

// CRITICAL DATE VALIDATION RULES:
// 1. The question MUST be about a future event relative to the market end date
// 2. If the question mentions a specific date, that date MUST be BEFORE the market end date
// 3. The event being predicted MUST occur or be verifiable BEFORE the market ends
// 4. Reject questions where the resolution date is after the market end date

// ADDITIONAL CRITERIA FOR VALID QUESTIONS:
// ✅ MUST be objectively verifiable with clear YES/NO outcome
// ✅ MUST have specific resolution criteria
// ✅ MUST be about future events
// ✅ MUST be based on publicly available information
// ✅ MUST be unambiguous and specific
// ✅ MUST have a resolution that can be determined BEFORE market end

// CRITERIA FOR INVALID QUESTIONS:
// ❌ Event date occurs AFTER market end date
// ❌ Subjective opinions ("Is this good?")
// ❌ Already resolved events
// ❌ Personal/private matters
// ❌ Impossible to verify
// ❌ Multiple questions combined
// ❌ Vague or ambiguous phrasing
// ❌ Events that cannot be resolved by market end time

// DATE ANALYSIS:
// - Extract any dates mentioned in the question
// - Compare them with the market end date
// - If no specific date is mentioned, ensure the event type suggests it will be resolved by market end

// CATEGORIES:
// - CRYPTO: Cryptocurrency & Blockchain
// - POLITICS: Politics & Governance
// - SPORTS: Sports & Competitions
// - TECHNOLOGY: Technology & AI
// - FINANCE: Finance & Economics
// - ENTERTAINMENT: Entertainment & Media
// - SCIENCE: Science & Health
// - WORLD: World Events
// - OTHER: Everything else

// Respond with JSON only: {
//   "valid": boolean,
//   "reason": string,
//   "category": string,
//   "dateAnalysis": {
//     "datesFound": string[],
//     "dateConflict": boolean,
//     "dateConflictReason": string
//   }
// }`;

//     const userPrompt = `Analyze this prediction market question: "${question}"

// MARKET TIMING INFORMATION:
// - Market creation date: ${currentDate.toISOString()}
// - Market end date: ${marketEndDate.toISOString()}
// - Days until market ends: ${Math.ceil((marketEndDate - currentDate) / (1000 * 60 * 60 * 24))} days

// Initial liquidity: YES ${initialYes} BNB, NO ${initialNo} BNB

// CRITICAL: Check if any dates mentioned in the question occur AFTER the market end date. If so, reject the question.

// Is this a valid prediction market question? Which category does it belong to? Provide detailed date analysis.`;

//     console.log('📤 Calling OpenAI API...');
    
//     const data = await makeOpenAICall([
//       { 
//         role: "system", 
//         content: systemPrompt 
//       },
//       { 
//         role: "user", 
//         content: userPrompt 
//       }
//     ], "gpt-4", 800, 0.1);
    
//     if (!data.choices || !data.choices[0] || !data.choices[0].message) {
//       throw new Error('Invalid response format from OpenAI API');
//     }

//     const aiText = data.choices[0].message.content;
//     console.log('🤖 OpenAI analysis text:', aiText);

//     // Parse the JSON response
//     try {
//       const result = JSON.parse(aiText);
//       console.log('✅ Parsed OpenAI validation result:', result);
      
//       // Validate and map category
//       let category = result.category || 'OTHER';
//       category = category.toUpperCase().replace(/[^A-Z]/g, '');
      
//       if (!CATEGORIES[category]) {
//         const matchedCategory = Object.keys(CATEGORIES).find(cat => 
//           result.category?.toLowerCase().includes(cat.toLowerCase()) ||
//           cat.toLowerCase().includes(result.category?.toLowerCase())
//         );
//         category = matchedCategory || 'OTHER';
//       }
      
//       // Check for date conflicts in the AI response
//       const dateConflict = result.dateAnalysis?.dateConflict || false;
//       if (dateConflict) {
//         return {
//           valid: false,
//           reason: result.dateAnalysis?.dateConflictReason || 'The event date conflicts with market end date',
//           category: category,
//           dateConflict: true,
//           dateAnalysis: result.dateAnalysis,
//           apiError: false
//         };
//       }
      
//       return {
//         valid: Boolean(result.valid),
//         reason: result.reason || 'No reason provided by AI',
//         category: category,
//         dateAnalysis: result.dateAnalysis,
//         apiError: false
//       };
//     } catch (parseError) {
//       console.error('❌ JSON parse error:', parseError);
//       return analyzeTextResponseWithDate(aiText, question, endTime);
//     }

//   } catch (error) {
//     console.error('❌ Error in validateWithOpenAI:', error);
    
//     return {
//       valid: false,
//       reason: 'AI validation service is temporarily unavailable. Please try again in a few moments.',
//       category: 'OTHER',
//       apiError: true,
//       apiHealth: apiHealth
//     };
//   }
// }

// function analyzeTextResponseWithDate(aiText, question, endTime) {
//   const lowerText = aiText.toLowerCase();
//   const lowerQuestion = question.toLowerCase();
  
//   // Enhanced date extraction from question
//   const dateRegex = /(\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{1,2},?\s+\d{4})|(\d{1,2}\/\d{1,2}\/\d{4})|(\d{4}-\d{1,2}-\d{1,2})|(\b(?:next|this)\s+(?:week|month|year)|tomorrow|today)/gi;
//   const datesFound = question.match(dateRegex) || [];
  
//   const marketEndDate = new Date(endTime * 1000);
//   let dateConflict = false;
//   let dateConflictReason = '';
  
//   // Simple date conflict detection
//   datesFound.forEach(dateStr => {
//     try {
//       const eventDate = new Date(dateStr);
//       if (eventDate > marketEndDate) {
//         dateConflict = true;
//         dateConflictReason = `The event date (${eventDate.toDateString()}) is after market end date (${marketEndDate.toDateString()})`;
//       }
//     } catch (e) {
//       // Ignore date parsing errors
//     }
//   });
  
//   if (dateConflict) {
//     return {
//       valid: false,
//       reason: dateConflictReason,
//       category: determineCategory(question),
//       dateConflict: true,
//       dateAnalysis: {
//         datesFound: datesFound,
//         dateConflict: true,
//         dateConflictReason: dateConflictReason
//       },
//       apiError: false
//     };
//   }
  
//   const positiveIndicators = [
//     'valid', 'appropriate', 'suitable', 'good question', 'clear', 
//     'well-defined', 'objective', 'verifiable'
//   ];
  
//   const negativeIndicators = [
//     'invalid', 'not suitable', 'inappropriate', 'ambiguous', 
//     'subjective', 'unclear', 'cannot be verified', 'vague', 'date conflict'
//   ];
  
//   const positiveCount = positiveIndicators.filter(indicator => 
//     lowerText.includes(indicator)
//   ).length;
  
//   const negativeCount = negativeIndicators.filter(indicator => 
//     lowerText.includes(indicator)
//   ).length;
  
//   const category = determineCategory(question);
  
//   if (positiveCount > negativeCount && !dateConflict) {
//     return {
//       valid: true,
//       reason: 'AI analysis indicates this is a valid question',
//       category: category,
//       dateAnalysis: {
//         datesFound: datesFound,
//         dateConflict: false,
//         dateConflictReason: 'No date conflicts detected'
//       },
//       apiError: false
//     };
//   } else {
//     return {
//       valid: false,
//       reason: 'AI analysis indicates issues with this question',
//       category: category,
//       dateAnalysis: {
//         datesFound: datesFound,
//         dateConflict: dateConflict,
//         dateConflictReason: dateConflict ? dateConflictReason : 'Other validation issues'
//       },
//       apiError: false
//     };
//   }
// }

// function determineCategory(question) {
//   const lowerQuestion = question.toLowerCase();
  
//   const categoryKeywords = {
//     CRYPTO: ['bitcoin', 'ethereum', 'crypto', 'blockchain', 'btc', 'eth', 'defi', 'nft', 'token'],
//     POLITICS: ['election', 'president', 'government', 'policy', 'senate', 'congress', 'vote'],
//     SPORTS: ['game', 'match', 'tournament', 'championship', 'olympics', 'team', 'player'],
//     TECHNOLOGY: ['launch', 'release', 'update', 'software', 'hardware', 'ai', 'artificial intelligence'],
//     FINANCE: ['stock', 'market', 'earnings', 'economic', 'gdp', 'inflation', 'interest rate'],
//     ENTERTAINMENT: ['movie', 'film', 'oscar', 'award', 'celebrity', 'music', 'album'],
//     SCIENCE: ['discovery', 'research', 'study', 'medical', 'health', 'space', 'nasa'],
//     WORLD: ['earthquake', 'hurricane', 'summit', 'conference', 'international', 'global']
//   };
  
//   for (const [category, keywords] of Object.entries(categoryKeywords)) {
//     if (keywords.some(keyword => lowerQuestion.includes(keyword))) {
//       return category;
//     }
//   }
  
//   return 'OTHER';
// }

// // ==================== MARKET RESOLUTION ====================

// async function resolveWithOpenAI({ question, endTime, marketId }) {
//   // Check API health first
//   const healthCheck = await checkAPIHealth();
  
//   if (!healthCheck.healthy) {
//     console.log('🚫 OpenAI API is unhealthy - cannot resolve market');
//     return {
//       success: false,
//       outcome: null,
//       reason: 'AI resolution service is currently unavailable. Please try again later.',
//       confidence: 0,
//       sources: ['Service unavailable'],
//       resolvedAt: new Date().toISOString(),
//       apiError: true
//     };
//   }

//   try {
//     console.log('🤖 Starting OpenAI resolution for question:', question);
    
//     const systemPrompt = `You are a prediction market resolver. Determine the correct YES/NO outcome for a prediction market question based on real-world facts.

// RESOLUTION CRITERIA:
// ✅ Answer must be based on VERIFIABLE REAL-WORLD FACTS
// ✅ Use publicly available information and credible sources
// ✅ Consider the question's specific timeframe and conditions
// ✅ Be objective and factual, not subjective
// ✅ If outcome is unclear or not yet determined, return null

// RESPONSE FORMAT:
// {
//   "outcome": boolean|null, // true for YES, false for NO, null if unclear
//   "reason": string,        // Detailed explanation of the determination
//   "confidence": number,    // 0-100 scale of confidence in the answer
//   "sources": string[],     // Types of sources used for verification
//   "resolvedAt": string     // ISO timestamp of resolution
// }`;

//     const userPrompt = `Determine the outcome for this prediction market question: "${question}"

// Market ended at: ${new Date(endTime * 1000).toISOString()}
// Current time: ${new Date().toISOString()}

// What is the verifiable outcome? Answer YES (true), NO (false), or NULL if outcome cannot be determined yet.`;

//     console.log('📤 Calling OpenAI API for resolution...');
    
//     const data = await makeOpenAICall([
//       { 
//         role: "system", 
//         content: systemPrompt 
//       },
//       { 
//         role: "user", 
//         content: userPrompt 
//       }
//     ], "gpt-4", 1000, 0.1);
    
//     if (!data.choices || !data.choices[0] || !data.choices[0].message) {
//       throw new Error('Invalid response format from OpenAI API');
//     }

//     const aiText = data.choices[0].message.content;
//     console.log('🤖 OpenAI resolution text:', aiText);

//     try {
//       const result = JSON.parse(aiText);
//       console.log('✅ Parsed OpenAI resolution result:', result);
      
//       return {
//         success: true,
//         outcome: result.outcome,
//         reason: result.reason || 'No reason provided by AI',
//         confidence: result.confidence || 0,
//         sources: result.sources || ['AI analysis'],
//         resolvedAt: result.resolvedAt || new Date().toISOString(),
//         apiError: false
//       };
//     } catch (parseError) {
//       console.error('❌ JSON parse error in resolution:', parseError);
//       return analyzeResolutionText(aiText, question);
//     }

//   } catch (error) {
//     console.error('❌ Error in resolveWithOpenAI:', error);
    
//     return {
//       success: false,
//       outcome: null,
//       reason: 'AI resolution service is temporarily unavailable. Please try again later.',
//       confidence: 0,
//       sources: ['Service unavailable'],
//       resolvedAt: new Date().toISOString(),
//       apiError: true
//     };
//   }
// }

// function analyzeResolutionText(aiText, question) {
//   const lowerText = aiText.toLowerCase();
  
//   const yesIndicators = [
//     'yes', 'true', 'correct', 'happened', 'occurred', 'success', 'achieved',
//     'reached', 'completed', 'won', 'passed', 'approved'
//   ];
  
//   const noIndicators = [
//     'no', 'false', 'incorrect', 'did not happen', 'failed', 'not achieved',
//     'lost', 'rejected', 'denied', 'missed'
//   ];
  
//   const unclearIndicators = [
//     'unclear', 'unknown', 'not yet', 'pending', 'too early', 'cannot determine',
//     'ambiguous', 'uncertain'
//   ];
  
//   const yesCount = yesIndicators.filter(indicator => lowerText.includes(indicator)).length;
//   const noCount = noIndicators.filter(indicator => lowerText.includes(indicator)).length;
//   const unclearCount = unclearIndicators.filter(indicator => lowerText.includes(indicator)).length;
  
//   let outcome = null;
//   let confidence = 50;
  
//   if (yesCount > noCount && yesCount > unclearCount) {
//     outcome = true;
//     confidence = Math.min(80, yesCount * 20);
//   } else if (noCount > yesCount && noCount > unclearCount) {
//     outcome = false;
//     confidence = Math.min(80, noCount * 20);
//   } else if (unclearCount > 0) {
//     outcome = null;
//     confidence = 30;
//   }
  
//   return {
//     success: true,
//     outcome: outcome,
//     reason: 'AI analysis based on text response',
//     confidence: confidence,
//     sources: ['Text analysis fallback'],
//     resolvedAt: new Date().toISOString(),
//     apiError: false
//   };
// }

// // ==================== ROBUST BLOCKCHAIN RESOLUTION SERVICE ====================

// class MarketResolutionService {
//   constructor(provider, contractAddress, privateKey) {
//     this.provider = provider;
//     this.wallet = new ethers.Wallet(privateKey, provider);
//     this.contract = new ethers.Contract(
//       contractAddress,
//       [
//         'function resolveMarket(uint256, bool, string, uint256)',
//         'function markets(uint256) view returns (address, string, string, uint256, uint8, uint8, address, address, uint256, uint256, uint256, uint256, uint256, uint256, uint256, string, uint256, address, string)',
//         'function resolutionRequested(uint256) view returns (bool)',
//         'function nextMarketId() view returns (uint256)',
//         'event ResolutionRequested(uint256 indexed marketId, address requester, uint256 requestedAt)'
//       ],
//       this.wallet
//     );
//     this.isMonitoring = false;
//     this.eventListener = null;
//   }

//   async startMonitoring() {
//     try {
//       console.log('🚀 Starting blockchain event monitoring...');
      
//       // Use polling instead of event listeners to avoid filter issues
//       this.isMonitoring = true;
      
//       // Start polling for resolution requests
//       this.startPolling();
      
//       console.log('✅ Blockchain polling service active');
//     } catch (error) {
//       console.error('❌ Failed to start blockchain monitoring:', error.message);
//       // Fall back to polling only
//       this.startPolling();
//     }
//   }

//   startPolling() {
//     // Poll every 30 seconds for resolution requests
//     setInterval(async () => {
//       if (!this.isMonitoring) return;
      
//       try {
//         await this.checkForPendingResolutions();
//       } catch (error) {
//         console.error('❌ Error in polling cycle:', error.message);
//       }
//     }, 30000); // 30 seconds
    
//     console.log('🔍 Started polling for resolution requests (30s interval)');
//   }

//   async checkForPendingResolutions() {
//     try {
//       const nextId = await this.contract.nextMarketId();
//       const marketCount = parseInt(nextId);
      
//       if (marketCount === 0) return;

//       console.log(`🔍 Polling: Checking ${marketCount} markets for resolution requests...`);

//       for (let i = 0; i < marketCount; i++) {
//         try {
//           const resolutionRequested = await this.contract.resolutionRequested(i);
          
//           if (resolutionRequested) {
//             console.log(`📢 Found resolution request for market ${i}`);
//             await this.resolveMarket(i.toString());
            
//             // Add delay to avoid rate limiting
//             await new Promise(resolve => setTimeout(resolve, 2000));
//           }
//         } catch (error) {
//           console.error(`❌ Failed to check market ${i}:`, error.message);
//           continue;
//         }
//       }
//     } catch (error) {
//       console.error('❌ Error in checkForPendingResolutions:', error.message);
//     }
//   }

//   async resolveMarket(marketId) {
//     try {
//       console.log(`🔍 Starting resolution for market ${marketId}...`);
      
//       // Get market details from blockchain
//       const market = await this.contract.markets(marketId);
//       const [
//         creator, question, category, endTime, status, outcome, 
//         yesToken, noToken, yesPool, noPool, lpTotalSupply, 
//         totalBacking, platformFees, resolutionRequestedAt, 
//         disputeDeadline, resolutionReason, resolutionConfidence, 
//         disputer, disputeReason
//       ] = market;

//       // Check if market has ended
//       const currentTime = Math.floor(Date.now() / 1000);
//       if (currentTime < parseInt(endTime)) {
//         console.log(`⏳ Market ${marketId} has not ended yet`);
//         return { success: false, reason: 'Market not ended' };
//       }

//       // Check if already resolved
//       if (status > 2) { // Assuming status 2 is "ResolutionRequested", >2 means resolved
//         console.log(`✅ Market ${marketId} already resolved`);
//         return { success: false, reason: 'Market already resolved' };
//       }

//       console.log(`✅ Market ${marketId} ready for resolution. Calling AI...`);

//       // Call AI resolution
//       const resolution = await this.callAIResolution({
//         question: question,
//         endTime: parseInt(endTime),
//         marketId: marketId
//       });

//       console.log(`🤖 AI Resolution for market ${marketId}:`, resolution);

//       // Check if resolution failed due to API error
//       if (resolution.apiError) {
//         console.log(`🚫 Cannot resolve market ${marketId} due to API unavailability`);
//         return { 
//           success: false, 
//           reason: 'AI resolution service unavailable',
//           apiError: true
//         };
//       }

//       // Only resolve if AI has high confidence
//       if (resolution.outcome !== null && resolution.confidence >= 70) {
//         // Call the contract to record the resolution
//         const tx = await this.contract.resolveMarket(
//           marketId,
//           resolution.outcome,
//           resolution.reason,
//           resolution.confidence
//         );

//         console.log(`⏳ Waiting for transaction confirmation: ${tx.hash}`);
//         const receipt = await tx.wait();
        
//         console.log(`✅ Market ${marketId} resolved: ${resolution.outcome ? 'YES' : 'NO'} (${resolution.confidence}% confidence)`);
        
//         return { 
//           success: true, 
//           outcome: resolution.outcome, 
//           txHash: tx.hash,
//           confidence: resolution.confidence
//         };
//       } else {
//         console.log(`❓ Market ${marketId} - Low confidence or unclear outcome`);
//         return { 
//           success: false, 
//           reason: 'Low confidence or unclear outcome', 
//           resolution: resolution 
//         };
//       }

//     } catch (error) {
//       console.error(`💥 Error resolving market ${marketId}:`, error);
//       throw error;
//     }
//   }

//   async callAIResolution(marketData) {
//     try {
//       const response = await fetch('http://localhost:3001/api/resolve-market', {
//         method: 'POST',
//         headers: {
//           'Content-Type': 'application/json',
//         },
//         body: JSON.stringify(marketData),
//         timeout: 30000
//       });

//       if (!response.ok) {
//         throw new Error(`AI server returned ${response.status}: ${await response.text()}`);
//       }

//       return await response.json();
//     } catch (error) {
//       console.error('Error calling AI resolution server:', error);
//       return {
//         success: false,
//         outcome: null,
//         reason: 'AI resolution service unavailable',
//         confidence: 0,
//         sources: ['Service unavailable'],
//         resolvedAt: new Date().toISOString(),
//         apiError: true
//       };
//     }
//   }

//   async processAllPendingResolutions() {
//     try {
//       console.log('🔄 Processing all pending resolutions...');
      
//       // Get total market count
//       const nextId = await this.contract.nextMarketId();
//       const marketCount = parseInt(nextId);
      
//       console.log(`📊 Checking ${marketCount} markets for resolution...`);

//       for (let i = 0; i < marketCount; i++) {
//         try {
//           const market = await this.contract.markets(i);
//           const [creator, question, category, endTime, status] = market;
          
//           // Check if market has ended and needs resolution
//           const currentTime = Math.floor(Date.now() / 1000);
//           const resolutionRequested = await this.contract.resolutionRequested(i);
          
//           if (currentTime >= parseInt(endTime) && resolutionRequested && status === 2) { // ResolutionRequested status
//             console.log(`🔄 Processing market ${i} for resolution...`);
//             await this.resolveMarket(i.toString());
            
//             // Add delay to avoid rate limiting
//             await new Promise(resolve => setTimeout(resolve, 2000));
//           }
//         } catch (error) {
//           console.error(`Failed to process market ${i}:`, error.message);
//           continue;
//         }
//       }
      
//       console.log('✅ Finished processing pending resolutions');
//     } catch (error) {
//       console.error('Error in processAllPendingResolutions:', error);
//     }
//   }

//   stopMonitoring() {
//     this.isMonitoring = false;
//     if (this.eventListener) {
//       this.eventListener.removeAllListeners();
//     }
//     console.log('🛑 Blockchain monitoring stopped');
//   }
// }

// // ==================== API ENDPOINTS ====================

// // Market validation endpoint
// app.post('/api/validate-market', async (req, res) => {
//   try {
//     console.log('📨 Validation request received:', req.body);
    
//     const { question, endTime, initialYes, initialNo } = req.body;
    
//     if (!question || typeof question !== 'string') {
//       return res.status(400).json({ 
//         valid: false, 
//         reason: 'Valid question string is required',
//         category: 'OTHER',
//         apiError: false
//       });
//     }
    
//     if (!endTime || isNaN(parseInt(endTime))) {
//       return res.status(400).json({
//         valid: false,
//         reason: 'Valid endTime timestamp is required',
//         category: 'OTHER',
//         apiError: false
//       });
//     }
    
//     if (!initialYes || !initialNo) {
//       return res.status(400).json({
//         valid: false,
//         reason: 'Both initialYes and initialNo amounts are required',
//         category: 'OTHER',
//         apiError: false
//       });
//     }
    
//     const endTimeNum = parseInt(endTime);
//     const yesAmount = parseFloat(initialYes);
//     const noAmount = parseFloat(initialNo);
    
//     const now = Math.floor(Date.now() / 1000);
//     const oneHourFromNow = now + 3600;
    
//     if (endTimeNum <= oneHourFromNow) {
//       return res.status(400).json({
//         valid: false,
//         reason: 'End time must be at least 1 hour from now',
//         category: 'OTHER',
//         apiError: false
//       });
//     }
    
//     if (yesAmount <= 0 || noAmount <= 0) {
//       return res.status(400).json({
//         valid: false,
//         reason: 'Both YES and NO liquidity must be greater than 0',
//         category: 'OTHER',
//         apiError: false
//       });
//     }
    
//     const totalLiquidity = yesAmount + noAmount;
//     if (totalLiquidity < 0.01) {
//       return res.status(400).json({
//         valid: false,
//         reason: 'Total liquidity must be at least 0.01 BNB',
//         category: 'OTHER',
//         apiError: false
//       });
//     }
    
//     console.log('✅ Parameter validation passed, calling OpenAI...');
    
//     const validation = await validateWithOpenAI({
//       question: question.trim(),
//       endTime: endTimeNum,
//       initialYes: initialYes.toString(),
//       initialNo: initialNo.toString()
//     });
    
//     console.log('🎯 Final validation result:', validation);
    
//     res.json(validation);

//   } catch (error) {
//     console.error('💥 Validation endpoint error:', error);
//     res.status(500).json({ 
//       valid: false, 
//       reason: 'Internal server error during validation',
//       category: 'OTHER',
//       apiError: true,
//       error: error.message 
//     });
//   }
// });

// // Market resolution endpoint
// app.post('/api/resolve-market', async (req, res) => {
//   try {
//     console.log('🔍 Resolution request received:', req.body);
    
//     const { question, endTime, marketId } = req.body;
    
//     if (!question || typeof question !== 'string') {
//       return res.status(400).json({ 
//         success: false,
//         outcome: null,
//         reason: 'Valid question string is required',
//         confidence: 0,
//         apiError: false
//       });
//     }
    
//     if (!endTime || isNaN(parseInt(endTime))) {
//       return res.status(400).json({
//         success: false,
//         outcome: null,
//         reason: 'Valid endTime timestamp is required',
//         confidence: 0,
//         apiError: false
//       });
//     }
    
//     console.log('✅ Resolution parameters validated, calling OpenAI...');
    
//     const resolution = await resolveWithOpenAI({
//       question: question.trim(),
//       endTime: parseInt(endTime),
//       marketId: marketId || 'unknown'
//     });
    
//     console.log('🎯 Final resolution result:', resolution);
    
//     res.json(resolution);

//   } catch (error) {
//     console.error('💥 Resolution endpoint error:', error);
//     res.status(500).json({ 
//       success: false,
//       outcome: null,
//       reason: 'Internal server error during resolution',
//       confidence: 0,
//       apiError: true,
//       error: error.message 
//     });
//   }
// });

// // API health status endpoint
// app.get('/api/health-status', (req, res) => {
//   res.json({
//     api: 'OpenAI',
//     status: apiHealth.isHealthy ? 'HEALTHY' : 'UNHEALTHY',
//     lastChecked: apiHealth.lastChecked,
//     lastError: apiHealth.lastError,
//     timestamp: new Date().toISOString()
//   });
// });

// // Manual API health check endpoint
// app.post('/api/health-check', async (req, res) => {
//   const healthResult = await checkAPIHealth();
//   res.json({
//     healthy: healthResult.healthy,
//     status: healthResult.healthy ? 'HEALTHY' : 'UNHEALTHY',
//     lastChecked: apiHealth.lastChecked,
//     lastError: apiHealth.lastError
//   });
// });

// // Manual resolution endpoint
// app.post('/api/admin/resolve-market/:marketId', async (req, res) => {
//   try {
//     const { marketId } = req.params;
//     console.log(`🛠️ Manual resolution requested for market ${marketId}`);
    
//     if (!resolutionService) {
//       return res.status(500).json({ 
//         success: false, 
//         error: 'Resolution service not initialized' 
//       });
//     }
    
//     const result = await resolutionService.resolveMarket(marketId);
//     res.json(result);
//   } catch (error) {
//     console.error('Admin resolution error:', error);
//     res.status(500).json({ success: false, error: error.message });
//   }
// });

// // Get categories endpoint
// app.get('/api/categories', (req, res) => {
//   res.json(CATEGORIES);
// });

// // Health check endpoint
// app.get('/health', (req, res) => {
//   res.json({ 
//     status: 'ok', 
//     timestamp: new Date().toISOString(),
//     nodeVersion: process.version,
//     categories: Object.keys(CATEGORIES).length,
//     services: {
//       validation: 'active',
//       resolution: 'active',
//       blockchain: resolutionService ? 'connected' : 'disconnected',
//       openaiAPI: apiHealth.isHealthy ? 'healthy' : 'unhealthy'
//     },
//     apiHealth: {
//       status: apiHealth.isHealthy ? 'HEALTHY' : 'UNHEALTHY',
//       lastChecked: apiHealth.lastChecked
//     }
//   });
// });

// // ==================== SERVER INITIALIZATION ====================

// const PORT = process.env.PORT || 3001;
// let resolutionService;

// const initializeServer = async () => {
//   try {
//     // Perform initial API health check
//     console.log('🔍 Performing initial OpenAI API health check...');
//     await checkAPIHealth();

//     // Initialize blockchain resolution service if credentials are provided
//     if (process.env.BLOCKCHAIN_RPC_URL && process.env.CONTRACT_ADDRESS && process.env.RESOLVER_PRIVATE_KEY) {
//       console.log('🔗 Initializing blockchain connection...');
      
//       const provider = new ethers.JsonRpcProvider(process.env.BLOCKCHAIN_RPC_URL);
//       resolutionService = new MarketResolutionService(
//         provider,
//         process.env.CONTRACT_ADDRESS,
//         process.env.RESOLVER_PRIVATE_KEY
//       );
      
//       // Start monitoring blockchain events using polling instead of event listeners
//       await resolutionService.startMonitoring();
      
//       // Start cron job for periodic resolution processing
//       cron.schedule('*/10 * * * *', async () => {
//         console.log('⏰ Running scheduled resolution processing...');
//         try {
//           await resolutionService.processAllPendingResolutions();
//         } catch (error) {
//           console.error('Scheduled resolution error:', error);
//         }
//       });
      
//       console.log('✅ Blockchain resolution service initialized');
//     } else {
//       console.log('⚠️ Blockchain credentials not provided - running in validation-only mode');
//     }

//     // Start periodic API health checks
//     cron.schedule('*/5 * * * *', async () => {
//       console.log('🩺 Running scheduled API health check...');
//       await checkAPIHealth();
//     });

//     // Start the server
//     app.listen(PORT, () => {
//       console.log(`🚀 Enhanced Prediction Market AI Server running on port ${PORT}`);
//       console.log(`📋 Health check: http://localhost:${PORT}/health`);
//       console.log(`🔍 API Status: http://localhost:${PORT}/api/health-status`);
//       console.log(`🤖 Services: Validation ✅ | Resolution ✅ | Categories ✅`);
//       console.log(`🔑 AI Provider: OpenAI GPT-4`);
//       console.log(`🔧 API Health: ${apiHealth.isHealthy ? 'HEALTHY ✅' : 'UNHEALTHY ❌'}`);
//       if (resolutionService) {
//         console.log(`🔗 Blockchain: Polling ✅ | Auto-resolution ✅`);
//       }
//       console.log(`🌐 CORS enabled for: ${corsOptions.origin.join(', ')}`);
//     });

//   } catch (error) {
//     console.error('💥 Failed to initialize server:', error);
//     process.exit(1);
//   }
// };

// // Define categories for prediction markets
// const CATEGORIES = {
//   CRYPTO: "Cryptocurrency & Blockchain",
//   POLITICS: "Politics & Governance", 
//   SPORTS: "Sports & Competitions",
//   TECHNOLOGY: "Technology & AI",
//   FINANCE: "Finance & Economics",
//   ENTERTAINMENT: "Entertainment & Media",
//   SCIENCE: "Science & Health",
//   WORLD: "World Events",
//   OTHER: "Other"
// };

// // Graceful shutdown
// process.on('SIGINT', async () => {
//   console.log('\n🛑 Shutting down gracefully...');
//   if (resolutionService) {
//     resolutionService.stopMonitoring();
//   }
//   process.exit(0);
// });

// process.on('SIGTERM', async () => {
//   console.log('\n🛑 Shutting down gracefully...');
//   if (resolutionService) {
//     resolutionService.stopMonitoring();
//   }
//   process.exit(0);
// });

// initializeServer();

