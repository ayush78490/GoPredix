require('dotenv').config();

async function testValidator() {
  console.log('🧪 Testing Market Validator\n');

  const testCases = [
    {
      name: '✅ Valid Future Event',
      data: {
        question: "Will Bitcoin reach $150,000 by December 31, 2025?",
        endTime: Math.floor(new Date('2025-12-31').getTime() / 1000),
        initialYes: "0.1",
        initialNo: "0.1"
      }
    },
    {
      name: '❌ Historical Event (Already Happened)',
      data: {
        question: "Did Bitcoin reach $100k in 2024?",
        endTime: Math.floor(new Date('2025-06-30').getTime() / 1000),
        initialYes: "0.1",
        initialNo: "0.1"
      }
    },
    {
      name: '❌ Event After Market End',
      data: {
        question: "Will SpaceX land on Mars by 2030?",
        endTime: Math.floor(new Date('2025-12-31').getTime() / 1000),
        initialYes: "0.1",
        initialNo: "0.1"
      }
    },
    {
      name: '❌ Subjective Question',
      data: {
        question: "Will the new iPhone be good?",
        endTime: Math.floor(new Date('2025-12-31').getTime() / 1000),
        initialYes: "0.1",
        initialNo: "0.1"
      }
    }
  ];

  for (const testCase of testCases) {
    console.log(`\n📝 Test Case: ${testCase.name}`);
    console.log(`Question: "${testCase.data.question}"`);
    console.log('Sending request...\n');

    try {
      const response = await fetch('http://localhost:3001/api/validate-market', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testCase.data)
      });

      const result = await response.json();
      
      console.log('Response:');
      console.log(`  Valid: ${result.valid ? '✅' : '❌'}`);
      console.log(`  Reason: ${result.reason}`);
      console.log(`  Category: ${result.category}`);
      
      if (result.eventAnalysis) {
        console.log('  Event Analysis:');
        console.log(`    - Already Happened: ${result.eventAnalysis.alreadyHappened ? 'YES' : 'NO'}`);
        console.log(`    - Outcome Known: ${result.eventAnalysis.outcomeKnown ? 'YES' : 'NO'}`);
        console.log(`    - Date Conflict: ${result.eventAnalysis.dateConflict ? 'YES' : 'NO'}`);
      }
      
      console.log('─'.repeat(80));
    } catch (error) {
      console.error('❌ Test failed:', error.message);
      console.log('─'.repeat(80));
    }
  }

  console.log('\n✅ All tests completed!\n');
}

// Check if server is running
async function checkServer() {
  try {
    const response = await fetch('http://localhost:3001/health');
    const data = await response.json();
    console.log('✅ Server is running');
    console.log('OpenAI API Key:', data.env.hasOpenAIKey ? 'Found ✅' : 'Missing ❌');
    return true;
  } catch (error) {
    console.error('❌ Server is not running. Please start it with: npm start');
    return false;
  }
}

async function run() {
  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║        Market Validator Test Suite                    ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');
  
  const serverRunning = await checkServer();
  if (serverRunning) {
    console.log('');
    await testValidator();
  }
}

run();