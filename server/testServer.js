require('dotenv').config();
const express = require('express');
const cors = require('cors');
const OpenAI = require('openai');

const app = express();

// Initialize OpenAI
let openai;
function getOpenAIClient() {
  if (!openai) {
    if (!process.env.OPEN_AI_API_KEY) {
      throw new Error('OPEN_AI_API_KEY environment variable is not set');
    }
    openai = new OpenAI({
      apiKey: process.env.OPEN_AI_API_KEY,
    });
  }
  return openai;
}

// CORS configuration
const allowedOrigins = [
  'https://sigma-predection.vercel.app',
  'https://gopredix.vercel.app',
  'https://sigma-prediction.vercel.app',
  'https://www.gopredix.xyz',
  'http://localhost:3000',
  'http://localhost:3001'
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

app.use(express.json());

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
  const openaiClient = getOpenAIClient();

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await openaiClient.chat.completions.create({
        model: "gpt-4",
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
        console.log(`⏳ Rate limited, waiting ${waitTime}ms...`);
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

    const systemPrompt = `You are an advanced prediction market validator with strict criteria. Your job is to determine if a question is suitable for a prediction market.

CRITICAL VALIDATION RULES:

1. **HISTORICAL EVENT CHECK** (HIGHEST PRIORITY):
   - Determine if the event has ALREADY HAPPENED before today (${currentDate.toISOString()})
   - Check if the outcome is ALREADY KNOWN or publicly available
   - If the event already occurred and outcome is known, REJECT with reason "This event has already happened and the outcome is known"
   - Examples of events that already happened: "Did Bitcoin reach $100k in 2024?", "Who won the 2020 election?", "Did SpaceX launch Starship in March 2023?"

2. **DATE CONFLICT VALIDATION**:
   - Current date: ${currentDate.toISOString()}
   - Market end date: ${marketEndDate.toISOString()}
   - Days until market ends: ${daysUntilEnd}
   - If question mentions a specific date/time, it MUST be BEFORE the market end date
   - If the event date is AFTER market end date, REJECT
   - The event must be resolvable BEFORE or AT market end time

3. **FUTURE EVENT VALIDATION**:
   - The event MUST be about the FUTURE relative to today
   - The event MUST occur BEFORE the market end date
   - The outcome must be UNKNOWN at market creation time

4. **OBJECTIVE VERIFIABILITY**:
   - Must have clear YES/NO outcome
   - Must be verifiable through public sources
   - No subjective opinions ("Is X good?", "Will people like Y?")
   - No ambiguous phrasing

5. **SPECIFICITY REQUIREMENTS**:
   - Must be specific and well-defined
   - No vague terms without clear definitions
   - Must have clear resolution criteria
   - Single question only (no multiple parts)

6. **PROHIBITED CONTENT**:
   - No personal/private matters
   - No illegal activities
   - No harmful content
   - No manipulation attempts
   - No events impossible to verify

RESPONSE FORMAT (JSON only):
{
  "valid": boolean,
  "reason": string,
  "category": string,
  "eventAnalysis": {
    "alreadyHappened": boolean,
    "outcomeKnown": boolean,
    "eventDate": string | null,
    "dateConflict": boolean,
    "dateConflictReason": string,
    "timelineAnalysis": string
  },
  "validationDetails": {
    "isObjective": boolean,
    "isSpecific": boolean,
    "isVerifiable": boolean,
    "isFutureEvent": boolean
  }
}`;

    const userPrompt = `Analyze this prediction market question: "${question}"

TIMING CONTEXT:
- Today's date: ${currentDate.toDateString()} (${currentDate.toISOString()})
- Market end date: ${marketEndDate.toDateString()} (${marketEndDate.toISOString()})
- Time until market ends: ${daysUntilEnd} days
- Initial liquidity: YES ${initialYes} BNB, NO ${initialNo} BNB

CRITICAL CHECKS REQUIRED:
1. Has this event ALREADY HAPPENED? Is the outcome ALREADY KNOWN?
2. If the question mentions dates, are they before the market end date?
3. Is this about a FUTURE event that will be resolvable before market ends?
4. Is it objectively verifiable with clear YES/NO outcome?
5. Is it specific enough with clear resolution criteria?

Provide comprehensive analysis with particular focus on whether this event has already occurred.`;

    console.log('📤 Calling OpenAI for validation...');

    const response = await makeOpenAICall([
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt }
    ]);

    if (!response.choices || !response.choices[0] || !response.choices[0].message) {
      throw new Error('Invalid OpenAI response format');
    }

    const aiText = response.choices[0].message.content;
    console.log('🤖 OpenAI response received');

    // Parse JSON response
    let result;
    try {
      result = JSON.parse(aiText);
    } catch (parseError) {
      console.error('⚠️ JSON parse error, using fallback analysis');
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
    console.error('❌ Validation error:', error);

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
    CRYPTO: ['bitcoin', 'ethereum', 'crypto', 'blockchain', 'btc', 'eth', 'defi', 'nft', 'token', 'binance', 'bnb'],
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

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    env: {
      hasOpenAIKey: !!process.env.OPEN_AI_API_KEY,
      nodeVersion: process.version
    }
  });
});

// Validation endpoint
app.post('/api/validate-market', async (req, res) => {
  try {
    console.log('📨 Validation request received');

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

    console.log('✅ Input validation passed');

    // Call AI validation
    const validation = await validateWithOpenAI({
      question: question.trim(),
      endTime: endTimeNum,
      initialYes: initialYes.toString(),
      initialNo: initialNo.toString()
    });

    console.log('✅ Validation completed:', validation.valid ? 'VALID' : 'INVALID');

    return res.status(200).json(validation);

  } catch (error) {
    console.error('💥 Validation endpoint error:', error);
    
    return res.status(500).json({
      valid: false,
      reason: 'Internal server error during validation. Please try again.',
      category: 'OTHER',
      apiError: true,
      error: error.message
    });
  }
});

// Get categories endpoint
app.get('/api/categories', (req, res) => {
  res.json(CATEGORIES);
});

// Test endpoint
app.get('/test', (req, res) => {
  res.json({
    message: 'Test endpoint working',
    timestamp: new Date().toISOString()
  });
});

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║   🚀 Market Validator Server - Local Test Mode        ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');
  console.log(`📍 Server: http://localhost:${PORT}`);
  console.log(`🏥 Health: http://localhost:${PORT}/health`);
  console.log(`🧪 Test:   http://localhost:${PORT}/test`);
  console.log(`✅ Validate: POST http://localhost:${PORT}/api/validate-market`);
  console.log(`\n🔑 OpenAI API Key: ${process.env.OPEN_AI_API_KEY ? '✅ Found' : '❌ Missing'}`);
  console.log(`\n📚 Categories: ${Object.keys(CATEGORIES).length} available`);
  console.log(`🌐 CORS: ${allowedOrigins.length} origins allowed\n`);
  console.log('Ready to receive requests! 🎉\n');
});