// Test the AI validation API
const testValidation = async () => {
    const testCases = [
        {
            name: "Crypto question",
            question: "Will Bitcoin reach $100k by end of 2025?",
            endTime: Math.floor(Date.now() / 1000) + (365 * 24 * 60 * 60),
            initialYes: "100",
            initialNo: "100"
        },
        {
            name: "Politics question",
            question: "Will there be a presidential election in 2025?",
            endTime: Math.floor(Date.now() / 1000) + (365 * 24 * 60 * 60),
            initialYes: "100",
            initialNo: "100"
        },
        {
            name: "Sports question",
            question: "Will Manchester United win the championship?",
            endTime: Math.floor(Date.now() / 1000) + (180 * 24 * 60 * 60),
            initialYes: "100",
            initialNo: "100"
        }
    ];

    for (const testCase of testCases) {
        console.log(`\n${'='.repeat(60)}`);
        console.log(`Testing: ${testCase.name}`);
        console.log(`Question: "${testCase.question}"`);
        console.log('='.repeat(60));

        try {
            const response = await fetch('https://go-predix.tarunsingh78490.workers.dev/api/validateMarket', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    question: testCase.question,
                    endTime: testCase.endTime,
                    initialYes: testCase.initialYes,
                    initialNo: testCase.initialNo
                })
            });

            console.log(`Response Status: ${response.status} ${response.statusText}`);

            if (!response.ok) {
                const errorText = await response.text();
                console.log('❌ Error Response:', errorText);
                continue;
            }

            const result = await response.json();
            console.log('✅ Validation Result:');
            console.log('   Valid:', result.valid);
            console.log('   Category:', result.category);
            console.log('   Reason:', result.reason);
            console.log('   Full Response:', JSON.stringify(result, null, 2));

        } catch (error) {
            console.error('❌ Request Failed:', error.message);
        }
    }
};

testValidation().catch(console.error);
