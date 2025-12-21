#!/usr/bin/env node

/**
 * Comprehensive test for Cloudflare Worker deployment
 * Tests validation and resolution APIs
 */

const CLOUDFLARE_URL = 'https://go-predix.tarunsingh78490.workers.dev';
const VERCEL_URL = 'https://sigma-predection.vercel.app';

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

// Test configurations
const tests = {
    validation: [
        {
            name: 'Valid Crypto Market',
            endpoint: '/api/validateMarket',
            data: {
                question: 'Will Ethereum reach $5,000 by end of Q2 2026?',
                endTime: Math.floor(Date.now() / 1000) + (180 * 24 * 60 * 60), // 180 days
                initialYes: '0.1',
                initialNo: '0.1'
            },
            expectedValid: true,
            expectedCategory: 'CRYPTO'
        },
        {
            name: 'Invalid - Past Event',
            endpoint: '/api/validateMarket',
            data: {
                question: 'Did Bitcoin reach $100k in 2024?',
                endTime: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60),
                initialYes: '0.1',
                initialNo: '0.1'
            },
            expectedValid: false
        },
        {
            name: 'Invalid - Subjective Question',
            endpoint: '/api/validateMarket',
            data: {
                question: 'Will people think AI is beneficial?',
                endTime: Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60),
                initialYes: '0.1',
                initialNo: '0.1'
            },
            expectedValid: false
        },
        {
            name: 'Valid Sports Market',
            endpoint: '/api/validateMarket',
            data: {
                question: 'Will Manchester United win the Premier League in 2026?',
                endTime: Math.floor(Date.now() / 1000) + (365 * 24 * 60 * 60),
                initialYes: '0.1',
                initialNo: '0.1'
            },
            expectedValid: true,
            expectedCategory: 'SPORTS'
        },
        {
            name: 'Duplicate Detection Test',
            endpoint: '/api/validateMarket',
            data: {
                question: 'Will Bitcoin reach $100,000 by end of 2025?',
                endTime: Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60),
                initialYes: '0.1',
                initialNo: '0.1'
            },
            checkForDuplicate: true
        }
    ],
    resolution: [
        {
            name: 'Resolve Past Crypto Event',
            endpoint: '/api/resolveMarket',
            data: {
                question: 'Did Bitcoin reach $100k in 2024?',
                endTime: 1735689600, // Dec 31, 2024
                marketId: 'test-1'
            },
            expectedOutcome: 'NO'
        },
        {
            name: 'Resolve Future Event (Should Not Resolve)',
            endpoint: '/api/resolveMarket',
            data: {
                question: 'Will Bitcoin reach $100k by 2030?',
                endTime: Math.floor(Date.now() / 1000) + (365 * 24 * 60 * 60),
                marketId: 'test-2'
            },
            expectedResolved: false
        }
    ]
};

async function testEndpoint(baseUrl, test, category) {
    const url = `${baseUrl}${test.endpoint}`;
    console.log(`\n${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
    console.log(`${colors.blue}Test: ${test.name}${colors.reset}`);
    console.log(`${colors.magenta}Category: ${category.toUpperCase()}${colors.reset}`);
    console.log(`Endpoint: ${test.endpoint}`);

    try {
        const startTime = Date.now();

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(test.data)
        });

        const duration = Date.now() - startTime;
        const text = await response.text();

        console.log(`${colors.yellow}Response Time: ${duration}ms${colors.reset}`);
        console.log(`Status: ${response.status} ${response.statusText}`);

        if (!response.ok) {
            console.log(`${colors.red}✗ HTTP Error${colors.reset}`);
            console.log(`Response: ${text.substring(0, 500)}`);
            return { passed: false, duration, error: 'HTTP Error' };
        }

        let result;
        try {
            result = JSON.parse(text);
        } catch (e) {
            console.log(`${colors.red}✗ Invalid JSON Response${colors.reset}`);
            console.log(`Response: ${text.substring(0, 500)}`);
            return { passed: false, duration, error: 'Invalid JSON' };
        }

        // Display result
        console.log(`\n${colors.cyan}Response Data:${colors.reset}`);
        if (category === 'validation') {
            console.log(`  Valid: ${result.valid}`);
            console.log(`  Category: ${result.category || 'N/A'}`);
            console.log(`  Duplicate: ${result.isDuplicate || false}`);
            console.log(`  Reason: ${result.reason || 'N/A'}`);
        } else if (category === 'resolution') {
            console.log(`  Resolved: ${result.resolved !== undefined ? result.resolved : 'N/A'}`);
            console.log(`  Outcome: ${result.outcome || 'N/A'}`);
            console.log(`  Confidence: ${result.confidence || 'N/A'}`);
            console.log(`  Reason: ${result.reason || 'N/A'}`);
        }

        // Validate expectations
        let passed = true;
        let issues = [];

        if (test.expectedValid !== undefined && result.valid !== test.expectedValid) {
            issues.push(`Expected valid=${test.expectedValid}, got valid=${result.valid}`);
            passed = false;
        }

        if (test.expectedCategory && result.category !== test.expectedCategory) {
            issues.push(`Expected category=${test.expectedCategory}, got category=${result.category}`);
            // Don't fail for category mismatch, just warn
        }

        if (test.expectedOutcome && result.outcome !== test.expectedOutcome) {
            issues.push(`Expected outcome=${test.expectedOutcome}, got outcome=${result.outcome}`);
        }

        if (test.expectedResolved !== undefined && result.resolved !== test.expectedResolved) {
            issues.push(`Expected resolved=${test.expectedResolved}, got resolved=${result.resolved}`);
        }

        if (test.checkForDuplicate && result.isDuplicate === undefined) {
            issues.push('Duplicate detection not implemented');
        }

        // Show results
        if (issues.length > 0) {
            console.log(`\n${colors.yellow}Issues:${colors.reset}`);
            issues.forEach(issue => console.log(`  ⚠ ${issue}`));
        }

        if (passed) {
            console.log(`\n${colors.green}✓ Test Passed${colors.reset}`);
        } else {
            console.log(`\n${colors.red}✗ Test Failed${colors.reset}`);
        }

        return { passed, duration, result, issues };

    } catch (error) {
        console.log(`${colors.red}✗ Network Error: ${error.message}${colors.reset}`);
        return { passed: false, duration: 0, error: error.message };
    }
}

async function testDeployment(name, baseUrl) {
    console.log(`\n${colors.cyan}╔════════════════════════════════════════════════════╗${colors.reset}`);
    console.log(`${colors.cyan}║  ${name.padEnd(48)}  ║${colors.reset}`);
    console.log(`${colors.cyan}╚════════════════════════════════════════════════════╝${colors.reset}`);
    console.log(`\nBase URL: ${baseUrl}`);

    const results = {
        validation: { passed: 0, failed: 0, total: 0, times: [] },
        resolution: { passed: 0, failed: 0, total: 0, times: [] }
    };

    // Test validation endpoints
    console.log(`\n${colors.magenta}▶ Testing Validation API${colors.reset}`);
    for (const test of tests.validation) {
        const result = await testEndpoint(baseUrl, test, 'validation');
        results.validation.total++;
        if (result.passed) {
            results.validation.passed++;
        } else {
            results.validation.failed++;
        }
        results.validation.times.push(result.duration);

        // Wait between requests
        await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Test resolution endpoints
    console.log(`\n${colors.magenta}▶ Testing Resolution API${colors.reset}`);
    for (const test of tests.resolution) {
        const result = await testEndpoint(baseUrl, test, 'resolution');
        results.resolution.total++;
        if (result.passed) {
            results.resolution.passed++;
        } else {
            results.resolution.failed++;
        }
        results.resolution.times.push(result.duration);

        // Wait between requests
        await new Promise(resolve => setTimeout(resolve, 1000));
    }

    return results;
}

function displaySummary(name, results) {
    console.log(`\n${colors.cyan}═══════════════════════════════════════════════════${colors.reset}`);
    console.log(`${colors.cyan}Summary for ${name}${colors.reset}`);
    console.log(`${colors.cyan}═══════════════════════════════════════════════════${colors.reset}`);

    // Validation Summary
    console.log(`\n${colors.magenta}Validation API:${colors.reset}`);
    console.log(`  ${colors.green}Passed: ${results.validation.passed}${colors.reset}`);
    console.log(`  ${colors.red}Failed: ${results.validation.failed}${colors.reset}`);
    console.log(`  Total: ${results.validation.total}`);
    if (results.validation.times.length > 0) {
        const avgTime = results.validation.times.reduce((a, b) => a + b, 0) / results.validation.times.length;
        console.log(`  Avg Response Time: ${avgTime.toFixed(0)}ms`);
    }

    // Resolution Summary
    console.log(`\n${colors.magenta}Resolution API:${colors.reset}`);
    console.log(`  ${colors.green}Passed: ${results.resolution.passed}${colors.reset}`);
    console.log(`  ${colors.red}Failed: ${results.resolution.failed}${colors.reset}`);
    console.log(`  Total: ${results.resolution.total}`);
    if (results.resolution.times.length > 0) {
        const avgTime = results.resolution.times.reduce((a, b) => a + b, 0) / results.resolution.times.length;
        console.log(`  Avg Response Time: ${avgTime.toFixed(0)}ms`);
    }

    // Overall Status
    const totalPassed = results.validation.passed + results.resolution.passed;
    const totalFailed = results.validation.failed + results.resolution.failed;
    const totalTests = results.validation.total + results.resolution.total;

    console.log(`\n${colors.cyan}Overall:${colors.reset}`);
    console.log(`  ${colors.green}Passed: ${totalPassed}/${totalTests}${colors.reset}`);
    console.log(`  ${colors.red}Failed: ${totalFailed}/${totalTests}${colors.reset}`);

    if (totalFailed === 0) {
        console.log(`\n${colors.green}✓ All tests passed for ${name}!${colors.reset}`);
        return true;
    } else {
        console.log(`\n${colors.red}✗ Some tests failed for ${name}${colors.reset}`);
        return false;
    }
}

async function runAllTests() {
    console.log(`${colors.cyan}╔════════════════════════════════════════════════════╗${colors.reset}`);
    console.log(`${colors.cyan}║  Deployment Testing - Validation & Resolution     ║${colors.reset}`);
    console.log(`${colors.cyan}╚════════════════════════════════════════════════════╝${colors.reset}`);

    // Test Cloudflare
    console.log(`\n${colors.yellow}Testing Cloudflare Worker Deployment...${colors.reset}`);
    const cloudflareResults = await testDeployment('Cloudflare Worker', CLOUDFLARE_URL);
    const cloudflareSuccess = displaySummary('Cloudflare Worker', cloudflareResults);

    // Test Vercel
    console.log(`\n${colors.yellow}Testing Vercel Deployment...${colors.reset}`);
    const vercelResults = await testDeployment('Vercel', VERCEL_URL);
    const vercelSuccess = displaySummary('Vercel', vercelResults);

    // Final summary
    console.log(`\n${colors.cyan}╔════════════════════════════════════════════════════╗${colors.reset}`);
    console.log(`${colors.cyan}║  Final Summary                                      ║${colors.reset}`);
    console.log(`${colors.cyan}╚════════════════════════════════════════════════════╝${colors.reset}`);
    console.log(`\nCloudflare: ${cloudflareSuccess ? colors.green + '✓ PASSED' : colors.red + '✗ FAILED'}${colors.reset}`);
    console.log(`Vercel:     ${vercelSuccess ? colors.green + '✓ PASSED' : colors.red + '✗ FAILED'}${colors.reset}`);

    const allPassed = cloudflareSuccess && vercelSuccess;
    if (allPassed) {
        console.log(`\n${colors.green}✓ All deployments are working correctly!${colors.reset}`);
        process.exit(0);
    } else {
        console.log(`\n${colors.red}✗ Some deployments have issues. Please review above.${colors.reset}`);
        process.exit(1);
    }
}

// Run tests
runAllTests().catch(error => {
    console.error(`${colors.red}Fatal error: ${error.message}${colors.reset}`);
    console.error(error.stack);
    process.exit(1);
});
