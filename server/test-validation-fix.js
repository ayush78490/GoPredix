// Test the validation endpoint with "before [date]" question
const testValidation = async () => {
    const endpoint = 'https://go-predix.tarunsingh78490.workers.dev/api/validateMarket';

    // Calculate timestamps
    const now = Math.floor(Date.now() / 1000);
    const marketEndDate = new Date('2025-12-25').getTime() / 1000; // Dec 25, 2025

    const testCase = {
        question: "Will Bitcoin cross $100,000 before 31 Dec 2025?",
        endTime: marketEndDate,
        initialYes: "1",
        initialNo: "1"
    };

    console.log('🧪 Testing Validation Endpoint');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📍 Endpoint:', endpoint);
    console.log('❓ Question:', testCase.question);
    console.log('📅 Market End Date:', new Date(marketEndDate * 1000).toDateString());
    console.log('📅 Question Date: 31 Dec 2025');
    console.log('');
    console.log('Expected: ✅ VALID (question is resolvable on market end date)');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');

    try {
        console.log('⏳ Sending request...');
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(testCase)
        });

        const data = await response.json();

        console.log('📨 Response Status:', response.status);
        console.log('');
        console.log('📦 Response Data:');
        console.log(JSON.stringify(data, null, 2));
        console.log('');

        if (data.valid) {
            console.log('✅ TEST PASSED! Question was accepted.');
            console.log('');
            console.log('📊 Details:');
            console.log('   Category:', data.category);
            console.log('   Reason:', data.reason);
            if (data.eventAnalysis) {
                console.log('   Can be resolved before market end:', data.eventAnalysis.canBeResolvedBeforeMarketEnd);
                console.log('   Date conflict:', data.eventAnalysis.dateConflict);
            }
        } else {
            console.log('❌ TEST FAILED! Question was rejected.');
            console.log('');
            console.log('📊 Rejection Details:');
            console.log('   Reason:', data.reason);
            if (data.eventAnalysis) {
                console.log('   Event Analysis:', JSON.stringify(data.eventAnalysis, null, 4));
            }
        }

        console.log('');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    } catch (error) {
        console.error('❌ Error testing endpoint:', error.message);
        console.error('');
        console.error('Stack:', error.stack);
    }
};

// Run the test
testValidation();
