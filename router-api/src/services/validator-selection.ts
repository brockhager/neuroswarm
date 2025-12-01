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
    // Weights for the scoring algorithm (Total: 1.0)
    private static readonly WEIGHT_STAKE = 0.4;
    private static readonly WEIGHT_REPUTATION = 0.3;
    private static readonly WEIGHT_CAPACITY = 0.2;
    private static readonly WEIGHT_SPEED = 0.1;

    // Normalization constants (to scale raw values to 0-1 range)
    private static readonly MAX_STAKE_CAP = 100000; // Cap stake score at 100k NST
    private static readonly MAX_LATENCY_MS = 2000;  // Latency above 2s gets 0 score

    /**
     * Selects the best validator for a job based on the 4-factor priority score.
     * @param validators List of active validators
     * @returns The selected validator or null if none available
     */
    public selectBestValidator(validators: Validator[]): Validator | null {
        if (!validators || validators.length === 0) {
            return null;
        }

        // Filter out unhealthy or full validators first
        const eligibleValidators = validators.filter(v =>
            v.capacity_used < v.max_capacity &&
            (Date.now() - v.last_active.getTime()) < 60000 // Active in last 60s
        );

        if (eligibleValidators.length === 0) {
            return null;
        }

        // Calculate scores for all eligible validators
        const scoredValidators = eligibleValidators.map(validator => ({
            validator,
            score: this.calculateScore(validator)
        }));

        // Sort by score descending
        scoredValidators.sort((a, b) => b.score - a.score);

        // Return the top scoring validator
        // In a real production system, we might use weighted random selection among top N 
        // to prevent "winner takes all", but for this sprint, we pick the absolute best.
        return scoredValidators[0].validator;
    }

    /**
     * Calculates the Priority Score for a single validator.
     * Formula: (Stake * 0.4) + (Reputation * 0.3) + (Capacity * 0.2) + (Speed * 0.1)
     */
    private calculateScore(v: Validator): number {
        // 1. Stake Score (0-1): Linear up to MAX_STAKE_CAP
        const stakeScore = Math.min(v.stake, ValidatorSelectionService.MAX_STAKE_CAP) / ValidatorSelectionService.MAX_STAKE_CAP;

        // 2. Reputation Score (0-1): Direct percentage
        const reputationScore = Math.min(Math.max(v.reputation, 0), 100) / 100;

        // 3. Capacity Score (0-1): Higher available capacity is better
        // Formula: (Max - Used) / Max
        const availableCapacity = Math.max(0, v.max_capacity - v.capacity_used);
        const capacityScore = v.max_capacity > 0 ? availableCapacity / v.max_capacity : 0;

        // 4. Speed Score (0-1): Lower latency is better
        // Formula: 1 - (Latency / Max_Latency), clamped at 0
        const latency = Math.max(1, v.latency_ms); // Avoid div by zero
        const speedScore = Math.max(0, 1 - (latency / ValidatorSelectionService.MAX_LATENCY_MS));

        // Weighted Sum
        const totalScore =
            (stakeScore * ValidatorSelectionService.WEIGHT_STAKE) +
            (reputationScore * ValidatorSelectionService.WEIGHT_REPUTATION) +
            (capacityScore * ValidatorSelectionService.WEIGHT_CAPACITY) +
            (speedScore * ValidatorSelectionService.WEIGHT_SPEED);

        return totalScore;
    }
}
