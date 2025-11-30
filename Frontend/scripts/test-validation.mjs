
// Mocking necessary parts for the test
const console = {
    log: (...args) => process.stdout.write(args.join(' ') + '\n'),
    error: (...args) => process.stderr.write(args.join(' ') + '\n'),
};

const performBasicValidation = (question, endTime, initialYes, initialNo) => {
    const trimmedQuestion = question.trim()

    // Question structure validation
    if (!trimmedQuestion.includes('?')) {
        return {
            valid: false,
            reason: 'Question must end with a question mark',
            category: 'OTHER'
        }
    }

    if (trimmedQuestion.length < 10) {
        return {
            valid: false,
            reason: 'Question must be at least 10 characters long',
            category: 'OTHER'
        }
    }

    if (trimmedQuestion.length > 280) {
        return {
            valid: false,
            reason: 'Question must be less than 280 characters',
            category: 'OTHER'
        }
    }

    // Check for multiple questions
    if ((trimmedQuestion.match(/\?/g) || []).length > 1) {
        return {
            valid: false,
            reason: 'Please ask only one question per market',
            category: 'OTHER'
        }
    }

    // Subjective/ambiguous language patterns
    const invalidPatterns = [
        { pattern: /\b(opinion|think|believe|feel|probably|maybe)\b/i, reason: 'Avoid subjective language like "think" or "believe"' },
        { pattern: /\b(subjective|arbitrary|pointless)\b/i, reason: 'Question should be objective and verifiable' },
        { pattern: /\?.*\?/, reason: 'Multiple questions detected' },
        { pattern: /\b(and|or)\b.*\?.*\b(and|or)\b/i, reason: 'Avoid complex "and/or" questions' },
        { pattern: /\b(should|ought to)\b/i, reason: 'Avoid normative language like "should"' },
        { pattern: /\b(best|worst|better|worse)\b.*\?/i, reason: 'Avoid comparative language without clear criteria' }
    ]

    for (const { pattern, reason } of invalidPatterns) {
        if (pattern.test(trimmedQuestion)) {
            return {
                valid: false,
                reason,
                category: 'OTHER'
            }
        }
    }

    // Check for past tense (historical events)
    const pastTensePatterns = [
        /\b(did|was|were|had|happened|occurred)\b.*\?/i,
        /\b(in|during)\s+(202[0-3]|2024\b)/, // Past years
        /\b(last\s+(year|month|week))\b/i
    ]

    for (const pattern of pastTensePatterns) {
        if (pattern.test(trimmedQuestion)) {
            return {
                valid: false,
                reason: 'Questions about past events are not allowed',
                category: 'OTHER'
            }
        }
    }

    const category = determineCategory(trimmedQuestion)

    return {
        valid: true,
        reason: 'Passes basic validation checks',
        category: category
    }
}

// Determine category based on question content
const determineCategory = (question) => {
    const lowerQuestion = question.toLowerCase()

    const categoryKeywords = {
        CRYPTO: ['bitcoin', 'ethereum', 'crypto', 'blockchain', 'btc', 'eth', 'defi', 'nft', 'token', 'pdx'],
        POLITICS: ['election', 'president', 'government', 'policy', 'senate', 'congress', 'vote'],
        SPORTS: ['game', 'match', 'tournament', 'championship', 'olympics', 'team', 'player'],
        TECHNOLOGY: ['launch', 'release', 'update', 'software', 'hardware', 'ai', 'artificial intelligence'],
        FINANCE: ['stock', 'market', 'earnings', 'economic', 'gdp', 'inflation', 'interest rate'],
        ENTERTAINMENT: ['movie', 'film', 'oscar', 'award', 'celebrity', 'music', 'album'],
        SCIENCE: ['discovery', 'research', 'study', 'medical', 'health', 'space', 'nasa'],
        WORLD: ['earthquake', 'hurricane', 'summit', 'conference', 'international', 'global']
    }

    for (const [category, keywords] of Object.entries(categoryKeywords)) {
        if (keywords.some(keyword => lowerQuestion.includes(keyword))) {
            return category
        }
    }

    return 'OTHER'
}

// Test cases
const testCases = [
    { q: "Will Bitcoin reach $100k by end of 2025?", expected: true },
    { q: "Short?", expected: false }, // < 10 chars
    { q: "Is this a question", expected: false }, // No question mark
    { q: "What do you think about AI?", expected: false }, // Subjective
    { q: "Did India win the 2023 world cup?", expected: false }, // Past tense
    { q: "Will it rain tomorrow? And will it snow?", expected: false }, // Multiple questions
];

console.log("Running validation tests...");
let passed = 0;
for (const test of testCases) {
    const result = performBasicValidation(test.q, 0, "0.1", "0.1");
    if (result.valid === test.expected) {
        console.log(`✅ Passed: "${test.q}" -> ${result.valid}`);
        passed++;
    } else {
        console.error(`❌ Failed: "${test.q}" -> Expected ${test.expected}, got ${result.valid}. Reason: ${result.reason}`);
    }
}

if (passed === testCases.length) {
    console.log("All validation tests passed!");
} else {
    console.error("Some validation tests failed.");
    process.exit(1);
}
