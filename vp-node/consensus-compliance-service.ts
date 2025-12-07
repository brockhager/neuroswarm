/**
 * vp-node/consensus-compliance-service.ts
 *
 * CN-07-C: Validator Consensus Compliance Tracking
 * Tracks missed production slots, consecutive misses, and reports events to ReputationScoringService
 */

import ReputationScoringService from './reputation-scoring-service';

export interface MissRecord {
  validatorId: string;
  height: number;
  timestamp: number;
  reason?: string;
}

export interface ValidatorMissStats {
  validatorId: string;
  consecutiveMisses: number;
  totalMisses: number;
  lastMissAt?: number;
}

export class ConsensusComplianceService {
  private missedByValidator: Map<string, Set<number>> = new Map();
  private stats: Map<string, ValidatorMissStats> = new Map();
  private reputation: ReputationScoringService;

  /**
   * config: threshold for consecutive misses that will trigger a 'serious' alert
   */
  constructor(reputation?: ReputationScoringService, private config = { consecutiveThreshold: 3 }) {
    this.reputation = reputation ?? new ReputationScoringService();
  }

  private now() { return Date.now(); }

  /**
   * Record a missed slot for a validator at a particular block height.
   * Multiple misses for same height are ignored to prevent double-counting.
   */
  public async recordMissedSlot(validatorId: string, height: number, reason?: string, eraId = 0): Promise<MissRecord> {
    const seen = this.missedByValidator.get(validatorId) ?? new Set<number>();
    if (seen.has(height)) {
      return { validatorId, height, timestamp: this.now(), reason: 'duplicate' };
    }

    seen.add(height);
    this.missedByValidator.set(validatorId, seen);

    const s = this.stats.get(validatorId) ?? { validatorId, consecutiveMisses: 0, totalMisses: 0 };
    s.consecutiveMisses += 1;
    s.totalMisses += 1;
    s.lastMissAt = this.now();
    this.stats.set(validatorId, s);

    // apply penalty to reputation
    this.reputation.applyMissPenalty(validatorId, 0.15);

    // persist event if DB is available
    try {
      const dbModule = await import('./compliance-db-service.js').catch(() => null);
      if (dbModule && dbModule.recordComplianceEvent) {
        await dbModule.recordComplianceEvent({ validatorId, eventType: 'MISSED_SLOT', blockHeight: height, eraId, timestamp: new Date().toISOString(), consecutiveCount: s.consecutiveMisses });
      }
    } catch (e) {
      // best-effort persistence; ignore DB errors here (they should be logged by the db service)
    }

    // if consecutive threshold reached, return an explicit marker for higher-level actions
    if (s.consecutiveMisses >= this.config.consecutiveThreshold) {
      // This place is where slashing or alerting hooks would be called by operator logic
      // We leave that as an integration point.
    }

    return { validatorId, height, timestamp: this.now(), reason };
  }

  /** Record a successful production slot for validator; resets consecutive misses */
  public async recordProducedSlot(validatorId: string, height: number): Promise<{ validatorId: string; height: number; timestamp: number }> {
    const s = this.stats.get(validatorId) ?? { validatorId, consecutiveMisses: 0, totalMisses: 0 };
    s.consecutiveMisses = 0; // reset on success
    this.stats.set(validatorId, s);

    // small reputation boost for producing successfully
    this.reputation.recordJobResult(validatorId, true);
    // write produced slot record into DB if available
    try {
      const dbModule = await import('./compliance-db-service.js').catch(() => null);
      if (dbModule && dbModule.recordComplianceEvent) {
        await dbModule.recordComplianceEvent({ validatorId, eventType: 'PRODUCED_SLOT', blockHeight: height, eraId: 0, timestamp: new Date().toISOString(), consecutiveCount: 0 });
      }
    } catch (e) {
      // ignore persistence failures
    }

    return { validatorId, height, timestamp: this.now() };
  }

  public getStats(validatorId: string): ValidatorMissStats | null {
    return this.stats.get(validatorId) ?? null;
  }

  public listAllStats(): ValidatorMissStats[] {
    return Array.from(this.stats.values());
  }

  public getMissRecords(validatorId: string): number[] {
    const s = this.missedByValidator.get(validatorId);
    return s ? Array.from(s.values()) : [];
  }
}

export default ConsensusComplianceService;
