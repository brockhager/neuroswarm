import crypto from 'crypto';

// --- AUDITABLE RECORD STRUCTURE ---
export interface IdempotencyRecord {
  idempotencyKey: string;
  claimId: string;
  txHash: string;
  recordedAt: string;
  processorNode: 'VP-Node' | 'NS-Node';
}

// --- MOCK (in-memory) DATABASE (used as fallback / dev) ---
const IDEMPOTENCY_DB: Record<string, IdempotencyRecord> = {};

/**
 * Manages idempotency keys across critical transaction flows (e.g., Reward Claim Confirmation).
 * NOTE: This is a synchronous, in-memory mock. A production version would use an external
 * distributed database with concurrent locking mechanisms.
 */
export class IdempotencyStore {

  // Firestore / Firebase admin instance (initialized lazily)
  private useFirestore = false;
  private db: any = null;
  private keysCollection = 'idempotency_keys';
  private claimsCollection = 'processed_claims';

  private async ensureInitialized(): Promise<void> {
    if (this.db || this.useFirestore) return;

    // Try to initialize firebase-admin dynamically. If not available, stay in-memory.
    try {
      // dynamic import to avoid hard dependency in CI if not required
      const admin = await import('firebase-admin');

      // If already initialized, reuse app
      if (!admin.apps || admin.apps.length === 0) {
        // If service account is provided via env (JSON string), use it
        const saJson = process.env.FIREBASE_SA || process.env.FIREBASE_SERVICE_ACCOUNT_JSON || null;
        const appConfig: any = {};
        if (saJson) {
          try {
            const sa = JSON.parse(saJson);
            appConfig.credential = admin.credential.cert(sa);
          } catch (e) {
            console.warn('[IdempotencyStore] Failed to parse FIREBASE_SA - falling back to default credentials');
          }
        }

        // Allow emulator via FIRESTORE_EMULATOR_HOST
        if (process.env.FIRESTORE_EMULATOR_HOST) {
          // set the project ID from env if present
          appConfig.projectId = process.env.FIREBASE_PROJECT_ID || process.env.GCLOUD_PROJECT || appConfig.projectId;
        }

        try {
          admin.initializeApp(appConfig);
        } catch (e) {
          // ignore double-init
        }
      }

      this.db = admin.firestore();
      this.useFirestore = true;
      console.log('[IdempotencyStore] Firestore initialized for idempotency storage');
    } catch (e) {
      // Firestore not available in environment — continue using in-memory fallback
      this.useFirestore = false;
      this.db = null;
      console.info('[IdempotencyStore] firestore not available, using in-memory fallback');
    }
  }

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
    await this.ensureInitialized();
    console.log(`[IdempotencyStore] Checking key: ${key}`);
    if (this.useFirestore && this.db) {
      try {
        const ref = this.db.collection(this.keysCollection).doc(key);
        const snap = await ref.get();
        if (!snap.exists) return null;
        return snap.data() as IdempotencyRecord;
      } catch (e) {
        console.warn('[IdempotencyStore] firestore read error', e instanceof Error ? e.message : String(e));
        return IDEMPOTENCY_DB[key] || null;
      }
    }

    // fallback: return in-memory
    return IDEMPOTENCY_DB[key] || null;
  }

  /**
   * Records a new idempotency key along with its associated audit metadata.
   * @param record The full record containing the key, claim ID, and processing context.
   */
  public async recordKey(record: IdempotencyRecord): Promise<void> {
    await this.ensureInitialized();

    // If using Firestore, attempt to create the document atomically (create() fails if exists)
    if (this.useFirestore && this.db) {
      try {
        const ref = this.db.collection(this.keysCollection).doc(record.idempotencyKey);
        // create throws if doc exists
        await ref.create(record);
        console.log(`[IdempotencyStore] Recorded new key (firestore): ${record.idempotencyKey} (Claim: ${record.claimId})`);
        return;
      } catch (e) {
        // If document already exists, throw a descriptive error
        const msg = e && typeof e.message === 'string' ? e.message : String(e);
        if (msg && msg.includes('already exists')) {
          console.warn(`[IdempotencyStore] CRITICAL: Attempted to re-record existing key: ${record.idempotencyKey}`);
          throw new Error('Idempotency key already exists.');
        }
        console.warn('[IdempotencyStore] firestore write error', e instanceof Error ? e.message : String(e));
        // Fall through to in-memory fallback
      }
    }

    // fallback to in-memory behavior
    if (await this.isKeyProcessed(record.idempotencyKey)) {
      console.warn(`[IdempotencyStore] CRITICAL: Attempted to re-record existing key: ${record.idempotencyKey}`);
      throw new Error('Idempotency key already exists.');
    }

    // write in-memory
    IDEMPOTENCY_DB[record.idempotencyKey] = record;
    console.log(`[IdempotencyStore] Recorded new key: ${record.idempotencyKey} (Claim: ${record.claimId})`);
  }

  // Utility for debugging/testing
  public getAuditLog(): IdempotencyRecord[] {
    // If Firestore present, query all keys; otherwise return in-memory snapshot
    // NOTE: This call is synchronous in the original impl; provide an async-friendly snapshot when using Firestore
    return Object.values(IDEMPOTENCY_DB);
  }

  // --- Backwards compatible claim-id replay protection (small in-memory set) ---
  private processedClaims = new Set<string>();

  /**
   * Check whether a claimId has already been processed (for claim replay protection)
   */
  public async isProcessed(key: string): Promise<boolean> {
    await this.ensureInitialized();
    if (this.useFirestore && this.db) {
      try {
        const ref = this.db.collection(this.claimsCollection).doc(key);
        const snap = await ref.get();
        return snap.exists;
      } catch (e) {
        console.warn('[IdempotencyStore] firestore read processed claim error', e instanceof Error ? e.message : String(e));
        return this.processedClaims.has(key);
      }
    }

    return this.processedClaims.has(key);
  }

  /**
   * Atomically mark a claimId as processed. Returns true if it was newly marked, false if it already existed.
   */
  public async tryMarkProcessed(key: string): Promise<boolean> {
    await this.ensureInitialized();
    if (this.useFirestore && this.db) {
      try {
        const ref = this.db.collection(this.claimsCollection).doc(key);
        // create() will throw if doc already exists
        await ref.create({ processedAt: new Date().toISOString() });
        return true;
      } catch (e) {
        const msg = e && typeof e.message === 'string' ? e.message : String(e);
        if (msg && msg.includes('already exists')) return false;
        console.warn('[IdempotencyStore] firestore write processed claim error', msg);
        // fall back to in-memory
      }
    }

    if (this.processedClaims.has(key)) return false;
    this.processedClaims.add(key);
    return true;
  }
}

export default IdempotencyStore;
