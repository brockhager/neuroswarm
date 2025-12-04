import test from 'node:test';
import assert from 'assert';

test('SQLite fallback assertion (CI-driven)', async (t) => {
  // This test only runs in environments that explicitly force the fallback.
  const expectFallback = String(process.env.FORCE_FALLBACK || '').toLowerCase() === 'true';
  if (!expectFallback) {
    t.skip('FORCE_FALLBACK not set — skipping fallback assertion');
    return;
  }

  // Import dynamically so the module picks up the env var at load-time.
  const mod = await import('../../src/pinning.js');

  // Confirm that the module reported fallback active
  assert.strictEqual(mod.FORCE_FALLBACK_ACTIVE, true, 'Expected FORCE_FALLBACK_ACTIVE to be true in forced runs');
  assert.strictEqual(mod.SQLITE_AVAILABLE, false, 'When forced fallback is active, SQLITE_AVAILABLE must be false');

  // Validate the fallback flow (file-backed JSON) works as expected
  await mod.clearPins();
  const created = await mod.pinArtifact('QmFallbackTest', 'fallback-agent', { filename: 'fb.txt', size: 32 });
  assert.strictEqual(created.cid, 'QmFallbackTest');
  const pins = await mod.listPins();
  assert.ok(Array.isArray(pins) && pins.length === 1 && pins[0].cid === 'QmFallbackTest');
  await mod.clearPins();
});
