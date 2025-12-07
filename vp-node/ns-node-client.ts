import crypto from 'crypto';
import { dispatchAlert, type OperatorAlert } from './alerting-service.ts';
import { getCanonicalPayloadHash, signPayload, bufferToHex } from '../shared/crypto-utils.ts';
import { KmsVaultClient, PublicKeyRegistry } from '../shared/key-management.ts';

// --- CRYPTO UTILITIES (CN-08-F) ---
// NOTE: In a production environment, this would use a dedicated library like 'ed25519-hd-key' or '@noble/ed25519'

/**
 * Mocks real ED25519 signing.
 * In production, this uses the validator's private key (from secure keystore).
 * 
 * MOCK RULE: A signature consists of:
 * 1. First 10 chars of the public key (identifies signer)
 * 2. First 8 chars of the payload hash (proves integrity)
 * 3. A suffix marking it as a valid signature
 * 
 * @param privateKey - ED25519 private key (in production, from secure keystore)
 * @param publicKey - ED25519 public key of the validator
 * @param payload - The payload object to sign
 * @returns The ED25519 signature
 */
// signing handled by shared/crypto-utils.ts (ED25519 mock for Phase 1)

/**
 * Retrieves the validator's keypair from secure storage.
 * In production, this would use a hardware security module (HSM) or encrypted keystore.
 */
async function getValidatorPublicKey(validatorId: string): Promise<Buffer> {
  const registry = new PublicKeyRegistry();
  const pub = await registry.getPublicKey(validatorId);
  return pub;
}

// Hardened client config
const DEFAULT_TIMEOUT_MS = Number(process.env.NS_CLIENT_TIMEOUT_MS || 5_000);
const DEFAULT_RETRIES = Number(process.env.NS_CLIENT_RETRIES || 3);
const BACKOFF_BASE_MS = Number(process.env.NS_CLIENT_BACKOFF_BASE_MS || 120);
const NS_API_AUTH_TOKEN = process.env.NS_NODE_API_TOKEN || null; // optional bearer token

// CN-07-E: NS-Node submission client (mock/prototype)
const NS_NODE_API_URL = process.env.NS_NODE_API_URL || 'http://ns-node:8080/api/v1';
const NS_NODE_SLASHING_ENDPOINT = `${NS_NODE_API_URL}/ledger/submit-slashing-evidence`;

export interface SlashingEvidence {
  evidenceId: string;
  validatorId: string;
  blockHeight?: number;
  triggerValue?: number;
  eraId?: number;
}

export interface SignedSlashingEvidence {
  evidence: SlashingEvidence;
  validatorSignature: string;
}

/** Submit signed slashing evidence to the NS-Node for ledger processing.
 * Prototype: performs a mock network call and emits an operator INFO alert on success
 * and CRITICAL on failure (best-effort).
 */
export async function submitSignedEvidence(signedEvidence: SignedSlashingEvidence): Promise<void> {
  const evidenceId = signedEvidence.evidence.evidenceId;
  console.log(`[NS Client] Attempting final submission of evidence: ${evidenceId} -> ${NS_NODE_SLASHING_ENDPOINT}`);

  try {
    // CN-07-H: sign the evidence (Phase 1 - mock ED25519 via shared utils)
    try {
      const validatorId = signedEvidence.evidence.validatorId;
      const vault = new KmsVaultClient();
      const payloadHash = getCanonicalPayloadHash({ evidence: signedEvidence.evidence });
      const signatureBuf = await vault.signPayloadInKms(validatorId, payloadHash);
      signedEvidence.validatorSignature = bufferToHex(signatureBuf);
    } catch (e) {
      console.warn('Failed to sign evidence (mock)', e instanceof Error ? e.message : String(e));
    }

    // In production: POST to NS_NODE_SLASHING_ENDPOINT with proper authentication & TLS
    // Here we mock the network call and return a simulated txHash
    await new Promise((r) => setTimeout(r, 40));

    const mockResponse = {
      status: 202,
      message: 'Evidence accepted. Queued for Ledger processing.',
      txHash: `TX-${crypto.randomBytes(12).toString('hex')}`,
    };

    console.log(`[NS Client SUCCESS] Evidence ${evidenceId} accepted and queued as ${mockResponse.txHash}`);

    // Best-effort: emit an INFO alert to the operator channel confirming queueing
    const confirmationAlert: OperatorAlert = {
      source: 'VP-Node:NS-Client',
      level: 'INFO',
      title: 'Slashing Evidence Queued',
      description: `Evidence for ${signedEvidence.evidence.validatorId} was accepted by NS and queued for ledger processing.`,
      details: { evidenceId, txHash: mockResponse.txHash },
      timestamp: new Date().toISOString(),
    };

    await dispatchAlert(confirmationAlert).catch(() => {});
  } catch (error) {
    console.error(`[NS Client ERROR] Submission failed for ${evidenceId}: ${error instanceof Error ? error.message : String(error)}`);

    const failureAlert: OperatorAlert = {
      source: 'VP-Node:NS-Client',
      level: 'CRITICAL',
      title: 'Slashing Submission Failed',
      description: `Failed to submit slashing evidence ${evidenceId} to NS-Node. Manual intervention required.`,
      details: { evidenceId, error: error instanceof Error ? error.message : String(error) },
      timestamp: new Date().toISOString(),
    };

    await dispatchAlert(failureAlert).catch(() => {});
    throw error; // surface failure for callers that need strict semantics
  }
}

// Generic reward-claim submission helper used by the fee distribution service (CN-08-A).
// CN-08-F: Signs the payload using ED25519 before submission to ensure authenticity.
export async function submitRewardClaim(request: { type: string; payload: any }): Promise<{ txHash?: string; status: number; message?: string }> {
  const endpoint = `${NS_NODE_API_URL}/ledger/submit-reward-claim`;

  try {
    // CN-08-F: Sign the reward claim payload
    const validatorId = request.payload?.allocation?.producerId;
    if (!validatorId) {
      throw new Error('Missing producerId in reward claim allocation');
    }
    const payloadToSign = {
      claimId: request.payload.claimId,
      timestamp: request.payload.timestamp,
      allocation: request.payload.allocation,
    };

    // Use shared crypto utility to sign the canonical payload hash
    const payloadHash = getCanonicalPayloadHash(payloadToSign);
    // Sign inside KMS (private key never returned)
    const vault = new KmsVaultClient();
    const signatureBuf = await vault.signPayloadInKms(validatorId, payloadHash);
    const signatureHex = bufferToHex(signatureBuf);

    const signedPayload = { ...request.payload, validatorSignature: signatureHex };

    console.log(`[NS Client] Submitting signed reward claim for ${validatorId}`);

    const r = await postWithRetry(endpoint, signedPayload, { timeoutMs: DEFAULT_TIMEOUT_MS, retries: DEFAULT_RETRIES });

    console.log(`[NS Client SUCCESS] Reward claim queued as ${r?.txHash ?? '<unknown>'}`);

    const confirmationAlert: OperatorAlert = {
      source: 'VP-Node:NS-Client',
      level: 'INFO',
      title: 'Reward Claim Queued',
      description: `Reward claim was accepted by NS and queued for settlement.`,
      details: { txHash: r?.txHash },
      timestamp: new Date().toISOString(),
    };

    await dispatchAlert(confirmationAlert).catch(() => {});
    return r;
  } catch (err) {
    console.error(`[NS Client ERROR] failed to submit reward claim: ${err instanceof Error ? err.message : String(err)}`);
    const failureAlert: OperatorAlert = {
      source: 'VP-Node:NS-Client',
      level: 'CRITICAL',
      title: 'Reward Claim Submission Failed',
      description: `Failed to submit reward claim to NS-Node.`,
      details: { error: err instanceof Error ? err.message : String(err) },
      timestamp: new Date().toISOString(),
    };

    await dispatchAlert(failureAlert).catch(() => {});
    throw err;
  }
}

/**
 * Helper: POST data with retries and timeout. If an environment variable
 * VP_NODE_TEST_MOCK_NS_CLIENT=true is present we simulate a successful response
 * to keep unit tests deterministic and offline-friendly.
 */
async function postWithRetry(url: string, body: unknown, opts: { timeoutMs?: number; retries?: number } = {}): Promise<any> {
  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const retries = Math.max(0, (opts.retries ?? DEFAULT_RETRIES) | 0);

  // Allow tests to run completely offline (deterministic mock path)
  if (process.env.VP_NODE_TEST_MOCK_NS_CLIENT === 'true') {
    await new Promise((r) => setTimeout(r, 20));
    return { status: 202, message: 'mock queued', txHash: `TX-MOCK-${crypto.randomBytes(8).toString('hex')}` };
  }

  let attempt = 0;
  while (true) {
    attempt += 1;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (NS_API_AUTH_TOKEN) headers['Authorization'] = `Bearer ${NS_API_AUTH_TOKEN}`;

      // Use global fetch (Node 20+ provides fetch)
      const res = await fetch(url, { method: 'POST', body: JSON.stringify(body), headers, signal: controller.signal });
      clearTimeout(timer);

      // handle 202/200 as success; parse JSON when available
      const txt = await res.text();
      let json: any = null;
      try { json = txt ? JSON.parse(txt) : null; } catch { json = { raw: txt }; }

      if (res.ok || res.status === 202) {
        return json ?? { status: res.status, message: 'ok' };
      }

      const err = new Error(`unexpected status ${res.status} from ${url}: ${txt}`);
      if (attempt > retries) throw err;
      // fallthrough to retry
      const backoff = BACKOFF_BASE_MS * Math.pow(2, attempt - 1);
      await new Promise((r) => setTimeout(r, backoff));
    } catch (err) {
      clearTimeout(timer);
      if (attempt > retries) throw err;
      // exponential backoff before retrying
      const backoff = BACKOFF_BASE_MS * Math.pow(2, attempt - 1);
      await new Promise((r) => setTimeout(r, backoff));
      continue;
    }
  }
}

export default { submitSignedEvidence };
