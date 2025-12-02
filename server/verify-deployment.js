const API_URL = 'https://go-predix.tarunsingh78490.workers.dev';

async function testEndpoint(name, path, payload) {
    console.log(`\n🧪 Testing ${name} (${path})...`);
    try {
        const startTime = Date.now();
        const response = await fetch(`${API_URL}${path}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const duration = Date.now() - startTime;
        const text = await response.text();

        console.log(`Status: ${response.status} ${response.statusText}`);
        console.log(`Time: ${duration}ms`);

        try {
            const data = JSON.parse(text);
            console.log('Response:', JSON.stringify(data, null, 2));

            if (response.ok) {
                console.log(`✅ ${name} Passed!`);
                return true;
            } else {
                console.log(`❌ ${name} Failed (API Error)`);
                return false;
            }
        } catch (e) {
            console.log('Raw Response:', text);
            console.log(`❌ ${name} Failed (Invalid JSON)`);
            return false;
        }
    } catch (error) {
        console.log(`❌ ${name} Failed (Network Error):`, error.message);
        return false;
    }
}

async function runTests() {
    console.log(`🌍 Verifying Deployment: ${API_URL}\n`);

    // Test 1: Validate Market
    await testEndpoint('Validation API', '/api/validateMarket', {
        question: "Will Bitcoin reach $100k by 2030?",
        endTime: Math.floor(Date.now() / 1000) + 86400 * 365, // 1 year from now
        initialYes: "0.1",
        initialNo: "0.1"
    });

    // Test 2: Resolve Market
    // Note: This might fail if API Key is not set in Cloudflare Dashboard
    await testEndpoint('Resolution API', '/api/resolveMarket', {
        question: "Did Bitcoin reach $100k in 2024?",
        endTime: 1735689600, // Dec 31, 2024
        marketId: "test-1"
    });
}

runTests();
