/**
 * Integration Test: CN-07-A Producer Selection
 * Verifies that getProducer(height) deterministically selects validators
 * based on stake weight and returns consistent results for the same height.
 */

import { describe, test, before, after } from 'node:test';
import assert from 'node:assert';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Use isolated DB for this test
const TEST_DB_PATH = path.join(__dirname, '..', '..', 'data', `test-producer-selection-${Date.now()}.db`);
process.env.NS_NODE_DB_PATH = TEST_DB_PATH;

// Import modules AFTER setting env var
const { getProducer, applyBlock, syncValidatorStakeFromAccount } = await import('../../src/services/chain.js');
const { validators, accounts, state, persistAccount, persistValidator, persistChainState } = await import('../../src/services/state.js');
const { canonicalize, sha256Hex, txIdFor } = await import('../../src/utils/crypto.js');

describe('CN-07-A: Producer Selection (getProducer)', () => {
    before(() => {
        console.log('[Test] Using isolated DB:', TEST_DB_PATH);
        console.log('[Test] Initial state - validators:', validators.size, 'accounts:', accounts.size);
    });

    test('returns null when no eligible validators exist', () => {
        const producerId = getProducer(1);
        assert.strictEqual(producerId, null, 'Should return null when no validators meet minimum stake');
    });

    test('deterministic selection: same height always returns same producer', () => {
        // Setup: create 3 validators with equal stake (above minimum: 5,000 NST = 500,000,000,000 atomic)
        const val1 = 'producer-test-val1';
        const val2 = 'producer-test-val2';
        const val3 = 'producer-test-val3';
        const stake = 600000000000n; // 6,000 NST (above minimum)

        for (const addr of [val1, val2, val3]) {
            const acct = {
                address: addr,
                nst_balance: stake.toString(),
                nsd_balance: '0',
                staked_nst: stake.toString(),
                is_validator_candidate: true,
                updatedAt: Date.now()
            };
            accounts.set(addr, acct);
            persistAccount(addr, acct);

            validators.set(addr, { stake: Number(stake), publicKey: 'test-pubkey-' + addr, slashed: false });
            persistValidator(addr, validators.get(addr));
        }

        state.totalStake = Number(stake) * 3;
        persistChainState();

        // Test: query the same height multiple times
        const height = 100;
        const producer1 = getProducer(height);
        const producer2 = getProducer(height);
        const producer3 = getProducer(height);

        assert.ok(producer1, 'Producer should be selected');
        assert.strictEqual(producer1, producer2, 'Same height should return same producer (call 1 vs 2)');
        assert.strictEqual(producer2, producer3, 'Same height should return same producer (call 2 vs 3)');

        console.log(`[Test] Deterministic selection verified: height ${height} → producer ${producer1}`);
    });

    test('stake-weighted selection: higher stake yields higher selection frequency', () => {
        // Setup: create 2 validators with different stakes
        const highStakeVal = 'producer-test-high';
        const lowStakeVal = 'producer-test-low';
        const highStake = 10000000000000n; // 100,000 NST
        const lowStake = 500000000000n;    // 5,000 NST (minimum)

        // Clear previous test validators
        for (const addr of ['producer-test-val1', 'producer-test-val2', 'producer-test-val3']) {
            validators.delete(addr);
            accounts.delete(addr);
        }

        for (const [addr, stakeAmount] of [[highStakeVal, highStake], [lowStakeVal, lowStake]]) {
            const acct = {
                address: addr,
                nst_balance: '0',
                nsd_balance: '0',
                staked_nst: stakeAmount.toString(),
                is_validator_candidate: true,
                updatedAt: Date.now()
            };
            accounts.set(addr, acct);
            persistAccount(addr, acct);

            validators.set(addr, { stake: Number(stakeAmount), publicKey: 'test-pubkey-' + addr, slashed: false });
            persistValidator(addr, validators.get(addr));
        }

        state.totalStake = Number(highStake) + Number(lowStake);
        persistChainState();

        // Test: sample producer selection over many heights
        const sampleSize = 1000;
        const selections = { [highStakeVal]: 0, [lowStakeVal]: 0 };

        for (let h = 1; h <= sampleSize; h++) {
            const producer = getProducer(h);
            if (producer === highStakeVal) selections[highStakeVal]++;
            else if (producer === lowStakeVal) selections[lowStakeVal]++;
        }

        const highFreq = selections[highStakeVal] / sampleSize;
        const lowFreq = selections[lowStakeVal] / sampleSize;

        console.log(`[Test] Selection frequency over ${sampleSize} heights:`);
        console.log(`  High stake (${Number(highStake) / 1e11} NST): ${selections[highStakeVal]} selections (${(highFreq * 100).toFixed(1)}%)`);
        console.log(`  Low stake (${Number(lowStake) / 1e11} NST): ${selections[lowStakeVal]} selections (${(lowFreq * 100).toFixed(1)}%)`);

        // Expected ratio: highStake / (highStake + lowStake) ≈ 100,000 / 105,000 ≈ 0.952
        const expectedHighFreq = Number(highStake) / (Number(highStake) + Number(lowStake));
        const tolerance = 0.05; // 5% tolerance for randomness

        assert.ok(
            Math.abs(highFreq - expectedHighFreq) < tolerance,
            `High stake validator should be selected ~${(expectedHighFreq * 100).toFixed(1)}% of the time (got ${(highFreq * 100).toFixed(1)}%)`
        );

        assert.ok(
            highFreq > lowFreq,
            'Higher stake validator should be selected more frequently than lower stake validator'
        );
    });

    test('excludes slashed validators from selection', () => {
        // Setup: create validator and slash it
        const slashedVal = 'producer-test-slashed';
        const stake = 1000000000000n; // 10,000 NST

        const acct = {
            address: slashedVal,
            nst_balance: '0',
            nsd_balance: '0',
            staked_nst: stake.toString(),
            is_validator_candidate: true,
            updatedAt: Date.now()
        };
        accounts.set(slashedVal, acct);
        persistAccount(slashedVal, acct);

        validators.set(slashedVal, { stake: Number(stake), publicKey: 'test-pubkey-slashed', slashed: true });
        persistValidator(slashedVal, validators.get(slashedVal));

        // Only slashed validator exists
        for (const addr of ['producer-test-high', 'producer-test-low']) {
            validators.delete(addr);
            accounts.delete(addr);
        }

        state.totalStake = Number(stake);
        persistChainState();

        const producer = getProducer(200);
        assert.strictEqual(producer, null, 'Slashed validators should not be selected');

        console.log('[Test] Slashed validator correctly excluded from selection');
    });

    test('excludes validators below minimum stake threshold', () => {
        // Setup: create validator with stake below minimum (5,000 NST)
        const lowStakeVal = 'producer-test-insufficient';
        const insufficientStake = 400000000000n; // 4,000 NST (below 5,000 minimum)

        // Clear slashed validator
        validators.delete('producer-test-slashed');
        accounts.delete('producer-test-slashed');

        const acct = {
            address: lowStakeVal,
            nst_balance: '0',
            nsd_balance: '0',
            staked_nst: insufficientStake.toString(),
            is_validator_candidate: true,
            updatedAt: Date.now()
        };
        accounts.set(lowStakeVal, acct);
        persistAccount(lowStakeVal, acct);

        validators.set(lowStakeVal, { stake: Number(insufficientStake), publicKey: 'test-pubkey-low', slashed: false });
        persistValidator(lowStakeVal, validators.get(lowStakeVal));

        state.totalStake = Number(insufficientStake);
        persistChainState();

        const producer = getProducer(300);
        assert.strictEqual(producer, null, 'Validators below minimum stake should not be selected');

        console.log('[Test] Validator below 5,000 NST minimum correctly excluded');
    });

    after(async () => {
        console.log('[Test] Producer selection tests completed');
        // Cleanup: remove test DB
        try {
            const fs = await import('fs');
            if (fs.existsSync(TEST_DB_PATH)) {
                fs.unlinkSync(TEST_DB_PATH);
                console.log('[Test] Cleaned up test database');
            }
        } catch (e) {
            console.warn('[Test] Could not clean up test DB:', e.message);
        }
    });
});
