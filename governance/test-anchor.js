// Test script for anchor service functionality
import { anchorService } from './dist/services/anchor-service.js';

async function testAnchorService() {
  console.log('Testing Anchor Service...');

  try {
    // Test getting anchor status
    console.log('Getting anchor status...');
    const status = await anchorService.getAnchorStatus();
    console.log('Anchor Status:', JSON.stringify(status, null, 2));

    // Test getting alerts
    console.log('Getting alerts...');
    const alerts = await anchorService.getAlerts();
    console.log('Alerts:', alerts);

    // Test verification (this will fail without Solana CLI, but should handle gracefully)
    console.log('Testing verification...');
    const verified = await anchorService.verifyAnchor();
    console.log('Verification result:', verified);

  } catch (error) {
    console.error('Test failed:', error);
  }
}

testAnchorService().then(() => {
  console.log('Test completed');
  process.exit(0);
}).catch((error) => {
  console.error('Test error:', error);
  process.exit(1);
});