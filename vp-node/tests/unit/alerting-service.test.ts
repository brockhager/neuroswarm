import assert from 'node:assert';
import { createDiscordPayload, dispatchAlert } from '../../alerting-service.js';

// Simple smoke test: payload creation
const now = new Date().toISOString();
const alert = {
  source: 'VP-Node:CN-07-E',
  level: 'CRITICAL',
  title: 'TEST ALERT',
  description: 'Unit test alert',
  details: { validatorId: 'TEST-1', count: 5 },
  timestamp: now,
};

const payload = createDiscordPayload(alert);
assert.ok(payload.embeds && payload.embeds.length === 1, 'embed present');

(async () => {
  // dispatch should complete without throwing
  await dispatchAlert(alert as any);
  console.log('[TEST] alerting-service: passed');
})();
