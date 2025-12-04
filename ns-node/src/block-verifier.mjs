import { canonicalize, computeMerkleRoot, txIdFor, verifyEd25519 } from './utils/crypto.js';

export function verifyBlockSubmission({ header, txs, signature, publicKeyPem }) {
  if (!header || !signature || !publicKeyPem) return { ok: false, reason: 'missing_fields' };

  // compute tx ids and recompute merkle root
  const txIds = (txs || []).map(tx => txIdFor(tx));
  const expectedMerkle = computeMerkleRoot(txIds);
  if (String(expectedMerkle) !== String(header.merkleRoot)) {
    return { ok: false, reason: 'merkle_mismatch', expected: expectedMerkle, found: header.merkleRoot };
  }

  // verify signature against canonical header bytes (exclude signature field if present)
  const headerNoSig = { ...header };
  if (typeof headerNoSig.signature !== 'undefined') delete headerNoSig.signature;
  const headerData = canonicalize(headerNoSig);
  const sigOk = verifyEd25519(publicKeyPem, headerData, signature);
  if (!sigOk) return { ok: false, reason: 'invalid_signature' };

  return { ok: true };
}

export default verifyBlockSubmission;
