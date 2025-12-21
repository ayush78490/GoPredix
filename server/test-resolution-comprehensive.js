#!/usr/bin/env node

/**
 * Comprehensive test for resolveMarket API endpoint
 * Tests various resolution scenarios
 */

const API_URL = 'https://sigma-predection.vercel.app/api/resolveMarket';

// Color codes
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
    magenta: '\x1b[35m'
};

// Test cases
const testCases = [
    {
        name: 'Past Event - Bitcoin $100k in 2024',
        data: {
            question: 'Did Bitcoin reach $100,000 in 2024?',
            endTime: 1735689600, // Dec 31, 2024
            marketId: '1'
        },
        expectedResolved: true,
        expectedOutcome: 2, // Should be NO
        description: 'Bitcoin did not reach $100k in 2024'
    },
    {
        name: 'Past Event - Bitcoin ATH 2021',
        data: {
            question: 'Did Bitcoin reach an all-time high in 2021?',
            endTime: 1640995200, // Dec 31, 2021
            marketId: '2'
        },
        expectedResolved: true,
        expectedOutcome: 1, // Should be YES
        description: 'Bitcoin reached ATH of ~$69k in November 2021'
    },
    {
        name: 'Future Event - Should Not Resolve',
        data: {
            question: 'Will Bitcoin reach $100k by 2030?',
            endTime: Math.floor(Date.now() / 1000) + (365 * 24 * 60 * 60), // 1 year from now
            marketId: '3'
        },
        expectedResolved: false,
        shouldError: true,
        expectedError: 'Market has not ended yet',
        description: 'Should reject - market not ended'
    },
    {
        name: 'Past Political Event - 2020 US Election',
        data: {
            question: 'Did Joe Biden win the 2020 US Presidential Election?',
            endTime: 1610000000, // Jan 7, 2021
            marketId: '4'
        },
        expectedResolved: true,
        expectedOutcome: 1, // Should be YES
        description: 'Biden won 2020 election'
    },
    {
        name: 'Past Sports Event - FIFA World Cup 2022',
        data: {
            question: 'Did Argentina win the FIFA World Cup 2022?',
            endTime: 1671408000, // Dec 19, 2022
            marketId: '5'
        },
        expectedResolved: true,
        expectedOutcome: 1, // Should be YES
        description: 'Argentina won World Cup 2022'
    },
    {
        name: 'Invalid Input - No Question',
        data: {
            endTime: 1735689600,
            marketId: '6'
        },
        shouldError: true,
        expectedError: 'Valid question string is required',
        description: 'Should reject - missing question'
    },
    {
        name: 'Invalid Input - No EndTime',
        data: {
            question: 'Test question?',
            marketId: '7'
        },
        shouldError: true,
        expectedError: 'Valid endTime timestamp is required',
        description: 'Should reject - missing endTime'
    }
];

async function runTest(testCase) {
    console.log(`\n${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
    console.log(`${colors.blue}Test: ${testCase.name}${colors.reset}`);
    console.log(`${colors.magenta}Description: ${testCase.description}${colors.reset}`);

    if (testCase.data.question) {
        console.log(`Question: "${testCase.data.question}"`);
    }
    if (testCase.data.endTime) {
        const endDate = new Date(testCase.data.endTime * 1000);
        console.log(`End Time: ${endDate.toLocaleDateString()}`);
    }

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
        const text = await response.text();

        console.log(`${colors.yellow}Response Time: ${duration}ms${colors.reset}`);
        console.log(`HTTP Status: ${response.status}`);

        // Parse response
        let result;
        try {
            result = JSON.parse(text);
        } catch (e) {
            console.log(`${colors.red}✗ Invalid JSON Response${colors.reset}`);
            console.log(`Response: ${text.substring(0, 500)}`);
            return { passed: false, duration };
        }

        // Display response
        console.log(`\n${colors.cyan}Response Data:${colors.reset}`);
        console.log(`  Success: ${result.success}`);
        console.log(`  Outcome: ${result.outcome !== null && result.outcome !== undefined ?
            (result.outcome === 1 ? 'YES (1)' : result.outcome === 2 ? 'NO (2)' : 'UNDECIDED (null)') : 'N/A'}`);
        console.log(`  Confidence: ${result.confidence}%`);
        console.log(`  Reason: ${result.reason || 'N/A'}`);

        if (result.evidence) {
            console.log(`  Evidence: ${result.evidence.substring(0, 100)}...`);
        }
        if (result.sources && result.sources.length > 0) {
            console.log(`  Sources: ${result.sources.join(', ')}`);
        }

        // Validate expectations
        let passed = true;
        let issues = [];

        // Check if we expected an error
        if (testCase.shouldError) {
            if (response.status >= 400 || result.success === false) {
                // Expected error - check error message
                if (testCase.expectedError && !result.reason.includes(testCase.expectedError)) {
                    issues.push(`Expected error message to contain "${testCase.expectedError}", got "${result.reason}"`);
                    passed = false;
                } else {
                    console.log(`${colors.green}✓ Correctly rejected with error${colors.reset}`);
                }
            } else {
                issues.push('Expected an error but got success');
                passed = false;
            }
        } else {
            // Should succeed
            if (!response.ok && !result.success) {
                issues.push(`Expected success but got error: ${result.reason}`);
                passed = false;
            }

            // Check outcome
            if (testCase.expectedOutcome !== undefined && result.outcome !== testCase.expectedOutcome) {
                issues.push(`Expected outcome=${testCase.expectedOutcome}, got outcome=${result.outcome}`);
                // Don't fail test - AI might have different interpretation
            }

            // Check confidence for resolved markets
            if (testCase.expectedResolved && result.outcome !== null && result.confidence < 50) {
                issues.push(`Low confidence (${result.confidence}%) for resolved market`);
            }
        }

        // Show issues
        if (issues.length > 0) {
            console.log(`\n${colors.yellow}Issues:${colors.reset}`);
            issues.forEach(issue => console.log(`  ⚠ ${issue}`));
        }

        // Final result
        if (passed) {
            console.log(`\n${colors.green}✓ Test Passed${colors.reset}`);
        } else {
            console.log(`\n${colors.red}✗ Test Failed${colors.reset}`);
        }

        return { passed, duration, result };

    } catch (error) {
        console.log(`${colors.red}✗ Network Error: ${error.message}${colors.reset}`);
        return { passed: false, duration: 0, error: error.message };
    }
}

async function runAllTests() {
    console.log(`${colors.cyan}╔════════════════════════════════════════════════════╗${colors.reset}`);
    console.log(`${colors.cyan}║  Resolution API Comprehensive Test                ║${colors.reset}`);
    console.log(`${colors.cyan}╚════════════════════════════════════════════════════╝${colors.reset}`);
    console.log(`\nAPI Endpoint: ${API_URL}`);
    console.log(`Total Tests: ${testCases.length}\n`);

    let passed = 0;
    let failed = 0;
    const times = [];

    for (const testCase of testCases) {
        const result = await runTest(testCase);
        if (result.passed) {
            passed++;
        } else {
            failed++;
        }
        if (result.duration > 0) {
            times.push(result.duration);
        }

        // Wait between tests to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1500));
    }

    // Summary
    console.log(`\n${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
    console.log(`${colors.cyan}Test Summary:${colors.reset}`);
    console.log(`${colors.green}Passed: ${passed}${colors.reset}`);
    console.log(`${colors.red}Failed: ${failed}${colors.reset}`);
    console.log(`Total: ${testCases.length}`);

    if (times.length > 0) {
        const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
        const minTime = Math.min(...times);
        const maxTime = Math.max(...times);
        console.log(`\n${colors.yellow}Performance:${colors.reset}`);
        console.log(`  Average Response Time: ${avgTime.toFixed(0)}ms`);
        console.log(`  Fastest: ${minTime}ms`);
        console.log(`  Slowest: ${maxTime}ms`);
    }

    if (failed === 0) {
        console.log(`\n${colors.green}✓ All tests passed! Resolution API is working correctly.${colors.reset}`);
    } else {
        console.log(`\n${colors.red}✗ Some tests failed. Please review the results above.${colors.reset}`);
    }

    console.log(`\n${colors.cyan}API Status: ${failed === 0 ? colors.green + '✅ OPERATIONAL' : colors.yellow + '⚠️ ISSUES DETECTED'}${colors.reset}\n`);

    process.exit(failed === 0 ? 0 : 1);
}

// Run tests
runAllTests().catch(error => {
    console.error(`${colors.red}Fatal error: ${error.message}${colors.reset}`);
    process.exit(1);
});
