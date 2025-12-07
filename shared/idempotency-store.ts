import crypto from 'crypto';

// --- AUDITABLE RECORD STRUCTURE ---
export interface IdempotencyRecord {
  idempotencyKey: string;
  claimId: string;
  txHash: string;
  recordedAt: string;
  processorNode: 'VP-Node' | 'NS-Node';
}

// --- MOCK DATABASE (Simulating a durable/distributed Redis or Postgres table) ---
const IDEMPOTENCY_DB: Record<string, IdempotencyRecord> = {};

/**
 * Manages idempotency keys across critical transaction flows (e.g., Reward Claim Confirmation).
 * NOTE: This is a synchronous, in-memory mock. A production version would use an external
 * distributed database with concurrent locking mechanisms.
 */
export class IdempotencyStore {

  /**
   * Generates a universally unique idempotency key using a cryptographically secure random string.
   * This key MUST be included in the header of the confirming request.
   * @returns A new, unique idempotency key.
   */
  public static generateKey(): string {
    return crypto.randomBytes(16).toString('hex');
  }

  /**
   * Checks if a given key has already been processed.
   * @param key The idempotency key received from the request header.
   * @returns The existing record if found, otherwise null.
   */
  public async isKeyProcessed(key: string): Promise<IdempotencyRecord | null> {
    console.log(`[IdempotencyStore] Checking key: ${key}`);
    // Simulate database lookup latency
    await new Promise(resolve => setTimeout(resolve, 5));
    
    return IDEMPOTENCY_DB[key] || null;
  }

  /**
   * Records a new idempotency key along with its associated audit metadata.
   * @param record The full record containing the key, claim ID, and processing context.
   */
  public async recordKey(record: IdempotencyRecord): Promise<void> {
    if (await this.isKeyProcessed(record.idempotencyKey)) {
      // Should be caught by caller, but guard against race condition here
      console.warn(`[IdempotencyStore] CRITICAL: Attempted to re-record existing key: ${record.idempotencyKey}`);
      throw new Error('Idempotency key already exists.');
    }

    // Simulate database write latency
    await new Promise(resolve => setTimeout(resolve, 10));

    IDEMPOTENCY_DB[record.idempotencyKey] = record;
    console.log(`[IdempotencyStore] Recorded new key: ${record.idempotencyKey} (Claim: ${record.claimId})`);
  }

  // Utility for debugging/testing
  public getAuditLog(): IdempotencyRecord[] {
    return Object.values(IDEMPOTENCY_DB);
  }

  // --- Backwards compatible claim-id replay protection (small in-memory set) ---
  private processedClaims = new Set<string>();

  /**
   * Check whether a claimId has already been processed (for claim replay protection)
   */
  public async isProcessed(key: string): Promise<boolean> {
    return this.processedClaims.has(key);
  }

  /**
   * Atomically mark a claimId as processed. Returns true if it was newly marked, false if it already existed.
   */
  public async tryMarkProcessed(key: string): Promise<boolean> {
    if (this.processedClaims.has(key)) return false;
    this.processedClaims.add(key);
    return true;
  }
}

export default IdempotencyStore;
