import fetch from 'node-fetch';
import IdempotencyStore from '../../../shared/idempotency-store.ts';

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
  const payload = { claimId, txHash };
  try {
    // Generate a unique idempotency key for this confirmation
    const idempotencyKey = IdempotencyStore.generateKey();

    const headers: Record<string, string> = { 'Content-Type': 'application/json', 'Idempotency-Key': idempotencyKey };
    const res = await fetch(vpCallbackUrl, { method: 'POST', headers, body: JSON.stringify(payload) });
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
