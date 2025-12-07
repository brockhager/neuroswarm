/**
 * vp-node/reputation-scoring-service.ts
 *
 * CN-07-B: Validator Performance & Reputation Scoring
 *
 * Lightweight in-memory reputation scoring for VP validators.
 * Designed to be simple and testable: scores range 0.0..1.0.
 * Uses an exponential-moving-average (EMA) style update to avoid volatility.
 */

export interface ReputationRecord {
  id: string;
  score: number; // 0..1
  successCount: number;
  failureCount: number;
  missedSlots: number;
  firstSeen: number; // timestamp
  lastUpdated: number; // timestamp
}

export interface ReputationOptions {
  initialScore?: number; // starting baseline
  emaAlpha?: number; // smoothing factor for updates (0..1)
}

export class ReputationScoringService {
  private store: Map<string, ReputationRecord> = new Map();
  private opts: Required<ReputationOptions>;

  constructor(opts?: ReputationOptions) {
    this.opts = {
      initialScore: opts?.initialScore ?? 0.7,
      emaAlpha: opts?.emaAlpha ?? 0.25,
    };
  }

  private now() { return Date.now(); }

  private ensure(id: string): ReputationRecord {
    let r = this.store.get(id);
    if (!r) {
      r = { id, score: this.opts.initialScore, successCount: 0, failureCount: 0, missedSlots: 0, firstSeen: this.now(), lastUpdated: this.now() };
      this.store.set(id, r);
    }
    return r;
  }

  /** Return current score 0..1 for validator */
  public getScore(id: string): number {
    const r = this.store.get(id);
    return r ? r.score : this.opts.initialScore;
  }

  /** Record a job processing result: success = true/false */
  public recordJobResult(id: string, success: boolean): ReputationRecord {
    const r = this.ensure(id);

    if (success) {
      r.successCount += 1;
      // eventScore for success: 1.0 ; failure eventScore = 0.0.
      const eventScore = 1.0;
      r.score = this.emaUpdate(r.score, eventScore);
    } else {
      r.failureCount += 1;
      const eventScore = 0.0;
      r.score = this.emaUpdate(r.score, eventScore);
    }

    r.lastUpdated = this.now();
    return r;
  }

  /** Change a validator reputation due to a missed consensus slot */
  public applyMissPenalty(id: string, penaltyFraction = 0.15): ReputationRecord {
    const r = this.ensure(id);
    r.missedSlots += 1;
    // reduce score multiplicatively to avoid large swings
    r.score = Math.max(0, r.score * (1 - penaltyFraction));
    r.lastUpdated = this.now();
    return r;
  }

  /** Apply a small age-based bonus for long-standing validators */
  public applyAgeBonus(id: string, bonus = 0.02): ReputationRecord {
    const r = this.ensure(id);
    const ageMs = this.now() - r.firstSeen;
    // bonus ramps slowly; simple approach: if age > 30 days give small bonus
    const thirtyDays = 1000 * 60 * 60 * 24 * 30;
    if (ageMs >= thirtyDays) {
      r.score = Math.min(1, r.score + bonus);
      r.lastUpdated = this.now();
    }
    return r;
  }

  /** Helper: EMA update */
  private emaUpdate(prev: number, eventScore: number) {
    const a = this.opts.emaAlpha;
    const next = prev * (1 - a) + eventScore * a;
    return Math.max(0, Math.min(1, next));
  }

  /** Reset / seed a validator's score (useful in tests) */
  public setScore(id: string, value: number) {
    const r = this.ensure(id);
    r.score = Math.max(0, Math.min(1, value));
    r.lastUpdated = this.now();
    return r;
  }

  /** For diagnostics / listing all records */
  public list(): ReputationRecord[] { return Array.from(this.store.values()); }
}

export default ReputationScoringService;
