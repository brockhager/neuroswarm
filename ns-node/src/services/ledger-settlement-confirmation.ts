import fetch from 'node-fetch';

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
    const res = await fetch(vpCallbackUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`vp responded ${res.status}: ${text}`);
    }
    console.log(`[Settlement Confirm] Notified VP ${vpCallbackUrl} claim=${claimId} tx=${txHash}`);
  } catch (err) {
    console.error(`[Settlement Confirm ERROR] failed to notify VP ${vpCallbackUrl}: ${err instanceof Error ? err.message : String(err)}`);
    throw err;
  }
}

export default { sendSettlementConfirmationToVP };
