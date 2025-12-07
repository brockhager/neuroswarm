import crypto from 'crypto';
// Note: use dynamic imports of compliance-db-service inside functions to allow easier testing/mocking

// Configurable threshold for automatic slashing evidence (consecutive misses)
export const SLASHING_THRESHOLD = 5; // default (can be overridden by operator config)

// Mock/private-key placeholder — in production this should be stored in secure key manager
const VP_NODE_PRIVATE_KEY = process.env.VP_NODE_PRIVATE_KEY || 'MOCK_ED25519_PRIVATE_KEY_FROM_CONFIG';

export interface SlashingEvidence {
  evidenceId: string;
  validatorId: string;
  eventType: 'MISSED_SLOT_THRESHOLD' | 'FRAUDULENT_OUTPUT' | 'DOUBLE_SIGN';
  triggerValue: number;
  blockHeight: number;
  eraId: number;
  timestamp: string;
  supportingRecords: { height: number; time: string }[];
}

export interface SignedSlashingEvidence {
  evidence: SlashingEvidence;
  validatorSignature: string; // signature by the reporting VP-Node
}

export function generateSlashingEvidence(
  validatorId: string,
  triggerValue: number,
  blockHeight: number,
  eraId: number,
  supportingRecords: { height: number; time: string }[],
): SlashingEvidence {
  return {
    evidenceId: `EVID-${crypto.randomBytes(8).toString('hex')}`,
    validatorId,
    eventType: 'MISSED_SLOT_THRESHOLD',
    triggerValue,
    blockHeight,
    eraId,
    timestamp: new Date().toISOString(),
    supportingRecords,
  };
}

export function signEvidence(evidence: SlashingEvidence): string {
  // The real implementation uses ED25519 signing. For now we return a deterministic mock signature for tests.
  const payload = JSON.stringify(evidence);
  const hash = crypto.createHash('sha256').update(payload).digest('hex');
  return `SIG-VP-${hash.slice(0, 12)}-BY-${VP_NODE_PRIVATE_KEY.slice(0, 8)}`;
}

async function submitEvidenceToNSNode(signedEvidence: SignedSlashingEvidence): Promise<void> {
  // In production this would POST to NS /v1/slashing/submit or an on-chain gateway.
  // Here we simulate a network call with a short delay and then write an audit event to the compliance DB.
  await new Promise(resolve => setTimeout(resolve, 50));

  // write an audit record in the compliance DB (best-effort)
  try {
    const db = await import('./compliance-db-service.js').catch(() => null);
    if (db && db.recordComplianceEvent) {
      await db.recordComplianceEvent({
      validatorId: signedEvidence.evidence.validatorId,
      eventType: 'REVERTED_BLOCK', // indicates a remediative action was taken / submitted
      blockHeight: signedEvidence.evidence.blockHeight,
      eraId: signedEvidence.evidence.eraId,
      timestamp: new Date().toISOString(),
      consecutiveCount: signedEvidence.evidence.triggerValue,
      });
    }
  } catch (e) {
    // swallow DB write errors at this layer
  }

  // Log submission (simulated)
  console.log(`[SLASHING] Evidence ${signedEvidence.evidence.evidenceId} submitted for ${signedEvidence.evidence.validatorId}`);
}

/**
 * Primary check-and-emit function.
 * If consecutive misses reach threshold, build evidence, sign it, and submit to NS.
 */
export async function checkAndEmitSlashingEvidence(validatorId: string, currentHeight: number, currentEra: number): Promise<boolean> {
  // request DB at runtime so tests can override module functions when needed
  let consecutiveMisses = 0;
  try {
    const db = await import('./compliance-db-service.js').catch(() => null);
    if (db && db.getHighestConsecutiveMisses) {
      consecutiveMisses = await db.getHighestConsecutiveMisses(validatorId);
    }
  } catch (e) {
    consecutiveMisses = 0;
  }
  if (consecutiveMisses >= SLASHING_THRESHOLD) {
    console.warn(`[SLASHING] Threshold breached for ${validatorId}: ${consecutiveMisses} >= ${SLASHING_THRESHOLD}`);

    // For supportingRecords we prefer to include the last N heights — fetch best-effort from DB
    // The compliance DB currently doesn't provide the detailed rows via API; we'll synthesize heights for an initial signal
    const supportingRecords = Array.from({ length: consecutiveMisses }, (_, i) => ({ height: currentHeight - consecutiveMisses + i + 1, time: new Date().toISOString() }));

    const evidence = generateSlashingEvidence(validatorId, consecutiveMisses, currentHeight, currentEra, supportingRecords);
    const signature = signEvidence(evidence);
    const signed: SignedSlashingEvidence = { evidence, validatorSignature: signature };

    await submitEvidenceToNSNode(signed);
    return true;
  }

  console.log(`[SLASHING] ${validatorId} below threshold: ${consecutiveMisses} < ${SLASHING_THRESHOLD}`);
  return false;
}

// Note: no top-level execution block in ESM modules (tests import these functions directly)

export default { checkAndEmitSlashingEvidence, SLASHING_THRESHOLD, generateSlashingEvidence, signEvidence };
