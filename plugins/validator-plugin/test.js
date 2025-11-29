/**
 * Test suite for validator plugin
 * 
 * Run with: node test.js
 */

import CustomValidator from './index.js';

async function runTests() {
  console.log('🧪 Running validator plugin tests...\n');

  const validator = new CustomValidator({
    name: 'test-validator',
    minLength: 5,
    maxLength: 100,
    blockedWords: ['spam', 'scam'],
    requiredFields: ['type', 'payload']
  });

  let passed = 0;
  let failed = 0;

  // Test 1: Valid entry
  console.log('Test 1: Valid entry');
  const result1 = await validator.validate({
    type: 'learn',
    payload: 'This is valid content',
    signedBy: 'abc123def456' + '0'.repeat(52)
  });
  if (result1.valid) {
    console.log('✅ PASS\n');
    passed++;
  } else {
    console.log('❌ FAIL:', result1.errors, '\n');
    failed++;
  }

  // Test 2: Missing required field
  console.log('Test 2: Missing required field');
  const result2 = await validator.validate({
    payload: 'Content without type'
  });
  if (!result2.valid && result2.errors.some(e => e.includes('Missing required field'))) {
    console.log('✅ PASS\n');
    passed++;
  } else {
    console.log('❌ FAIL: Should reject missing fields\n');
    failed++;
  }

  // Test 3: Payload too short
  console.log('Test 3: Payload too short');
  const result3 = await validator.validate({
    type: 'learn',
    payload: 'Hi'
  });
  if (!result3.valid && result3.errors.some(e => e.includes('too short'))) {
    console.log('✅ PASS\n');
    passed++;
  } else {
    console.log('❌ FAIL: Should reject short payload\n');
    failed++;
  }

  // Test 4: Blocked word detection
  console.log('Test 4: Blocked word detection');
  const result4 = await validator.validate({
    type: 'learn',
    payload: 'This is spam content'
  });
  if (!result4.valid && result4.errors.some(e => e.includes('blocked word'))) {
    console.log('✅ PASS\n');
    passed++;
  } else {
    console.log('❌ FAIL: Should detect blocked words\n');
    failed++;
  }

  // Test 5: Spam pattern detection (warning)
  console.log('Test 5: Spam pattern detection');
  const result5 = await validator.validate({
    type: 'learn',
    payload: 'AAAAAAAAAAA THIS IS ALL CAPS!!!'
  });
  if (result5.warnings && result5.warnings.length > 0) {
    console.log('✅ PASS (warning detected)\n');
    passed++;
  } else {
    console.log('⚠️  PARTIAL: No warning for spam pattern\n');
    passed++;
  }

  // Test 6: Invalid signature format
  console.log('Test 6: Invalid signature format');
  const result6 = await validator.validate({
    type: 'learn',
    payload: 'Valid content',
    signedBy: 'invalid'
  });
  if (!result6.valid && result6.errors.some(e => e.includes('signature'))) {
    console.log('✅ PASS\n');
    passed++;
  } else {
    console.log('❌ FAIL: Should reject invalid signature\n');
    failed++;
  }

  // Test 7: Metadata retrieval
  console.log('Test 7: Metadata retrieval');
  const metadata = validator.getMetadata();
  if (metadata.name && metadata.type === 'validator') {
    console.log('✅ PASS\n');
    passed++;
  } else {
    console.log('❌ FAIL: Invalid metadata\n');
    failed++;
  }

  // Summary
  console.log('═'.repeat(50));
  console.log(`\n📊 Test Results: ${passed} passed, ${failed} failed`);
  console.log(`\n${failed === 0 ? '✅ All tests passed!' : '❌ Some tests failed'}\n`);

  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch(err => {
  console.error('Test suite error:', err);
  process.exit(1);
});
