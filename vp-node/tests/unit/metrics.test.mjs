import { test } from 'node:test';
import assert from 'node:assert';

const metrics = await import('../../src/metrics.mjs');

test('metrics handler returns Prometheus metrics and updates on state change', async () => {
  // set some values
  metrics.vmSetCurrentState('TEST_STATE');
  metrics.incrementStateTransition('INIT', 'TEST_STATE');
  metrics.setReviewQueueSize(3);
  metrics.incProduceAttempt();
  metrics.incProduceFailure();
  metrics.setNsSyncLagSeconds(12);

  // fake express-res with send capture
  let body = '';
  const res = {
    headers: {},
    set: (k, v) => { res.headers[k] = v; },
    send: (s) => { body = body + String(s); },
    status: (code) => { res.statusCode = code; return res; }
  };

  await metrics.metricsHandler({}, res);
  assert.ok(body.includes('vp_current_state'));
  assert.ok(body.includes('vp_state_transitions_total'));
  assert.ok(body.includes('vp_review_queue_size'));
  assert.ok(body.includes('vp_produce_attempts_total'));
  assert.ok(body.includes('vp_produce_failures_total'));
});
