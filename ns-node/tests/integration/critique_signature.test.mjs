import test from 'node:test';
import assert from 'assert';
import crypto from 'crypto';
import { validators, accounts, state } from '../../src/services/state.js';
import { validateArtifactCritiqueTx } from '../../src/transactions/validation.js';
import { canonicalize } from '../../src/utils/crypto.js';

test('CN-08-C: validateArtifactCritiqueTx accepts valid signed critique from designated producer', async () => {
  // Create keypair and register validator
  const kp = crypto.generateKeyPairSync('ed25519');
  const priv = kp.privateKey.export({ type: 'pkcs8', format: 'pem' });
  const pub = kp.publicKey.export({ type: 'spki', format: 'pem' });
  const vid = 'test-validator-1';

  validators.set(vid, { stake: 500000000000, publicKey: pub, slashed: false });
  accounts.set(vid, { address: vid, is_validator_candidate: true, staked_nst: '500000000000' });
  state.totalStake = 500000000000; // make deterministic single eligible validator

  const payload = {
    artifact_id: 'bafybeiexamplecid',
    review_block_height: 10,
    critique_version: '1.0.0',
    llm_model: 'test-model',
    issues: []
  };

  const tx = { type: 'ARTIFACT_CRITIQUE', payload, signedBy: vid, timestamp: Date.now() };

  // sign using the same canonicalization strategy used in NS
  const copy = { ...tx };
  delete copy.signature;
  const canonical = canonicalize(copy);
  const sig = crypto.sign(null, Buffer.from(canonical, 'utf8'), kp.privateKey).toString('base64');
  tx.signature = sig;

  const result = validateArtifactCritiqueTx(tx);
  assert.strictEqual(result.ok, true, 'Valid signed critique should be accepted');
});

test('CN-08-C: validateArtifactCritiqueTx rejects missing or invalid signatures', async () => {
  const payload = {
    artifact_id: 'bafybeitestbad',
    review_block_height: 11,
    critique_version: '1.0.0',
    llm_model: 'test-model',
    issues: []
  };

  const txNoSig = { type: 'ARTIFACT_CRITIQUE', payload, signedBy: 'test-validator-1' };
  const r1 = validateArtifactCritiqueTx(txNoSig);
  assert.strictEqual(r1.ok, false, 'tx without signature should be rejected');
  assert.strictEqual(r1.reason, 'missing_signature');

  const txInvalidSig = { type: 'ARTIFACT_CRITIQUE', payload, signedBy: 'test-validator-1', signature: 'deadbeef' };
  const r2 = validateArtifactCritiqueTx(txInvalidSig);
  assert.strictEqual(r2.ok, false, 'tx with invalid signature should be rejected');
});
