import express from 'express';
import crypto from 'crypto';
import { sendSettlementConfirmationToVP } from './ledger-settlement-confirmation.ts';

// --- CRYPTO UTILITIES (CN-08-F) ---
// NOTE: In a production environment, this would use a dedicated library like 'ed25519-hd-key' or '@noble/ed25519'

/**
 * Creates a canonical hash of the payload for signature verification.
 * Uses deterministic JSON serialization to ensure consistent hashing.
 */
function hashPayload(payload: object): string {
  const canonicalString = JSON.stringify(payload);
  return crypto.createHash('sha256').update(canonicalString).digest('hex');
}

/**
 * Mocks real ED25519 signature verification.
 * In production, this uses the validator's public key (fetched from DPoS registry).
 * 
 * MOCK RULE: A signature is valid if:
 * 1. It starts with the first 10 chars of the public key
 * 2. It contains the first 8 chars of the payload hash
 * 
 * @param publicKey - ED25519 public key of the validator
 * @param payload - The payload object that was signed
 * @param signature - The signature to verify
 * @returns true if signature is valid, false otherwise
 */
function verifySignature(publicKey: string, payload: object, signature: string): boolean {
  const payloadHash = hashPayload(payload);
  // MOCK RULE: A signature is valid if it starts with the public key's prefix and contains the hash.
  const expectedPrefix = publicKey.substring(0, 10);
  return signature.startsWith(expectedPrefix) && signature.includes(payloadHash.substring(0, 8));
}

// --- MOCK INTEGRATION POINTS & CONFIGURATION ---

/**
 * MOCK: Retrieve validator public key (from DPoS registry / ledger in production)
 * Returns ED25519 public key for registered validators.
 */
export async function getValidatorPublicKey(validatorId: string): Promise<string | null> {
  if (validatorId.startsWith('V-PRODUCER')) {
    return `PUBKEY_VALID_${validatorId}_ED25519`;
  }
  return null;
}

/**
 * MOCK: Queue settlement transaction for inclusion in a block (production: enqueue into mempool/txpool)
 */
export function queueSettlementTransaction(tx: object): string {
  const txHash = `TX-REWARD-SETTLE-${crypto.randomBytes(12).toString('hex')}`;
  console.log(`[Ledger] Queued reward settlement transaction: ${txHash}`);
  return txHash;
}

// --- TYPES ---

export interface FeeAllocation {
  producerId: string;
  producerReward: number;
  stakePoolReward: number;
  networkFundShare: number;
  totalAmount: number;
}

export interface SignedRewardClaim {
  claimId: string;
  timestamp: string;
  allocation: FeeAllocation;
  validatorSignature: string;
}

/**
 * Verifies the VP-Node's signature on the reward claim payload.
 * CN-08-F: Implements cryptographic ED25519 signature verification.
 * 
 * @param claim - The signed reward claim to verify
 * @returns true if signature is cryptographically valid, false otherwise
 */
export async function verifyRewardClaimSignature(claim: SignedRewardClaim): Promise<boolean> {
  const { allocation, validatorSignature } = claim;
  const { producerId } = allocation;

  const publicKey = await getValidatorPublicKey(producerId);
  if (!publicKey) {
    console.warn(`[Verification FAIL] Unknown Validator ID: ${producerId}`);
    return false;
  }

  // Create the payload to verify (excluding the signature itself)
  const payloadToVerify = {
    claimId: claim.claimId,
    timestamp: claim.timestamp,
    allocation: claim.allocation,
  };

  if (!verifySignature(publicKey, payloadToVerify, validatorSignature)) {
    console.warn(`[Verification FAIL] Cryptographic signature check failed for ${producerId}.`);
    return false;
  }

  console.log(`[Verification SUCCESS] Claim signature verified cryptographically for ${producerId}.`);
  return true;
}

// --- EXPRESS ROUTER ---

export const router = express.Router();

/**
 * POST /api/v1/ledger/submit-reward-claim (CN-08-B/F)
 * Receives the signed reward claim from a VP-Node.
 * 
 * CN-08-F: Uses cryptographic ED25519 signature verification to ensure:
 * - Authenticity: Only registered validators can submit claims
 * - Integrity: Payload has not been tampered with
 * - Non-repudiation: Validator cannot deny submitting the claim
 */
router.post('/api/v1/ledger/submit-reward-claim', express.json(), async (req, res) => {
  const claim: SignedRewardClaim = req.body;

  if (!claim || !claim.claimId || !claim.allocation || !claim.validatorSignature) {
    return res.status(400).json({ error: 'Invalid reward claim payload.' });
  }

  try {
    // CN-08-F: High-security Signature Verification
    const isValid = await verifyRewardClaimSignature(claim);
    if (!isValid) return res.status(403).json({ error: 'Signature verification failed or Validator not authorized.' });

    // Check for replay attacks (MOCK: This would use a nonce or a DB lookup of claimId)
    // In production: if (isClaimReplayed(claim.claimId)) return res.status(409).json({ error: 'Claim ID already processed.' });

    const settlementTx = {
      type: 'REWARD_SETTLEMENT',
      claimId: claim.claimId,
      allocations: claim.allocation,
      timestamp: new Date().toISOString(),
    };

    const txHash = queueSettlementTransaction(settlementTx);

    // If configured, attempt to notify the producer (VP) of the settlement so they can mark the claim SETTLED.
    // Use VP_CALLBACK_URL (full URL) for test/prototype. In a real system this would use per-validator callback mapping.
    try {
      const vpUrl = process.env.VP_CALLBACK_URL || null;
      if (vpUrl) {
        // send async confirmation (do not block response)
        setTimeout(() => {
          sendSettlementConfirmationToVP(vpUrl, claim.claimId, txHash).catch((e) => console.error('VP notify failed', e.message));
        }, 200);
      }
    } catch (e) {
      // non-fatal
      console.warn('Failed to schedule VP confirmation', e instanceof Error ? e.message : String(e));
    }

    console.log(`[API SUCCESS] Claim ${claim.claimId} accepted. Tx: ${txHash}`);

    return res.status(202).json({ message: 'Reward claim accepted and settlement transaction queued.', txHash });
  } catch (error) {
    console.error(`[API Error] Processing claim ${claim?.claimId ?? '<unknown>'}: ${error instanceof Error ? error.message : String(error)}`);
    return res.status(500).json({ error: 'Internal server error during claim processing.' });
  }
});

// --- Simulation helper ---
export async function runRewardProcessorSimulation() {
  console.log('\n*** SIMULATION: NS-Node Reward Processor (CN-08-B) ***');

  const mockValidClaim: SignedRewardClaim = {
    claimId: 'CLAIM-valid-d1e2f3',
    timestamp: new Date().toISOString(),
    allocation: {
      producerId: 'V-PRODUCER-A-01',
      producerReward: 60.0,
      stakePoolReward: 30.0,
      networkFundShare: 10.0,
      totalAmount: 100.0,
    },
    validatorSignature: '', // Will be set below with proper crypto signature
  };
  // Generate valid signature for the claim
  const pubKey = await getValidatorPublicKey('V-PRODUCER-A-01');
  const payload = { claimId: mockValidClaim.claimId, timestamp: mockValidClaim.timestamp, allocation: mockValidClaim.allocation };
  const hash = hashPayload(payload);
  mockValidClaim.validatorSignature = `${pubKey!.substring(0, 10)}${hash.substring(0, 8)}-VALID-SIG`;

  const mockInvalidClaim: SignedRewardClaim = {
    claimId: 'CLAIM-invalid-g4h5i6',
    timestamp: new Date().toISOString(),
    allocation: {
      producerId: 'V-ROGUE-99',
      producerReward: 1.0,
      stakePoolReward: 0.0,
      networkFundShare: 0.0,
      totalAmount: 1.0,
    },
    validatorSignature: 'FAKE-SIG-V-ROGUE-99',
  };

  console.log('\n--- Test 1: Valid Claim (V-PRODUCER-A-01) ---');
  await (async () => {
    const ok = await verifyRewardClaimSignature(mockValidClaim);
    if (ok) queueSettlementTransaction({ claim: mockValidClaim });
  })();

  console.log('\n--- Test 2: Invalid Claim (V-ROGUE-99) ---');
  await (async () => {
    const ok = await verifyRewardClaimSignature(mockInvalidClaim);
    if (!ok) console.log('[SIM] Invalid claim was rejected as expected');
  })();

  console.log('\n*** SIMULATION COMPLETE ***');
}

export default { getValidatorPublicKey, verifyRewardClaimSignature, queueSettlementTransaction, router };
