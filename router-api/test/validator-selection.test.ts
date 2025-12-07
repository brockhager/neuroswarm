import { ValidatorSelectionService, Validator } from '../src/services/validator-selection';

// Mock logger to avoid cluttering test output
jest.mock('../src/utils/logger', () => ({
    logger: {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        debug: jest.fn(),
    }
}));

describe('ValidatorSelectionService', () => {
    let service: ValidatorSelectionService;
    let mockValidators: Validator[];

    beforeEach(() => {
        service = new ValidatorSelectionService();
        mockValidators = [
            {
                id: 'v1_high_stake',
                endpoint: 'http://v1',
                wallet_address: 'w1',
                stake: 80000,
                reputation: 95,
                latency_ms: 100,
                capacity_used: 1,
                max_capacity: 10,
                last_active: new Date()
            },
            {
                id: 'v2_mid',
                endpoint: 'http://v2',
                wallet_address: 'w2',
                stake: 40000,
                reputation: 90,
                latency_ms: 200,
                capacity_used: 2,
                max_capacity: 10,
                last_active: new Date()
            },
            {
                id: 'v3_low',
                endpoint: 'http://v3',
                wallet_address: 'w3',
                stake: 10000,
                reputation: 80,
                latency_ms: 300,
                capacity_used: 0,
                max_capacity: 10,
                last_active: new Date()
            },
            {
                id: 'v4_full',
                endpoint: 'http://v4',
                wallet_address: 'w4',
                stake: 90000,
                reputation: 99,
                latency_ms: 50,
                capacity_used: 10,
                max_capacity: 10, // FULL
                last_active: new Date()
            },
            {
                id: 'v5_offline',
                endpoint: 'http://v5',
                wallet_address: 'w5',
                stake: 90000,
                reputation: 99,
                latency_ms: 50,
                capacity_used: 0,
                max_capacity: 10,
                last_active: new Date(Date.now() - 300000) // 5 mins ago
            }
        ];
    });

    test('should calculate scores correctly (higher stake/rep = higher score)', () => {
        const score1 = service.calculateScore(mockValidators[0]); // High stake/rep
        const score3 = service.calculateScore(mockValidators[2]); // Low stake/rep
        expect(score1).toBeGreaterThan(score3);
    });

    test('should filter out full and offline validators', () => {
        // v4 is full, v5 is offline
        // Valid candidates: v1, v2, v3
        // If we request topN=3, we should only ever get v1, v2, or v3.

        for (let i = 0; i < 50; i++) {
            const selected = service.selectBestValidator(mockValidators, 3);
            expect(selected).toBeDefined();
            expect(['v1_high_stake', 'v2_mid', 'v3_low']).toContain(selected!.id);
            expect(selected!.id).not.toBe('v4_full');
            expect(selected!.id).not.toBe('v5_offline');
        }
    });

    test('should respect Probabilistic Selection (high score wins MORE often, but not ALWAYS)', () => {
        // Run selection 1000 times
        const counts: Record<string, number> = { v1_high_stake: 0, v2_mid: 0, v3_low: 0 };
        for (let i = 0; i < 1000; i++) {
            const selected = service.selectBestValidator(mockValidators, 3);
            if (selected) counts[selected.id]++;
        }

        // v1 should win most often, but v2 and v3 should likely win "some" times
        // due to weighted random (unless their scores are 0, which they aren't).
        console.log('Selection Distribution (1000 runs):', counts);

        expect(counts.v1_high_stake).toBeGreaterThan(counts.v2_mid);
        expect(counts.v2_mid).toBeGreaterThan(0); // v2 should get picked sometimes
        // v3 might be picked or might be 0 if score gap is huge, but it should be non-zero ideally
    });

    test('calculateScore should return normalized 0-1 range', () => {
        const v = mockValidators[0];
        const score = service.calculateScore(v);
        expect(score).toBeGreaterThanOrEqual(0);
        expect(score).toBeLessThanOrEqual(1);
    });
});
