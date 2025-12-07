import { logger } from '../utils/logger';

export interface Validator {
    id: string;
    endpoint: string;
    wallet_address: string;
    stake: number;          // NST staked
    reputation: number;     // 0-100 score
    latency_ms: number;     // Average response time
    capacity_used: number;  // Current concurrent requests
    max_capacity: number;   // Max concurrent requests
    last_active: Date;
}

export class ValidatorSelectionService {
    // Default weights (can be overridden by env vars)
    private get weights() {
        return {
            stake: Number(process.env.VALIDATOR_WEIGHT_STAKE || 0.4),
            reputation: Number(process.env.VALIDATOR_WEIGHT_REPUTATION || 0.3),
            capacity: Number(process.env.VALIDATOR_WEIGHT_CAPACITY || 0.2),
            speed: Number(process.env.VALIDATOR_WEIGHT_SPEED || 0.1)
        };
    }

    // Normalization constants
    private static readonly MAX_STAKE_CAP = 100000;
    private static readonly MAX_LATENCY_MS = 2000;

    /**
     * Selects a validator using probabilistic weighted selection from the top N candidates.
     * Use "soft" selection to encourage decentralization.
     */
    public selectBestValidator(validators: Validator[], topN: number = 3): Validator | null {
        if (!validators || validators.length === 0) {
            logger.warn('[ValidatorSelection] No validators provided to selection service.');
            return null;
        }

        // 1. Filter unhealthy/full
        const eligibleValidators = validators.filter(v =>
            v.capacity_used < v.max_capacity &&
            (Date.now() - new Date(v.last_active).getTime()) < 120000 // Active in last 2 mins (allowing for slight clock skew)
        );

        if (eligibleValidators.length === 0) {
            logger.warn('[ValidatorSelection] No eligible validators found (all likely full or offline).', {
                totalValidators: validators.length
            });
            return null;
        }

        // 2. Score All
        const scoredValidators = eligibleValidators.map(v => ({
            validator: v,
            score: this.calculateScore(v)
        }));

        // 3. Sort Descending
        scoredValidators.sort((a, b) => b.score - a.score);

        // 4. Log Top Candidates
        logger.debug('[ValidatorSelection] Top Candidates', {
            candidates: scoredValidators.slice(0, 5).map(c => ({ id: c.validator.id, score: c.score.toFixed(3) }))
        });

        // 5. Probabilistic Selection (Weighted Random among Top N)
        // If we have fewer than topN, use all of them.
        const pool = scoredValidators.slice(0, topN);
        const selected = this.weightedRandomSelect(pool);

        if (selected) {
            logger.info(`[ValidatorSelection] Selected validator ${selected.validator.id}`, {
                id: selected.validator.id,
                score: selected.score,
                poolSize: pool.length
            });
            return selected.validator;
        }

        // Fallback (should normally not happen if pool > 0)
        return scoredValidators[0].validator;
    }

    private weightedRandomSelect(pool: { validator: Validator, score: number }[]): { validator: Validator, score: number } {
        // Simple weighted random:
        // Sum of scores
        const totalScore = pool.reduce((sum, item) => sum + item.score, 0);
        if (totalScore <= 0) {
            // If all scores are 0, pick random
            return pool[Math.floor(Math.random() * pool.length)];
        }

        let random = Math.random() * totalScore;
        for (const item of pool) {
            random -= item.score;
            if (random <= 0) {
                return item;
            }
        }
        return pool[pool.length - 1]; // precision fallback
    }

    /*
     * Calculates the Priority Score (0-1)
     */
    public calculateScore(v: Validator): number {
        const w = this.weights;

        // 1. Stake Score (0-1)
        const stakeScore = Math.min(v.stake, ValidatorSelectionService.MAX_STAKE_CAP) / ValidatorSelectionService.MAX_STAKE_CAP;

        // 2. Reputation Score (0-1)
        const reputationScore = Math.min(Math.max(v.reputation, 0), 100) / 100;

        // 3. Capacity Score (0-1)
        const availableCapacity = Math.max(0, v.max_capacity - v.capacity_used);
        const capacityScore = v.max_capacity > 0 ? availableCapacity / v.max_capacity : 0;

        // 4. Speed Score (0-1)
        const latency = Math.max(1, v.latency_ms);
        const speedScore = Math.max(0, 1 - (latency / ValidatorSelectionService.MAX_LATENCY_MS));

        const totalScore =
            (stakeScore * w.stake) +
            (reputationScore * w.reputation) +
            (capacityScore * w.capacity) +
            (speedScore * w.speed);

        return totalScore;
    }
}
