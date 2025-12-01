#!/usr/bin/env node

/**
 * Test script for validateMarket API
 * Tests various scenarios to ensure compatibility
 */

const API_URL = 'https://sigma-predection.vercel.app/api/validateMarket';

// Test cases
const testCases = [
    {
        name: 'Valid Crypto Question',
        data: {
            question: 'Will Bitcoin reach $100,000 by end of 2025?',
            endTime: Math.floor(Date.now() / 1000) + (365 * 24 * 60 * 60), // 1 year from now
            initialYes: '0.1',
            initialNo: '0.1'
        },
        expectedValid: true,
        expectedCategory: 'CRYPTO'
    },
    {
        name: 'Historical Event (Should Reject)',
        data: {
            question: 'Did Bitcoin reach $100k in 2024?',
            endTime: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60), // 7 days from now
            initialYes: '0.1',
            initialNo: '0.1'
        },
        expectedValid: false
    },
    {
        name: 'Date After Market End (Should Reject)',
        data: {
            question: 'Will Bitcoin reach $100k by December 31, 2026?',
            endTime: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60), // 7 days from now (market ends before event date)
            initialYes: '0.1',
            initialNo: '0.1'
        },
        expectedValid: false
    },
    {
        name: 'TON Cryptocurrency Detection',
        data: {
            question: 'Will TON reach $10 by end of 2025?',
            endTime: Math.floor(Date.now() / 1000) + (365 * 24 * 60 * 60),
            initialYes: '0.1',
            initialNo: '0.1'
        },
        expectedValid: true,
        expectedCategory: 'CRYPTO'
    },
    {
        name: 'Question Too Short (Should Reject)',
        data: {
            question: 'BTC?',
            endTime: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60),
            initialYes: '0.1',
            initialNo: '0.1'
        },
        expectedValid: false
    },
    {
        name: 'Subjective Question (Should Reject)',
        data: {
            question: 'Will people think Bitcoin is a good investment in 2025?',
            endTime: Math.floor(Date.now() / 1000) + (365 * 24 * 60 * 60),
            initialYes: '0.1',
            initialNo: '0.1'
        },
        expectedValid: false
    }
];

// Color codes for terminal output
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
            console.log(`${colors.red}✗ HTTP Error: ${response.status} ${response.statusText}${colors.reset}`);
            const errorText = await response.text();
            console.log(`Error details: ${errorText}`);
            return false;
        }

        const result = await response.json();

        console.log(`${colors.yellow}Response Time: ${duration}ms${colors.reset}`);
        console.log(`Valid: ${result.valid}`);
        console.log(`Category: ${result.category || 'N/A'}`);
        console.log(`Reason: ${result.reason || 'N/A'}`);

        // Check if result matches expectations
        let passed = true;

        if (testCase.expectedValid !== undefined && result.valid !== testCase.expectedValid) {
            console.log(`${colors.red}✗ Expected valid=${testCase.expectedValid}, got valid=${result.valid}${colors.reset}`);
            passed = false;
        }

        if (testCase.expectedCategory && result.category !== testCase.expectedCategory) {
            console.log(`${colors.yellow}⚠ Expected category=${testCase.expectedCategory}, got category=${result.category}${colors.reset}`);
            // Don't fail test for category mismatch, just warn
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
    console.log(`${colors.cyan}║  Validation API Compatibility Test    ║${colors.reset}`);
    console.log(`${colors.cyan}╚════════════════════════════════════════╝${colors.reset}`);
    console.log(`\nAPI Endpoint: ${API_URL}`);
    console.log(`Total Tests: ${testCases.length}\n`);

    let passed = 0;
    let failed = 0;

    for (const testCase of testCases) {
        const result = await runTest(testCase);
        if (result) {
            passed++;
        } else {
            failed++;
        }

        // Wait a bit between tests to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.log(`\n${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
    console.log(`${colors.cyan}Test Summary:${colors.reset}`);
    console.log(`${colors.green}Passed: ${passed}${colors.reset}`);
    console.log(`${colors.red}Failed: ${failed}${colors.reset}`);
    console.log(`Total: ${testCases.length}`);

    if (failed === 0) {
        console.log(`\n${colors.green}✓ All tests passed! API is fully compatible.${colors.reset}`);
    } else {
        console.log(`\n${colors.red}✗ Some tests failed. Please review the results above.${colors.reset}`);
    }

    process.exit(failed === 0 ? 0 : 1);
}

// Run tests
runAllTests().catch(error => {
    console.error(`${colors.red}Fatal error: ${error.message}${colors.reset}`);
    process.exit(1);
});
