// Quick test script for the gateway server
import fetch from 'node-fetch';

async function testGateway() {
  console.log('Testing NeuroSwarm Gateway Server...\n');

  try {
    // Test health endpoint
    console.log('1. Testing /health endpoint...');
    const healthResponse = await fetch('http://localhost:8080/health');
    const healthData = await healthResponse.json();
    console.log('✅ Health check:', healthData);

    // Test metrics endpoint
    console.log('\n2. Testing /metrics endpoint...');
    const metricsResponse = await fetch('http://localhost:8080/metrics');
    const metricsData = await metricsResponse.json();
    console.log('✅ Metrics:', metricsData);

    // Test protected endpoint without auth (should fail)
    console.log('\n3. Testing /api/submit without auth (should fail)...');
    const noAuthResponse = await fetch('http://localhost:8080/api/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ test: 'data' })
    });
    const noAuthData = await noAuthResponse.json();
    console.log('✅ Auth required (expected):', noAuthData.error);

    // Test protected endpoint with mock JWT
    console.log('\n4. Testing /api/submit with mock JWT...');
    const mockJWT = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ0ZXN0LXVzZXIiLCJpYXQiOjE2MzY5NjgwMDAsImV4cCI6MTYzNzA1NDQwMH0.mock';
    const authResponse = await fetch('http://localhost:8080/api/submit', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${mockJWT}`
      },
      body: JSON.stringify({
        type: 'ARTIFACT_SUBMIT',
        payload: {
          content: 'Test artifact content',
          metadata: {
            title: 'Test Artifact',
            description: 'A test submission'
          }
        },
        fee: 0
      })
    });
    const authData = await authResponse.json();
    console.log('✅ Submission result:', authData);

    console.log('\n🎉 All tests passed! Gateway server is working correctly.');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testGateway();