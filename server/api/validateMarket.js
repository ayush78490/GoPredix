require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { ethers } = require('ethers');
const cron = require('node-cron');

// Use native fetch for Node.js 18+, otherwise use node-fetch
let fetch;
if (parseInt(process.versions.node.split('.')[0]) < 18) {
  fetch = require('node-fetch');
} else {
  fetch = globalThis.fetch;
}

const app = express();

// Enhanced CORS configuration
const corsOptions = {
  origin: [
    'https://sigma-predection.vercel.app',
    'https://gopredix.vercel.app',
    'https://sigma-prediction.vercel.app',
    'https://www.gopredix.xyz',
    'http://localhost:3000',
    'http://localhost:3001',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:3001'
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'Origin'
  ],
  credentials: true,
  optionsSuccessStatus: 200
};

// Apply CORS middleware
app.use(cors(corsOptions));

// Handle preflight requests
app.options('*', cors(corsOptions));

app.use(bodyParser.json());

// Use both API keys
const PPLX_API_KEYS = [
  process.env.PERPLEXITY_API_KEY1,
  process.env.PERPLEXITY_API_KEY
].filter(key => key && key.trim() !== ''); // Remove empty or undefined keys

if (PPLX_API_KEYS.length === 0) {
  console.error('❌ No Perplexity API keys found in environment variables');
  process.exit(1);
}

console.log(`🔑 Loaded ${PPLX_API_KEYS.length} API keys`);

// API Health state tracking
let apiHealth = {
  lastChecked: null,
  isHealthy: true,
  lastError: null,
  currentKeyIndex: 0,
  keyStatus: PPLX_API_KEYS.map((_, index) => ({ index, healthy: true, lastUsed: null, errors: 0 }))
};

// ==================== API KEY MANAGEMENT ====================

function getCurrentAPIKey() {
  return PPLX_API_KEYS[apiHealth.currentKeyIndex];
}

function rotateAPIKey() {
  const oldIndex = apiHealth.currentKeyIndex;
  apiHealth.currentKeyIndex = (apiHealth.currentKeyIndex + 1) % PPLX_API_KEYS.length;
  console.log(`🔄 Rotated API key from index ${oldIndex} to ${apiHealth.currentKeyIndex}`);
  
  // Mark the old key as potentially unhealthy
  if (PPLX_API_KEYS.length > 1) {
    apiHealth.keyStatus[oldIndex].healthy = false;
    apiHealth.keyStatus[oldIndex].errors++;
  }
  
  return getCurrentAPIKey();
}

function markCurrentKeyHealthy() {
  apiHealth.keyStatus[apiHealth.currentKeyIndex].healthy = true;
  apiHealth.keyStatus[apiHealth.currentKeyIndex].lastUsed = new Date().toISOString();
  apiHealth.keyStatus[apiHealth.currentKeyIndex].errors = 0;
}

function markCurrentKeyUnhealthy(error) {
  apiHealth.keyStatus[apiHealth.currentKeyIndex].healthy = false;
  apiHealth.keyStatus[apiHealth.currentKeyIndex].lastUsed = new Date().toISOString();
  apiHealth.keyStatus[apiHealth.currentKeyIndex].errors++;
  apiHealth.lastError = error;
}

function getHealthyAPIKey() {
  // If current key is healthy, use it
  if (apiHealth.keyStatus[apiHealth.currentKeyIndex].healthy) {
    return getCurrentAPIKey();
  }
  
  // Otherwise, find a healthy key
  const healthyKey = apiHealth.keyStatus.find(status => status.healthy);
  if (healthyKey) {
    apiHealth.currentKeyIndex = healthyKey.index;
    return getCurrentAPIKey();
  }
  
  // If no healthy keys, rotate to next one
  return rotateAPIKey();
}

// ==================== API HEALTH CHECK ====================

async function checkAPIHealth() {
  try {
    console.log('🏥 Checking API health with model verification...');

    // FIXED: Use current valid Perplexity API models (2025)
    const possibleModels = [
      'sonar',              // Lightweight, fast search model
      'sonar-pro',          // Advanced search with more citations
      'sonar-reasoning',    // Reasoning with search capabilities
      'sonar-reasoning-pro' // Advanced reasoning (DeepSeek R1 based)
    ];

    const currentKey = getHealthyAPIKey();
    
    for (const model of possibleModels) {
      console.log(`🔍 Trying model: ${model} with key index: ${apiHealth.currentKeyIndex}`);

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);

        const response = await fetch('https://api.perplexity.ai/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${currentKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: model,
            messages: [
              { 
                role: 'user', 
                content: 'Respond with only: OK' 
              }
            ],
            max_tokens: 5,
            temperature: 0
          }),
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          const data = await response.json();
          console.log(`✅ SUCCESS with model: ${model} and key index: ${apiHealth.currentKeyIndex}`);
          
          markCurrentKeyHealthy();
          apiHealth.isHealthy = true;
          apiHealth.lastChecked = new Date().toISOString();
          
          return {
            healthy: true,
            workingModel: model,
            keyIndex: apiHealth.currentKeyIndex,
            response: data
          };
        } else {
          const errorText = await response.text();
          console.log(`❌ Model ${model} failed with key ${apiHealth.currentKeyIndex}: ${response.status} - ${errorText}`);
          
          if (response.status === 401 || response.status === 429) {
            markCurrentKeyUnhealthy(`API key error: ${response.status}`);
            // Try with next key
            if (PPLX_API_KEYS.length > 1) {
              const nextKey = rotateAPIKey();
              console.log(`🔄 Retrying with next API key: index ${apiHealth.currentKeyIndex}`);
              continue; // Continue with next model but with new key
            }
          }
        }
      } catch (error) {
        console.log(`❌ Model ${model} error with key ${apiHealth.currentKeyIndex}:`, error.message);
      }
    }

    // If all models failed, mark current key as unhealthy and try next one
    markCurrentKeyUnhealthy('All model attempts failed');
    if (PPLX_API_KEYS.length > 1) {
      console.log('🔄 All models failed with current key, rotating to next key...');
      rotateAPIKey();
    }
    
    throw new Error('All model attempts failed with all keys');
    
  } catch (error) {
    console.error('💥 All health checks failed:', error.message);
    apiHealth.isHealthy = false;
    apiHealth.lastChecked = new Date().toISOString();
    
    return {
      healthy: false,
      workingModel: null,
      keyIndex: apiHealth.currentKeyIndex,
      error: error.message
    };
  }
}

// ==================== ENHANCED API CALL FUNCTION ====================

async function makePerplexityAPICall(messages, model = 'sonar-pro', maxTokens = 500, temperature = 0.1) {
  // FIXED: Changed default model to 'sonar-pro' (was 'llama-3-sonar-large-32k-online')
  const maxRetries = PPLX_API_KEYS.length * 2; // Allow retries with different keys
  let lastError;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const currentKey = getHealthyAPIKey();
    console.log(`📤 API Call Attempt ${attempt + 1} with key index: ${apiHealth.currentKeyIndex}`);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      const response = await fetch('https://api.perplexity.ai/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${currentKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: model,
          messages: messages,
          max_tokens: maxTokens,
          temperature: temperature
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        console.log(`✅ API call successful with key index: ${apiHealth.currentKeyIndex}`);
        
        markCurrentKeyHealthy();
        apiHealth.isHealthy = true;
        apiHealth.lastChecked = new Date().toISOString();
        
        return data;
      } else {
        const errorText = await response.text();
        console.error(`❌ API call failed with key ${apiHealth.currentKeyIndex}: ${response.status}`, errorText);
        
        lastError = new Error(`Perplexity API returned ${response.status}: ${errorText}`);
        
        if (response.status === 401 || response.status === 429) {
          markCurrentKeyUnhealthy(`API key error: ${response.status}`);
          if (PPLX_API_KEYS.length > 1) {
            console.log(`🔄 Rotating API key due to error ${response.status}`);
            rotateAPIKey();
            continue; // Retry with next key
          }
        }
        
        // Update API health status
        apiHealth.isHealthy = false;
        apiHealth.lastChecked = new Date().toISOString();
        apiHealth.lastError = lastError.message;
        
        throw lastError;
      }
    } catch (error) {
      console.error(`❌ API call error with key ${apiHealth.currentKeyIndex}:`, error.message);
      lastError = error;
      
      markCurrentKeyUnhealthy(error.message);
      
      if (PPLX_API_KEYS.length > 1 && attempt < maxRetries - 1) {
        console.log('🔄 Rotating API key and retrying...');
        rotateAPIKey();
        continue;
      }
    }
  }

  // If we get here, all retries failed
  apiHealth.isHealthy = false;
  apiHealth.lastChecked = new Date().toISOString();
  apiHealth.lastError = lastError?.message || 'All API calls failed';
  
  throw lastError || new Error('All API call attempts failed');
}

// ==================== ENHANCED MARKET VALIDATION ====================

async function validateWithPerplexity({ question, endTime, initialYes, initialNo }) {
  // Check API health first
  const healthCheck = await checkAPIHealth();
  
  if (!healthCheck.healthy) {
    console.log('🚫 API is unhealthy - rejecting market validation');
    return {
      valid: false,
      reason: 'AI validation service is currently unavailable. Please try again later.',
      category: 'OTHER',
      apiError: true,
      apiHealth: apiHealth
    };
  }

  try {
    console.log('🤖 Starting AI validation for question:', question);
    
    const systemPrompt = `You are a prediction market validator. Analyze if a question is suitable for a prediction market.

CRITERIA FOR VALID QUESTIONS:
✅ MUST be objectively verifiable with clear YES/NO outcome
✅ MUST have specific resolution criteria
✅ MUST be about future events
✅ MUST be based on publicly available information
✅ MUST be unambiguous and specific

CRITERIA FOR INVALID QUESTIONS:
❌ Subjective opinions ("Is this good?")
❌ Already resolved events
❌ Personal/private matters
❌ Impossible to verify
❌ Multiple questions combined
❌ Vague or ambiguous phrasing

CATEGORIES:
- Cryptocurrency & Blockchain: Bitcoin, Ethereum, crypto regulations, blockchain tech
- Politics & Governance: Elections, policies, legislation, political events
- Sports & Competitions: Sports outcomes, tournaments, player performances
- Technology & AI: Tech launches, AI developments, software releases
- Finance & Economics: Stock markets, economic indicators, company earnings
- Entertainment & Media: Movie releases, awards, celebrity news
- Science & Health: Scientific discoveries, medical breakthroughs, space events
- World Events: Natural disasters, international conflicts, global summits
- Other: Everything else

Respond with JSON only: {valid: boolean, reason: string, category: string}`;

    const userPrompt = `Analyze this prediction market question: "${question}"

Resolution time: ${new Date(endTime * 1000).toISOString()}
Initial liquidity: YES ${initialYes} BNB, NO ${initialNo} BNB

Is this a valid prediction market question? Which category does it belong to?`;

    console.log('📤 Calling Perplexity API...');
    
    // FIXED: Changed model to 'sonar-pro'
    const data = await makePerplexityAPICall([
      { 
        role: 'system', 
        content: systemPrompt 
      },
      { 
        role: 'user', 
        content: userPrompt 
      }
    ], 'sonar-pro', 500, 0.1);
    
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      throw new Error('Invalid response format from Perplexity API');
    }

    const aiText = data.choices[0].message.content;
    console.log('🤖 AI analysis text:', aiText);

    // Try to extract JSON from the response
    try {
      const jsonMatch = aiText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const result = JSON.parse(jsonMatch[0]);
        console.log('✅ Parsed AI validation result:', result);
        
        // Validate and map category
        let category = result.category || 'OTHER';
        category = category.toUpperCase().replace(/[^A-Z]/g, '');
        
        if (!CATEGORIES[category]) {
          const matchedCategory = Object.keys(CATEGORIES).find(cat => 
            result.category?.toLowerCase().includes(cat.toLowerCase()) ||
            cat.toLowerCase().includes(result.category?.toLowerCase())
          );
          category = matchedCategory || 'OTHER';
        }
        
        return {
          valid: Boolean(result.valid),
          reason: result.reason || 'No reason provided by AI',
          category: category,
          apiError: false
        };
      } else {
        console.log('⚠️ No JSON found in response, analyzing text...');
        return analyzeTextResponse(aiText, question);
      }
    } catch (parseError) {
      console.error('❌ JSON parse error:', parseError);
      return analyzeTextResponse(aiText, question);
    }

  } catch (error) {
    console.error('❌ Error in validateWithPerplexity:', error);
    
    // Return API error response instead of falling back to basic validation
    return {
      valid: false,
      reason: 'AI validation service is temporarily unavailable. Please try again in a few moments.',
      category: 'OTHER',
      apiError: true,
      apiHealth: apiHealth
    };
  }
}

function analyzeTextResponse(aiText, question) {
  const lowerText = aiText.toLowerCase();
  const lowerQuestion = question.toLowerCase();
  
  const positiveIndicators = [
    'valid', 'appropriate', 'suitable', 'good question', 'clear', 
    'well-defined', 'objective', 'verifiable'
  ];
  
  const negativeIndicators = [
    'invalid', 'not suitable', 'inappropriate', 'ambiguous', 
    'subjective', 'unclear', 'cannot be verified', 'vague'
  ];
  
  const positiveCount = positiveIndicators.filter(indicator => 
    lowerText.includes(indicator)
  ).length;
  
  const negativeCount = negativeIndicators.filter(indicator => 
    lowerText.includes(indicator)
  ).length;
  
  const category = determineCategory(question);
  
  if (positiveCount > negativeCount) {
    return {
      valid: true,
      reason: 'AI analysis indicates this is a valid question',
      category: category,
      apiError: false
    };
  } else if (negativeCount > positiveCount) {
    return {
      valid: false,
      reason: 'AI analysis indicates issues with this question',
      category: category,
      apiError: false
    };
  } else {
    return {
      valid: false,
      reason: 'Unable to determine validity from AI analysis',
      category: category,
      apiError: false
    };
  }
}

function determineCategory(question) {
  const lowerQuestion = question.toLowerCase();
  
  const categoryKeywords = {
    CRYPTO: ['bitcoin', 'ethereum', 'crypto', 'blockchain', 'btc', 'eth', 'defi', 'nft', 'token'],
    POLITICS: ['election', 'president', 'government', 'policy', 'senate', 'congress', 'vote'],
    SPORTS: ['game', 'match', 'tournament', 'championship', 'olympics', 'team', 'player'],
    TECHNOLOGY: ['launch', 'release', 'update', 'software', 'hardware', 'ai', 'artificial intelligence'],
    FINANCE: ['stock', 'market', 'earnings', 'economic', 'gdp', 'inflation', 'interest rate'],
    ENTERTAINMENT: ['movie', 'film', 'oscar', 'award', 'celebrity', 'music', 'album'],
    SCIENCE: ['discovery', 'research', 'study', 'medical', 'health', 'space', 'nasa'],
    WORLD: ['earthquake', 'hurricane', 'summit', 'conference', 'international', 'global']
  };
  
  for (const [category, keywords] of Object.entries(categoryKeywords)) {
    if (keywords.some(keyword => lowerQuestion.includes(keyword))) {
      return category;
    }
  }
  
  return 'OTHER';
}

// ==================== MARKET RESOLUTION ====================

async function resolveWithPerplexity({ question, endTime, marketId }) {
  // Check API health first
  const healthCheck = await checkAPIHealth();
  
  if (!healthCheck.healthy) {
    console.log('🚫 API is unhealthy - cannot resolve market');
    return {
      success: false,
      outcome: null,
      reason: 'AI resolution service is currently unavailable. Please try again later.',
      confidence: 0,
      sources: ['Service unavailable'],
      resolvedAt: new Date().toISOString(),
      apiError: true
    };
  }

  try {
    console.log('🤖 Starting AI resolution for question:', question);
    
    const systemPrompt = `You are a prediction market resolver. Determine the correct YES/NO outcome for a prediction market question based on real-world facts.

RESOLUTION CRITERIA:
✅ Answer must be based on VERIFIABLE REAL-WORLD FACTS
✅ Use publicly available information and credible sources
✅ Consider the question's specific timeframe and conditions
✅ Be objective and factual, not subjective
✅ If outcome is unclear or not yet determined, return null

RESPONSE FORMAT:
{
  "outcome": boolean|null, // true for YES, false for NO, null if unclear
  "reason": string,        // Detailed explanation of the determination
  "confidence": number,    // 0-100 scale of confidence in the answer
  "sources": string[],     // Types of sources used for verification
  "resolvedAt": string     // ISO timestamp of resolution
}`;

    const userPrompt = `Determine the outcome for this prediction market question: "${question}"

Market ended at: ${new Date(endTime * 1000).toISOString()}
Current time: ${new Date().toISOString()}

What is the verifiable outcome? Answer YES (true), NO (false), or NULL if outcome cannot be determined yet.`;

    console.log('📤 Calling Perplexity API for resolution...');
    
    // FIXED: Changed model to 'sonar-pro'
    const data = await makePerplexityAPICall([
      { 
        role: 'system', 
        content: systemPrompt 
      },
      { 
        role: 'user', 
        content: userPrompt 
      }
    ], 'sonar-pro', 1000, 0.1);
    
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      throw new Error('Invalid response format from Perplexity API');
    }

    const aiText = data.choices[0].message.content;
    console.log('🤖 AI resolution text:', aiText);

    try {
      const jsonMatch = aiText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const result = JSON.parse(jsonMatch[0]);
        console.log('✅ Parsed AI resolution result:', result);
        
        return {
          success: true,
          outcome: result.outcome,
          reason: result.reason || 'No reason provided by AI',
          confidence: result.confidence || 0,
          sources: result.sources || ['AI analysis'],
          resolvedAt: result.resolvedAt || new Date().toISOString(),
          apiError: false
        };
      } else {
        console.log('⚠️ No JSON found in resolution response, analyzing text...');
        return analyzeResolutionText(aiText, question);
      }
    } catch (parseError) {
      console.error('❌ JSON parse error in resolution:', parseError);
      return analyzeResolutionText(aiText, question);
    }

  } catch (error) {
    console.error('❌ Error in resolveWithPerplexity:', error);
    
    return {
      success: false,
      outcome: null,
      reason: 'AI resolution service is temporarily unavailable. Please try again later.',
      confidence: 0,
      sources: ['Service unavailable'],
      resolvedAt: new Date().toISOString(),
      apiError: true
    };
  }
}

function analyzeResolutionText(aiText, question) {
  const lowerText = aiText.toLowerCase();
  
  const yesIndicators = [
    'yes', 'true', 'correct', 'happened', 'occurred', 'success', 'achieved',
    'reached', 'completed', 'won', 'passed', 'approved'
  ];
  
  const noIndicators = [
    'no', 'false', 'incorrect', 'did not happen', 'failed', 'not achieved',
    'lost', 'rejected', 'denied', 'missed'
  ];
  
  const unclearIndicators = [
    'unclear', 'unknown', 'not yet', 'pending', 'too early', 'cannot determine',
    'ambiguous', 'uncertain'
  ];
  
  const yesCount = yesIndicators.filter(indicator => lowerText.includes(indicator)).length;
  const noCount = noIndicators.filter(indicator => lowerText.includes(indicator)).length;
  const unclearCount = unclearIndicators.filter(indicator => lowerText.includes(indicator)).length;
  
  let outcome = null;
  let confidence = 50;
  
  if (yesCount > noCount && yesCount > unclearCount) {
    outcome = true;
    confidence = Math.min(80, yesCount * 20);
  } else if (noCount > yesCount && noCount > unclearCount) {
    outcome = false;
    confidence = Math.min(80, noCount * 20);
  } else if (unclearCount > 0) {
    outcome = null;
    confidence = 30;
  }
  
  return {
    success: true,
    outcome: outcome,
    reason: 'AI analysis based on text response',
    confidence: confidence,
    sources: ['Text analysis fallback'],
    resolvedAt: new Date().toISOString(),
    apiError: false
  };
}

// ==================== BLOCKCHAIN RESOLUTION SERVICE ====================

class MarketResolutionService {
  constructor(provider, contractAddress, privateKey) {
    this.provider = provider;
    this.wallet = new ethers.Wallet(privateKey, provider);
    this.contract = new ethers.Contract(
      contractAddress,
      [
        'function resolveMarket(uint256, bool, string, uint256)',
        'function markets(uint256) view returns (address, string, string, uint256, uint8, uint8, address, address, uint256, uint256, uint256, uint256, uint256, uint256, uint256, string, uint256, address, string)',
        'function resolutionRequested(uint256) view returns (bool)',
        'function nextMarketId() view returns (uint256)',
        'event ResolutionRequested(uint256 indexed marketId, address requester, uint256 requestedAt)'
      ],
      this.wallet
    );
  }

  startMonitoring() {
    console.log('🚀 Starting blockchain event monitoring...');
    
    this.contract.on('ResolutionRequested', async (marketId, requester, requestedAt, event) => {
      console.log(`📢 Resolution requested for market ${marketId.toString()} by ${requester}`);
      
      try {
        await this.resolveMarket(marketId.toString());
      } catch (error) {
        console.error(`Error resolving market ${marketId}:`, error);
      }
    });

    console.log('✅ Blockchain event listener active');
  }

  async resolveMarket(marketId) {
    try {
      console.log(`🔍 Starting resolution for market ${marketId}...`);
      
      // Get market details from blockchain
      const market = await this.contract.markets(marketId);
      const [
        creator, question, category, endTime, status, outcome, 
        yesToken, noToken, yesPool, noPool, lpTotalSupply, 
        totalBacking, platformFees, resolutionRequestedAt, 
        disputeDeadline, resolutionReason, resolutionConfidence, 
        disputer, disputeReason
      ] = market;

      // Check if market has ended
      const currentTime = Math.floor(Date.now() / 1000);
      if (currentTime < parseInt(endTime)) {
        console.log(`Market ${marketId} has not ended yet`);
        return { success: false, reason: 'Market not ended' };
      }

      // Check if resolution was requested
      const resolutionRequested = await this.contract.resolutionRequested(marketId);
      if (!resolutionRequested) {
        console.log(`Resolution not requested for market ${marketId}`);
        return { success: false, reason: 'Resolution not requested' };
      }

      console.log(`✅ Market ${marketId} ready for resolution. Calling AI...`);

      // Call AI resolution
      const resolution = await this.callAIResolution({
        question: question,
        endTime: parseInt(endTime),
        marketId: marketId
      });

      console.log(`🤖 AI Resolution for market ${marketId}:`, resolution);

      // Check if resolution failed due to API error
      if (resolution.apiError) {
        console.log(`🚫 Cannot resolve market ${marketId} due to API unavailability`);
        return { 
          success: false, 
          reason: 'AI resolution service unavailable',
          apiError: true
        };
      }

      // Only resolve if AI has high confidence
      if (resolution.outcome !== null && resolution.confidence >= 70) {
        // Call the contract to record the resolution
        const tx = await this.contract.resolveMarket(
          marketId,
          resolution.outcome,
          resolution.reason,
          resolution.confidence
        );

        console.log(`⏳ Waiting for transaction confirmation: ${tx.hash}`);
        const receipt = await tx.wait();
        
        console.log(`✅ Market ${marketId} resolved: ${resolution.outcome ? 'YES' : 'NO'} (${resolution.confidence}% confidence)`);
        
        return { 
          success: true, 
          outcome: resolution.outcome, 
          txHash: tx.hash,
          confidence: resolution.confidence
        };
      } else {
        console.log(`❓ Market ${marketId} - Low confidence or unclear outcome`);
        return { 
          success: false, 
          reason: 'Low confidence or unclear outcome', 
          resolution: resolution 
        };
      }

    } catch (error) {
      console.error(`💥 Error resolving market ${marketId}:`, error);
      throw error;
    }
  }

  async callAIResolution(marketData) {
    try {
      const response = await fetch('http://localhost:3001/api/resolve-market', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(marketData),
        timeout: 30000
      });

      if (!response.ok) {
        throw new Error(`AI server returned ${response.status}: ${await response.text()}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error calling AI resolution server:', error);
      return {
        success: false,
        outcome: null,
        reason: 'AI resolution service unavailable',
        confidence: 0,
        sources: ['Service unavailable'],
        resolvedAt: new Date().toISOString(),
        apiError: true
      };
    }
  }

  async processAllPendingResolutions() {
    try {
      console.log('🔄 Processing all pending resolutions...');
      
      // Get total market count
      const nextId = await this.contract.nextMarketId();
      const marketCount = parseInt(nextId);
      
      console.log(`📊 Checking ${marketCount} markets for resolution...`);

      for (let i = 0; i < marketCount; i++) {
        try {
          const market = await this.contract.markets(i);
          const [creator, question, category, endTime, status] = market;
          
          // Check if market has ended and needs resolution
          const currentTime = Math.floor(Date.now() / 1000);
          const resolutionRequested = await this.contract.resolutionRequested(i);
          
          if (currentTime >= parseInt(endTime) && resolutionRequested && status === 2) { // ResolutionRequested status
            console.log(`🔄 Processing market ${i} for resolution...`);
            await this.resolveMarket(i.toString());
            
            // Add delay to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
        } catch (error) {
          console.error(`Failed to process market ${i}:`, error.message);
          continue;
        }
      }
      
      console.log('✅ Finished processing pending resolutions');
    } catch (error) {
      console.error('Error in processAllPendingResolutions:', error);
    }
  }
}

// ==================== API ENDPOINTS ====================

// Market validation endpoint
app.post('/api/validate-market', async (req, res) => {
  try {
    console.log('📨 Validation request received:', req.body);
    
    const { question, endTime, initialYes, initialNo } = req.body;
    
    if (!question || typeof question !== 'string') {
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
    
    const endTimeNum = parseInt(endTime);
    const yesAmount = parseFloat(initialYes);
    const noAmount = parseFloat(initialNo);
    
    const now = Math.floor(Date.now() / 1000);
    const oneHourFromNow = now + 3600;
    
    if (endTimeNum <= oneHourFromNow) {
      return res.status(400).json({
        valid: false,
        reason: 'End time must be at least 1 hour from now',
        category: 'OTHER',
        apiError: false
      });
    }
    
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
    
    console.log('✅ Parameter validation passed, calling AI...');
    
    const validation = await validateWithPerplexity({
      question: question.trim(),
      endTime: endTimeNum,
      initialYes: initialYes.toString(),
      initialNo: initialNo.toString()
    });
    
    console.log('🎯 Final validation result:', validation);
    
    res.json(validation);

  } catch (error) {
    console.error('💥 Validation endpoint error:', error);
    res.status(500).json({ 
      valid: false, 
      reason: 'Internal server error during validation',
      category: 'OTHER',
      apiError: true,
      error: error.message 
    });
  }
});

// Market resolution endpoint
app.post('/api/resolve-market', async (req, res) => {
  try {
    console.log('🔍 Resolution request received:', req.body);
    
    const { question, endTime, marketId } = req.body;
    
    if (!question || typeof question !== 'string') {
      return res.status(400).json({ 
        success: false,
        outcome: null,
        reason: 'Valid question string is required',
        confidence: 0,
        apiError: false
      });
    }
    
    if (!endTime || isNaN(parseInt(endTime))) {
      return res.status(400).json({
        success: false,
        outcome: null,
        reason: 'Valid endTime timestamp is required',
        confidence: 0,
        apiError: false
      });
    }
    
    console.log('✅ Resolution parameters validated, calling AI...');
    
    const resolution = await resolveWithPerplexity({
      question: question.trim(),
      endTime: parseInt(endTime),
      marketId: marketId || 'unknown'
    });
    
    console.log('🎯 Final resolution result:', resolution);
    
    res.json(resolution);

  } catch (error) {
    console.error('💥 Resolution endpoint error:', error);
    res.status(500).json({ 
      success: false,
      outcome: null,
      reason: 'Internal server error during resolution',
      confidence: 0,
      apiError: true,
      error: error.message 
    });
  }
});

// API health status endpoint
app.get('/api/health-status', (req, res) => {
  res.json({
    api: 'Perplexity AI',
    status: apiHealth.isHealthy ? 'HEALTHY' : 'UNHEALTHY',
    lastChecked: apiHealth.lastChecked,
    lastError: apiHealth.lastError,
    currentKeyIndex: apiHealth.currentKeyIndex,
    totalKeys: PPLX_API_KEYS.length,
    keyStatus: apiHealth.keyStatus,
    timestamp: new Date().toISOString()
  });
});

// Manual API health check endpoint
app.post('/api/health-check', async (req, res) => {
  const healthResult = await checkAPIHealth();
  res.json({
    healthy: healthResult.healthy,
    status: healthResult.healthy ? 'HEALTHY' : 'UNHEALTHY',
    workingModel: healthResult.workingModel,
    keyIndex: healthResult.keyIndex,
    lastChecked: apiHealth.lastChecked,
    lastError: apiHealth.lastError,
    keyStatus: apiHealth.keyStatus
  });
});

// Manual resolution endpoint
app.post('/api/admin/resolve-market/:marketId', async (req, res) => {
  try {
    const { marketId } = req.params;
    console.log(`🛠️ Manual resolution requested for market ${marketId}`);
    
    if (!resolutionService) {
      return res.status(500).json({ 
        success: false, 
        error: 'Resolution service not initialized' 
      });
    }
    
    const result = await resolutionService.resolveMarket(marketId);
    res.json(result);
  } catch (error) {
    console.error('Admin resolution error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get categories endpoint
app.get('/api/categories', (req, res) => {
  res.json(CATEGORIES);
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    nodeVersion: process.version,
    categories: Object.keys(CATEGORIES).length,
    services: {
      validation: 'active',
      resolution: 'active',
      blockchain: resolutionService ? 'connected' : 'disconnected',
      perplexityAPI: apiHealth.isHealthy ? 'healthy' : 'unhealthy'
    },
    apiHealth: {
      status: apiHealth.isHealthy ? 'HEALTHY' : 'UNHEALTHY',
      currentKeyIndex: apiHealth.currentKeyIndex,
      totalKeys: PPLX_API_KEYS.length,
      lastChecked: apiHealth.lastChecked
    }
  });
});

// ==================== SERVER INITIALIZATION ====================

const PORT = process.env.PORT || 3001;
let resolutionService;

const initializeServer = async () => {
  try {
    // Perform initial API health check
    console.log('🔍 Performing initial API health check...');
    await checkAPIHealth();

    // Initialize blockchain resolution service if credentials are provided
    if (process.env.BLOCKCHAIN_RPC_URL && process.env.CONTRACT_ADDRESS && process.env.RESOLVER_PRIVATE_KEY) {
      console.log('🔗 Initializing blockchain connection...');
      
      const provider = new ethers.JsonRpcProvider(process.env.BLOCKCHAIN_RPC_URL);
      resolutionService = new MarketResolutionService(
        provider,
        process.env.CONTRACT_ADDRESS,
        process.env.RESOLVER_PRIVATE_KEY
      );
      
      // Start monitoring blockchain events
      resolutionService.startMonitoring();
      
      // Start cron job for periodic resolution processing
      cron.schedule('*/10 * * * *', async () => {
        console.log('⏰ Running scheduled resolution processing...');
        try {
          await resolutionService.processAllPendingResolutions();
        } catch (error) {
          console.error('Scheduled resolution error:', error);
        }
      });
      
      console.log('✅ Blockchain resolution service initialized');
    } else {
      console.log('⚠️ Blockchain credentials not provided - running in validation-only mode');
    }

    // Start periodic API health checks
    cron.schedule('*/5 * * * *', async () => {
      console.log('🩺 Running scheduled API health check...');
      await checkAPIHealth();
    });

    // Start the server
    app.listen(PORT, () => {
      console.log(`🚀 Enhanced Prediction Market AI Server running on port ${PORT}`);
      console.log(`📋 Health check: http://localhost:${PORT}/health`);
      console.log(`🔍 API Status: http://localhost:${PORT}/api/health-status`);
      console.log(`🤖 Services: Validation ✅ | Resolution ✅ | Categories ✅`);
      console.log(`🔑 Available API Keys: ${PPLX_API_KEYS.length}`);
      console.log(`🔧 API Health: ${apiHealth.isHealthy ? 'HEALTHY ✅' : 'UNHEALTHY ❌'}`);
      console.log(`🔑 Current Key Index: ${apiHealth.currentKeyIndex}`);
      if (resolutionService) {
        console.log(`🔗 Blockchain: Monitoring ✅ | Auto-resolution ✅`);
      }
      console.log(`🌐 CORS enabled for: https://sigma-predection.vercel.app`);
    });

  } catch (error) {
    console.error('💥 Failed to initialize server:', error);
    process.exit(1);
  }
};

// Define categories for prediction markets
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

initializeServer();