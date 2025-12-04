import test from 'node:test';
import assert from 'assert';
import { deterministicSortEntries, txIdFor, computeMerkleRootFromTxs } from '../../src/producer-core.mjs';

test('deterministicSortEntries should order by priority, fee, timestamp, id', () => {
  const base = [
    { id: 'a', priority: 2, fee: 5, timestamp: 1000 },
    { id: 'b', priority: 1, fee: 1, timestamp: 900 },
    { id: 'c', priority: 1, fee: 10, timestamp: 1100 },
    { id: 'd', priority: 1, fee: 10, timestamp: 1100, extra: 'same', signature: 'sig' }
  ];

  // Shuffle order
  const shuffled = [base[2], base[0], base[3], base[1]];
  const sorted = deterministicSortEntries(shuffled);

  // Expected order: priority 1 entries first (c,d,b) but fee & ts ordering -> c and d equal, fallback to id
  // Within priority=1: order by fee descending -> c,d (fee 10), b (fee 1). For c and d same fee+timestamp -> id lexicographic c < d.
  assert.strictEqual(sorted[0].id, 'c');
  assert.strictEqual(sorted[1].id, 'd');
  assert.strictEqual(sorted[2].id, 'b');
  assert.strictEqual(sorted[3].id, 'a');
});

test('txIdFor is stable and independent of signature field', () => {
  const tx = { id: 'x', content: 'hello', timestamp: 1000 };
  const txSig = { ...tx, signature: 'xxx' };
  const id1 = txIdFor(tx);
  const id2 = txIdFor(txSig);
  assert.strictEqual(id1, id2);
});

test('computeMerkleRootFromTxs should produce deterministic root regardless of order', () => {
  const t1 = { id: 't1', content: 'a' };
  const t2 = { id: 't2', content: 'b' };
  const t3 = { id: 't3', content: 'c' };

  // Merkle root should match when entries are deterministically ordered first
  const sorted1 = deterministicSortEntries([t1, t2, t3]);
  const sorted2 = deterministicSortEntries([t3, t1, t2]);
  const root1 = computeMerkleRootFromTxs(sorted1);
  const root2 = computeMerkleRootFromTxs(sorted2);
  assert.strictEqual(root1, root2, 'Merkle root should match when deterministic sort is applied before merkle calculation');
});
