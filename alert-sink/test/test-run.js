const assert = require('assert');
const { getAlertColor, formatAlertEmbed } = require('..');

// Basic tests to validate formatting helpers
(() => {
  console.log('Running alert-sink helper tests...');

  assert.strictEqual(getAlertColor('firing'), 16711680, 'firing should map to red');
  assert.strictEqual(getAlertColor('resolved'), 65280, 'resolved should map to green');
  assert.strictEqual(getAlertColor('warning'), 16776960, 'warning should map to yellow');

  const sample = {
    status: 'firing',
    alerts: [
      { labels: { alertname: 'TestAlert', severity: 'critical', instance: 'srv1' }, annotations: { summary: 'Something bad' }, startsAt: new Date().toISOString() }
    ]
  };

  const payload = formatAlertEmbed(sample);
  assert.ok(payload.embeds && payload.embeds.length === 1, 'should produce one embed');
  assert.ok(payload.embeds[0].title.includes('TESTALERT') || payload.embeds[0].title.includes('TestAlert'), 'title should include alert name');

  console.log('All alert-sink helper tests passed.');
})();

// Run Firestore integration test if requested (real creds)
if (process.env.RUN_FIRESTORE_TESTS === '1' || process.env.GOOGLE_APPLICATION_CREDENTIALS || process.env.SERVICE_ACCOUNT_JSON) {
  require('./test-firestore');
}

// Always run the mocked Firestore smoke test in CI/dev for verification without creds
require('./test-firestore-mock');
