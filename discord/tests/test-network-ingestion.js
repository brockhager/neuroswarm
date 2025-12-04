const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { createDeterministicCid, addBufferToIpfs } = require('../src/lib/network_ingestion');

(async function run() {
  console.log('Running Agent9 network_ingestion unit tests...');

  // 1) Deterministic CID correctness
  const buf = Buffer.from('hello world ' + Date.now());
  const cid = createDeterministicCid(buf);
  console.log('deterministic cid', cid);
  assert.ok(typeof cid === 'string' && cid.startsWith('bafy'), 'deterministic CID should be a bafy-prefixed string');

  // 2) addBufferToIpfs - if IPFS_API_URL is configured this will talk to a real daemon
  try {
    const ipfsCid = await addBufferToIpfs(buf);
    console.log('addBufferToIpfs returned', ipfsCid);
    assert.ok(typeof ipfsCid === 'string' && ipfsCid.length > 0, 'addBufferToIpfs must return a string CID');

    // When ipfs client not present, we'll fall back to bafy deterministic value
    if (!process.env.IPFS_API_URL) {
      assert.ok(ipfsCid.startsWith('bafy'), 'fallback cid should be deterministic bafy prefix');
    }

  } catch (err) {
    console.error('addBufferToIpfs failed (non-fatal in unit tests). Error:', err && err.message);
    process.exit(2);
  }

  console.log('\nALL TESTS PASSED');
  process.exit(0);
})();
