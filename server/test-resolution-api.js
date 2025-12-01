#!/usr/bin/env node

/**
 * Test script for resolveMarket API
 * Tests the AI resolution logic without blockchain interaction
 */

require('dotenv').config();

// Use env var or default to local runner
const API_URL = process.env.RESOLUTION_API_URL || 'http://127.0.0.1:3001/api/resolveMarket';

console.log(`Testing against: ${API_URL}`);

// Test cases
const testCases = [
    {
        name: 'Resolved YES Event (Bitcoin reached $100 in 2010)',
        data: {
            marketId: 1001,
            question: 'Did Bitcoin price exceed $100 in the year 2010?',
            endTime: 1293839999 // Dec 31, 2010
        },
        expectedOutcome: 2, // NO (Bitcoin was cents in 2010)
        minConfidence: 90
    },
    {
        name: 'Resolved YES Event (Argentina won 2022 World Cup)',
        data: {
            marketId: 1002,
            question: 'Did Argentina win the 2022 FIFA World Cup?',
            endTime: 1672531199 // Dec 31, 2022
        },
        expectedOutcome: 1, // YES
        minConfidence: 90
    },
    {
        name: 'Future Event (Should be Unclear)',
        data: {
            marketId: 1003,
            question: 'Will humans land on Mars by 2030?',
            endTime: 1924991999 // Dec 31, 2030
        },
        // Note: The API might reject this if we send a future timestamp as endTime, 
        // but here we are testing the AI's logic if it *were* asked to resolve it now.
        // However, the API has a check: if (currentTime < endTime) return 400.
        // So we must simulate a past endTime for a future event to test AI logic, 
        // OR we expect a 400 error if we send a future timestamp.
        // Let's test the API validation first.
        endTime: Math.floor(Date.now() / 1000) + 10000,
        expectApiError: true,
        errorReason: 'Market has not ended yet'
    },
    {
        name: 'Ambiguous/Unclear Event',
        data: {
            marketId: 1004,
            question: 'Did John have a good day yesterday?',
            endTime: Math.floor(Date.now() / 1000) - 3600 // 1 hour ago
        },
        expectedOutcome: null, // Unclear
        maxConfidence: 10 // Should be low confidence
    }
];

// Color codes
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m'
};

async function runTest(testCase) {
    console.log(`\n${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
    console.log(`${colors.blue}Test: ${testCase.name}${colors.reset}`);
    console.log(`Question: "${testCase.data.question}"`);

    try {
        const startTime = Date.now();

        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(testCase.data)
        });

        const duration = Date.now() - startTime;

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));

            if (testCase.expectApiError) {
                console.log(`${colors.green}✓ API correctly returned error: ${response.status}${colors.reset}`);
                if (errorData.reason && errorData.reason.includes(testCase.errorReason)) {
                    console.log(`  Reason matched: "${errorData.reason}"`);
                    return true;
                }
            }

            console.log(`${colors.red}✗ HTTP Error: ${response.status} ${response.statusText}${colors.reset}`);
            console.log(`Error details: ${JSON.stringify(errorData)}`);
            return false;
        }

        const result = await response.json();

        console.log(`${colors.yellow}Response Time: ${duration}ms${colors.reset}`);
        console.log(`Outcome: ${result.outcome === 1 ? 'YES' : result.outcome === 2 ? 'NO' : 'UNCLEAR/NULL'}`);
        console.log(`Confidence: ${result.confidence}%`);
        console.log(`Reason: ${result.reason}`);

        // Check expectations
        let passed = true;

        if (testCase.expectedOutcome !== undefined) {
            if (result.outcome !== testCase.expectedOutcome) {
                console.log(`${colors.red}✗ Expected outcome=${testCase.expectedOutcome}, got=${result.outcome}${colors.reset}`);
                passed = false;
            }
        }

        if (testCase.minConfidence !== undefined) {
            if (result.confidence < testCase.minConfidence) {
                console.log(`${colors.red}✗ Expected confidence >= ${testCase.minConfidence}, got=${result.confidence}${colors.reset}`);
                passed = false;
            }
        }

        if (testCase.maxConfidence !== undefined) {
            if (result.confidence > testCase.maxConfidence) {
                console.log(`${colors.red}✗ Expected confidence <= ${testCase.maxConfidence}, got=${result.confidence}${colors.reset}`);
                passed = false;
            }
        }

        if (passed) {
            console.log(`${colors.green}✓ Test Passed${colors.reset}`);
        } else {
            console.log(`${colors.red}✗ Test Failed${colors.reset}`);
        }

        return passed;

    } catch (error) {
        console.log(`${colors.red}✗ Error: ${error.message}${colors.reset}`);
        return false;
    }
}

async function runAllTests() {
    console.log(`${colors.cyan}╔════════════════════════════════════════╗${colors.reset}`);
    console.log(`${colors.cyan}║   Resolution API Capability Test       ║${colors.reset}`);
    console.log(`${colors.cyan}╚════════════════════════════════════════╝${colors.reset}`);
    console.log(`\nAPI Endpoint: ${API_URL}`);

    let passed = 0;
    let failed = 0;

    for (const testCase of testCases) {
        const result = await runTest(testCase);
        if (result) {
            passed++;
        } else {
            failed++;
        }

        // Wait a bit between tests
        await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.log(`\n${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
    console.log(`${colors.cyan}Test Summary:${colors.reset}`);
    console.log(`${colors.green}Passed: ${passed}${colors.reset}`);
    console.log(`${colors.red}Failed: ${failed}${colors.reset}`);

    if (failed === 0) {
        console.log(`\n${colors.green}✓ All resolution tests passed!${colors.reset}`);
    } else {
        console.log(`\n${colors.red}✗ Some tests failed.${colors.reset}`);
    }
}

runAllTests();
