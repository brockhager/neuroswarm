import assert from 'assert';
import { VaultTransitConnector } from '../vault-transit-connector-vault.ts';

// Test 1: parses vault:v1:<b64> signature correctly
const rawSig = Buffer.from('this-is-a-raw-signature');
const b64 = rawSig.toString('base64');

const mockClient = {
  tokenLookupSelf: async () => ({ accessor: 'ok' }),
  write: async (path, body) => ({ data: { signature: `vault:v1:${b64}` } }),
};

const cfg = { transitMount: 'transit' };
const conn = new VaultTransitConnector(cfg, mockClient);
await conn.authenticate();

const out = await conn.signHash('some-key', Buffer.from([1, 2, 3]));
assert.ok(Buffer.isBuffer(out));
assert.strictEqual(out.toString('base64'), b64);
console.log('✓ Test 1: vault:v1:<b64> signature parsed correctly');

// Test 2: parses raw signature field correctly
const rawSig2 = Buffer.from('raw-signature-2');
const mockClient2 = {
  tokenLookupSelf: async () => ({ accessor: 'ok' }),
  write: async (path, body) => ({ data: { signature_raw: rawSig2.toString('base64') } }),
};

const conn2 = new VaultTransitConnector({}, mockClient2);
await conn2.authenticate();

const res = await conn2.signHash('key2', Buffer.from([9, 9, 9]));
assert.strictEqual(res.toString(), rawSig2.toString());
console.log('✓ Test 2: signature_raw field parsed correctly');

console.log('VaultTransitConnector tests passed');
