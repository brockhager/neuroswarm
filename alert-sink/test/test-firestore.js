const assert = require('assert');
const { writeIncidentToFirestore } = require('..');

console.log('Running alert-sink Firestore integration test...');

// Skip if credentials not provided
const hasCreds = !!(process.env.GOOGLE_APPLICATION_CREDENTIALS || process.env.SERVICE_ACCOUNT_JSON);
if (!hasCreds) {
  console.log('Skipping Firestore integration test - no credentials (set GOOGLE_APPLICATION_CREDENTIALS or SERVICE_ACCOUNT_JSON).');
  process.exit(0);
}

(async () => {
  try {
    const now = new Date().toISOString();
    const payload = {
      status: 'firing',
      alerts: [
        {
          labels: { alertname: `IntegrationTest-${now}`, severity: 'critical', instance: 'local-test' },
          annotations: { summary: 'Integration test write' },
          startsAt: now
        }
      ]
    };

    const ok = await writeIncidentToFirestore(payload);
    assert.ok(ok, 'writeIncidentToFirestore should return true when firestore is configured');

    console.log('Firestore write helper returned success. Test passed.');
    process.exit(0);
  } catch (err) {
    console.error('Firestore integration test failed:', err);
    process.exit(2);
  }
})();
