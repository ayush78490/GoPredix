// Comprehensive test suite for validation endpoint
const testValidation = async (testCase, description) => {
    const endpoint = 'https://go-predix.tarunsingh78490.workers.dev/api/validateMarket';

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🧪', description);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('❓ Question:', testCase.question);
    console.log('📅 Market End:', new Date(testCase.endTime * 1000).toDateString());
    console.log('');

    try {
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(testCase)
        });

        const data = await response.json();

        if (data.valid) {
            console.log('✅ ACCEPTED');
            console.log('   📂 Category:', data.category);
            console.log('   💡 Reason:', data.reason.substring(0, 80) + '...');
        } else {
            console.log('❌ REJECTED');
            console.log('   ⚠️  Reason:', data.reason.substring(0, 100) + '...');
        }

        console.log('');
        return data.valid;

    } catch (error) {
        console.error('❌ Error:', error.message);
        console.log('');
        return false;
    }
};

const runTests = async () => {
    console.log('\n🚀 COMPREHENSIVE VALIDATION TESTS');
    console.log('═══════════════════════════════════════════\n');

    const marketEnd = new Date('2025-12-25').getTime() / 1000; // Dec 25, 2025

    const tests = [
        {
            description: 'Test 1: "before [date]" question (date AFTER market end)',
            testCase: {
                question: "Will Bitcoin cross $100,000 before 31 Dec 2025?",
                endTime: marketEnd,
                initialYes: "1",
                initialNo: "1"
            },
            expectedValid: true
        },
        {
            description: 'Test 2: Another "before [date]" question',
            testCase: {
                question: "Will Ethereum reach $5,000 before March 2026?",
                endTime: marketEnd,
                initialYes: "1",
                initialNo: "1"
            },
            expectedValid: true
        },
        {
            description: 'Test 3: "by [date]" question (date BEFORE market end)',
            testCase: {
                question: "Will Donald Trump win the election by December 20, 2025?",
                endTime: marketEnd,
                initialYes: "1",
                initialNo: "1"
            },
            expectedValid: true
        },
        {
            description: 'Test 4: Historical event (should be rejected)',
            testCase: {
                question: "Did Bitcoin reach $100k in 2024?",
                endTime: marketEnd,
                initialYes: "1",
                initialNo: "1"
            },
            expectedValid: false
        }
    ];

    let passed = 0;
    let failed = 0;

    for (const test of tests) {
        const result = await testValidation(test.testCase, test.description);

        if (result === test.expectedValid) {
            console.log('   ✓ Test behaved as expected\n');
            passed++;
        } else {
            console.log(`   ✗ Test FAILED - Expected ${test.expectedValid ? 'ACCEPTED' : 'REJECTED'}\n`);
            failed++;
        }

        // Small delay between tests
        await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.log('═══════════════════════════════════════════');
    console.log('📊 TEST RESULTS');
    console.log('═══════════════════════════════════════════');
    console.log(`✅ Passed: ${passed}/${tests.length}`);
    console.log(`❌ Failed: ${failed}/${tests.length}`);
    console.log('═══════════════════════════════════════════\n');

    if (failed === 0) {
        console.log('🎉 ALL TESTS PASSED! Validation fix is working correctly.\n');
    } else {
        console.log('⚠️  Some tests failed. Review the results above.\n');
    }
};

runTests();
