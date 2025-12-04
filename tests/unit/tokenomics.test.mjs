import { calculateBlockReward } from '../../ns-node/src/services/chain.js';
import { expect } from 'chai';

const COIN = 100000000n;
const INITIAL_REWARD = 50000000n; // 0.5 NST
const HALVING_INTERVAL = 14700000;

describe('Tokenomics: Reward Calculation', () => {
    it('should return 0.5 NST for Cycle 1 (Genesis)', () => {
        const reward = calculateBlockReward(0);
        expect(reward).to.equal(INITIAL_REWARD);
    });

    it('should return 0.5 NST for end of Cycle 1', () => {
        const reward = calculateBlockReward(HALVING_INTERVAL - 1);
        expect(reward).to.equal(INITIAL_REWARD);
    });

    it('should return 0.25 NST for start of Cycle 2', () => {
        const reward = calculateBlockReward(HALVING_INTERVAL);
        expect(reward).to.equal(INITIAL_REWARD / 2n);
    });

    it('should return 0.125 NST for start of Cycle 3', () => {
        const reward = calculateBlockReward(HALVING_INTERVAL * 2);
        expect(reward).to.equal(INITIAL_REWARD / 4n);
    });

    it('should return correct values for first 6 cycles', () => {
        for (let i = 0; i < 6; i++) {
            const reward = calculateBlockReward(HALVING_INTERVAL * i);
            const expected = INITIAL_REWARD >> BigInt(i);
            console.log(`Cycle ${i + 1}: ${Number(reward) / 1e8} NST`);
            expect(reward).to.equal(expected);
        }
    });

    it('should return 0 after 64 cycles (safety check)', () => {
        const reward = calculateBlockReward(HALVING_INTERVAL * 65);
        expect(reward).to.equal(0n);
    });
});
