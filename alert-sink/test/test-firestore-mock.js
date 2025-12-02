const assert = require('assert');
const { writeIncidentToFirestore, buildDedupKey, setFirestoreClientForTest } = require('..');

console.log('Running alert-sink Firestore MOCK integration test...');

// Create a fake firestore client that captures batch operations
const captured = { sets: [], commits: 0 };

const mockBatch = () => ({
  set: (docRef, data, opts) => {
    captured.sets.push({ docRef, data, opts });
  },
  commit: async () => { captured.commits += 1; return Promise.resolve(); }
});

// mock collection/doc
const mockCollection = (name) => ({
  doc: (id) => ({ id, __docId: id }),
});

const mockFirestore = {
  collection: (name) => mockCollection(name),
  batch: mockBatch
};

// inject mock
setFirestoreClientForTest(mockFirestore);

(async () => {
  // Prepare a payload
  const payload = {
    status: 'firing',
    alerts: [
      {
        labels: { alertname: 'TestAlert', severity: 'critical', instance: 'local-1' },
        annotations: { summary: 'Smoke test' },
        startsAt: new Date().toISOString()
      }
    ]
  };

  const ok = await writeIncidentToFirestore(payload);
  assert.ok(ok, 'writeIncidentToFirestore should return true when mock firestore is injected');

  // Validate captured sets
  assert.strictEqual(captured.commits, 1, 'One commit expected');
  assert.strictEqual(captured.sets.length, 1, 'One set expected');

  const setCall = captured.sets[0];
  // docRef should contain the dedupKey id
  const expectedKey = buildDedupKey(payload.alerts[0].labels);
  assert.strictEqual(setCall.docRef.id, expectedKey, 'dedupKey doc id should match expected');

  // Validate fields included in data
  assert.strictEqual(setCall.data.alertname, 'TestAlert');
  assert.strictEqual(setCall.data.severity, 'critical');
  assert.strictEqual(setCall.data.instance, 'local-1');
  assert.ok(setCall.data.lastSeenAt, 'lastSeenAt exists');

  console.log('Alert-sink Firestore MOCK test passed.');
  process.exit(0);
})().catch(err => { console.error('MOCK test failed:', err); process.exit(1); });
