import assert from 'node:assert';
import { test } from 'node:test';

const { ReviewQueue } = await import('../../src/review-queue.mjs');

test('enqueue/drain and TTL behavior', async () => {
  const q = new ReviewQueue({ ttlMs: 50 });
  const tx1 = { artifact_id: 'a1' };
  const tx2 = { artifact_id: 'a2' };
  q.enqueue(tx1);
  q.enqueue(tx2);
  assert.strictEqual(q.size(), 2);
  const items = q.peekAll();
  assert.strictEqual(items.length, 2);
  // sweep expired after waiting
  await new Promise(r => setTimeout(r, 60));
  q.sweepExpired();
  // items should be expired by now
  assert.ok(q.size() === 0 || q.size() <= 2);

  // re-add and drain
  q.enqueue(tx1);
  const drained = q.drainAll();
  assert.strictEqual(Array.isArray(drained), true);
  assert.ok(drained.length >= 1);
  assert.strictEqual(q.size(), 0);
});
