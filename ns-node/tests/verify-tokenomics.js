import { calculateBlockReward } from '../src/services/chain.js';

const COIN = 100000000n;
const INITIAL_REWARD = 50000000n; // 0.5 NST
const HALVING_INTERVAL = 14700000;

function assert(condition, message) {
    if (!condition) {
        console.error(`❌ FAILED: ${message}`);
        process.exit(1);
    } else {
        console.log(`✅ PASSED: ${message}`);
    }
}

console.log('Verifying Tokenomics Reward Calculation...');

// Test 1: Genesis
const rewardGenesis = calculateBlockReward(0);
assert(rewardGenesis === INITIAL_REWARD, `Genesis reward should be 0.5 NST (got ${rewardGenesis})`);

// Test 2: End of Cycle 1
const rewardEndCycle1 = calculateBlockReward(HALVING_INTERVAL - 1);
assert(rewardEndCycle1 === INITIAL_REWARD, `End of Cycle 1 reward should be 0.5 NST`);

// Test 3: Start of Cycle 2
const rewardStartCycle2 = calculateBlockReward(HALVING_INTERVAL);
assert(rewardStartCycle2 === INITIAL_REWARD / 2n, `Start of Cycle 2 reward should be 0.25 NST`);

// Test 4: Start of Cycle 3
const rewardStartCycle3 = calculateBlockReward(HALVING_INTERVAL * 2);
assert(rewardStartCycle3 === INITIAL_REWARD / 4n, `Start of Cycle 3 reward should be 0.125 NST`);

// Test 5: First 6 cycles
for (let i = 0; i < 6; i++) {
    const reward = calculateBlockReward(HALVING_INTERVAL * i);
    const expected = INITIAL_REWARD >> BigInt(i);
    assert(reward === expected, `Cycle ${i + 1} reward should be correct`);
    console.log(`   Cycle ${i + 1}: ${Number(reward) / 1e8} NST`);
}

// Test 6: Cap
const rewardCap = calculateBlockReward(HALVING_INTERVAL * 65);
assert(rewardCap === 0n, `Reward after 64 cycles should be 0`);

console.log('All tokenomics tests passed!');
