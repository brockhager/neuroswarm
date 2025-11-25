import { query } from '../sources/adapters/math-calculator.js';

const testQueries = [
    "what is 23523 * 2048",
    "23523 * 2048",
    "calculate 100 + 50",
    "500 / 25"
];

console.log('Testing math-calculator adapter:\n');

async function runTests() {
    for (const testQuery of testQueries) {
        console.log(`Query: "${testQuery}"`);
        const result = await query({ query: testQuery });
        if (result.value) {
            console.log(`✓ Answer: ${result.value.answer.text}`);
        } else {
            console.log(`✗ Error: ${result.error}`);
        }
        console.log('');
    }
}

runTests();
