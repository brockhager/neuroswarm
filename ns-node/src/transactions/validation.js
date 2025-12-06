import { validateCritiquePayload } from '../services/critique-validation.js';
import { verifyEd25519, canonicalize } from '../utils/crypto.js';
import { getProducer } from '../services/chain.js';
import { validators } from '../services/state.js';

/**
 * Validate ARTIFACT_CRITIQUE transactions for CN-08-C enforcement.
 * Ensures:
 * - payload matches strict schema
 * - tx is signed by a registered validator
 * - producer provenance: the signed validator must be the designated producer for the review_block_height
 */
export function validateArtifactCritiqueTx(tx) {
  if (!tx || tx.type !== 'ARTIFACT_CRITIQUE') return { ok: true };

  const payload = tx.payload || tx || tx.payload || {};

  // Schema validation
  const schemaRes = validateCritiquePayload(payload);
  if (!schemaRes.valid) return { ok: false, reason: 'invalid_payload', details: schemaRes.errors };

  // SignedBy should be present and correspond to a registered validator
  const signer = tx.signedBy || tx.from || tx.validatorId || null;
  if (!signer) return { ok: false, reason: 'missing_signer' };
  if (!validators.has(signer)) return { ok: false, reason: 'signer_not_registered' };

  // Signature must exist and verify against validator publicKey
  if (!tx.signature || typeof tx.signature !== 'string') return { ok: false, reason: 'missing_signature' };
  const v = validators.get(signer);
  const pub = v && v.publicKey;
  if (!pub) return { ok: false, reason: 'no_public_key_for_signer' };

  // Verify signature over canonicalized tx (exclude signature field)
  const copy = { ...tx };
  delete copy.signature;
  delete copy._meta; // ignore any transient metadata
  const canonical = canonicalize(copy);
  const verified = verifyEd25519(pub, canonical, tx.signature);
  if (!verified) return { ok: false, reason: 'invalid_signature' };

  // Producer-only provenance: the signer must be the designated producer for the requested height
  const height = payload && typeof payload.review_block_height === 'number' ? payload.review_block_height : null;
  if (height === null) return { ok: false, reason: 'missing_review_block_height' };
  const designated = getProducer(height);
  if (!designated) return { ok: false, reason: 'no_designated_producer_for_height' };
  if (designated !== signer) return { ok: false, reason: 'signer_not_designated_producer', details: { designated, signer } };

  return { ok: true };
}

export default { validateArtifactCritiqueTx };
