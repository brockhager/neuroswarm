import assert from 'assert';
import { KmsVaultClient } from '../../shared/key-management.ts';

// This test verifies the CI-enforced sign-only mode prevents fetching private keys
process.env.KMS_ENFORCE_SIGN_ONLY = 'true';

const client = new KmsVaultClient('MOCK');

try {
  await client.getPrivateKeyForTestsOnly('SAMPLE-KEY');
  throw new Error('should have thrown');
} catch (e) {
  assert.ok(e instanceof Error);
  assert.match(e.message, /getPrivateKeyForTestsOnly disabled/);
}

console.log('KmsVaultClient sign-only enforcement test passed');
