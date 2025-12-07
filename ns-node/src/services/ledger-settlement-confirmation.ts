import fetch from 'node-fetch';
import IdempotencyStore from '../../../shared/idempotency-store.ts';
import { VaultClient } from '../../../shared/key-management.ts';
import { getCanonicalPayloadHash, signPayload, bufferToHex } from '../../../shared/crypto-utils.ts';

// Use shared idempotency service to generate a unique key for confirmations
const idempotency = new IdempotencyStore();

/**
 * Send a settlement confirmation to a VP node for a given claim
 * @param vpCallbackUrl Full URL of the VP node confirmation endpoint
 * @param claimId The claim id previously submitted by VP
 * @param txHash The ledger transaction hash that settled the claim
 */
export async function sendSettlementConfirmationToVP(vpCallbackUrl: string, claimId: string, txHash: string): Promise<void> {
  if (!vpCallbackUrl) throw new Error('vpCallbackUrl required');
  // include a timestamp and sender identity and sign the payload (Phase 5)
  const nsIdentity = process.env.NS_NODE_ID || 'NS-PRIMARY';
  const payload = { claimId, txHash, timestamp: new Date().toISOString(), sender: nsIdentity };
  try {
    // Generate a unique idempotency key for this confirmation
    // sign payload using NS private key
    const vault = new VaultClient(process.env.VAULT_TOKEN || 'MOCK_VAULT_TOKEN');
    const privBuf = await vault.getPrivateKey(nsIdentity);
    const payloadHash = getCanonicalPayloadHash(payload);
    const sigBuf = await signPayload(privBuf.toString('hex'), payloadHash);
    const signature = bufferToHex(sigBuf);

    const idempotencyKey = IdempotencyStore.generateKey();
    const headers: Record<string, string> = { 'Content-Type': 'application/json', 'Idempotency-Key': idempotencyKey };
    const signedPayload = { ...payload, signature };
    const res = await fetch(vpCallbackUrl, { method: 'POST', headers, body: JSON.stringify(signedPayload) });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`vp responded ${res.status}: ${text}`);
    }
    console.log(`[Settlement Confirm] Notified VP ${vpCallbackUrl} claim=${claimId} tx=${txHash} idempotency=${idempotencyKey}`);
  } catch (err) {
    console.error(`[Settlement Confirm ERROR] failed to notify VP ${vpCallbackUrl}: ${err instanceof Error ? err.message : String(err)}`);
    throw err;
  }
}

export default { sendSettlementConfirmationToVP };
