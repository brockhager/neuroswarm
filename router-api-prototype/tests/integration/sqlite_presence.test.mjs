import test from 'node:test';
import assert from 'assert';
import { SQLITE_AVAILABLE } from '../../src/pinning.js';

test('SQLite presence assertion (CI-driven)', async (t) => {
  // This test is intentionally conditional. CI sets EXPECT_SQLITE=true when it expects
  // the native better-sqlite3 path to be active. Local runs without native builds will
  // skip the strict assertion.
  const expectSqlite = String(process.env.EXPECT_SQLITE || '').toLowerCase() === 'true';

  if (!expectSqlite) {
    t.skip('EXPECT_SQLITE not set — skipping assertion for local/dev run');
    return;
  }

  assert.ok(SQLITE_AVAILABLE, 'CI expected SQLite to be available (better-sqlite3 must have been loaded)');
});
