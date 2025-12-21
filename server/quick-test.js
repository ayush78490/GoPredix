#!/usr/bin/env node

/**
 * Quick validation test for server deployment
 * Tests only the working Vercel endpoint
 */

const VERCEL_URL = 'https://sigma-predection.vercel.app';

const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m'
};

async function quickTest() {
    console.log(`${colors.cyan}╔════════════════════════════════════════╗${colors.reset}`);
    console.log(`${colors.cyan}║  Quick Server Validation Test         ║${colors.reset}`);
    console.log(`${colors.cyan}╚════════════════════════════════════════╝${colors.reset}`);
    console.log(`\nTesting: ${VERCEL_URL}\n`);

    const testData = {
        question: 'Will Ethereum reach $5,000 by Q2 2026?',
        endTime: Math.floor(Date.now() / 1000) + (180 * 24 * 60 * 60),
        initialYes: '0.1',
        initialNo: '0.1'
    };

    console.log(`${colors.blue}Request:${colors.reset}`);
    console.log(`  Question: "${testData.question}"`);
    console.log(`  End Time: ${new Date(testData.endTime * 1000).toLocaleString()}`);

    try {
        const startTime = Date.now();
        const response = await fetch(`${VERCEL_URL}/api/validateMarket`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(testData)
        });
        const duration = Date.now() - startTime;

        if (!response.ok) {
            console.log(`${colors.red}✗ Server Error: ${response.status}${colors.reset}`);
            const text = await response.text();
            console.log(text.substring(0, 500));
            return false;
        }

        const result = await response.json();

        console.log(`\n${colors.yellow}Response Time: ${duration}ms${colors.reset}\n`);
        console.log(`${colors.green}Response:${colors.reset}`);
        console.log(`  Valid: ${result.valid ? colors.green + '✓ TRUE' : colors.red + '✗ FALSE'}${colors.reset}`);
        console.log(`  Category: ${result.category || 'N/A'}`);
        console.log(`  Duplicate: ${result.isDuplicate ? 'Yes' : 'No'}`);
        console.log(`  Reason: ${result.reason || 'N/A'}`);

        if (result.validationDetails) {
            console.log(`\n${colors.cyan}Validation Details:${colors.reset}`);
            console.log(`  Objective: ${result.validationDetails.isObjective}`);
            console.log(`  Specific: ${result.validationDetails.isSpecific}`);
            console.log(`  Verifiable: ${result.validationDetails.isVerifiable}`);
            console.log(`  Future Event: ${result.validationDetails.isFutureEvent}`);
        }

        console.log(`\n${colors.green}✓ Server is operational!${colors.reset}`);
        return true;

    } catch (error) {
        console.log(`${colors.red}✗ Error: ${error.message}${colors.reset}`);
        return false;
    }
}

quickTest().then(success => {
    process.exit(success ? 0 : 1);
});
