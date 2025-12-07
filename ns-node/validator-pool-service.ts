// ns-node/validator-pool-service.ts
// CN-06-D: Validator Selection and Unbond Release Processor.
// This service manages the staking pool, selects the active validator set,
// and ensures secure processing of unbond requests.

import { LedgerService } from './ledger-service'; // Mock import for CN-02 (Router/Ledger)
import { Stake } from './types'; // Mock import for data types
import crypto from 'crypto';

// --- MOCK CONSTANTS ---
const ERA_DURATION_BLOCKS = 1000;
const VALIDATOR_POOL_SIZE = 50; // Max number of active validators for an era
const UNBOND_COOLDOWN_BLOCKS = 10000; // 10 eras of cooldown

// Mock Ledger and Stake Types
interface Stake {
    validatorId: string;
    stakedAmount: number;
    unbondInitiatedBlock: number | null;
    isActive: boolean;
}

const ledgerService = {
    // Mock for interacting with the main ledger (CN-02)
    getPoolStakes: async (): Promise<Stake[]> => [
        { validatorId: 'VP-001', stakedAmount: 500000, unbondInitiatedBlock: null, isActive: false },
        { validatorId: 'VP-002', stakedAmount: 1200000, unbondInitiatedBlock: null, isActive: false },
        { validatorId: 'VP-003', stakedAmount: 300000, unbondInitiatedBlock: null, isActive: false },
        { validatorId: 'VP-004', stakedAmount: 850000, unbondInitiatedBlock: null, isActive: false },
        { validatorId: 'VP-005', stakedAmount: 100000, unbondInitiatedBlock: 500, isActive: false },
        { validatorId: 'VP-006', stakedAmount: 2000000, unbondInitiatedBlock: null, isActive: false },
        { validatorId: 'VP-007', stakedAmount: 50000, unbondInitiatedBlock: 10000, isActive: false },
        { validatorId: 'VP-008', stakedAmount: 1500000, unbondInitiatedBlock: null, isActive: false },
    ],
    updateStakeStatus: async (validatorId: string, updates: Partial<Stake>) => {
        // In a real system, this writes a transaction to the chain state
        console.log(`[LEDGER MOCK] Updated stake for ${validatorId}: ${JSON.stringify(updates)}`);
        return true;
    },
    releaseFunds: async (validatorId: string, amount: number) => {
        // In a real system, this executes a token transfer
        console.log(`[LEDGER MOCK] Released ${amount} tokens to ${validatorId}.`);
    }
};

// --- 2. VALIDATOR SELECTION LOGIC ---

/**
 * Executes the Delegated Proof-of-Stake (DPoS) selection algorithm.
 * Validators are selected based on total staked amount (highest stake wins).
 * Ties are broken using a deterministic hash based on Validator ID.
 * @param currentStakes The list of all eligible staked validators.
 * @returns The list of selected active validator IDs for the next era.
 */
export async function selectActiveValidators(currentStakes: Stake[]): Promise<string[]> {
    console.log(`\n--- Starting Validator Selection for Next Era ---`);

    // 1. Filter out Validators currently in the unbonding period
    const eligibleStakes = currentStakes.filter(s => s.unbondInitiatedBlock === null);
    
    // 2. Sort by Staked Amount (Descending)
    // Secondary sort key: Deterministic Hash (to break ties securely, ensuring no selection randomness)
    eligibleStakes.sort((a, b) => {
        // Primary sort: Staked Amount
        if (b.stakedAmount !== a.stakedAmount) {
            return b.stakedAmount - a.stakedAmount;
        }
        // Secondary sort (tie-breaker): Hash of Validator ID
        const hashA = crypto.createHash('sha256').update(a.validatorId).digest('hex');
        const hashB = crypto.createHash('sha256').update(b.validatorId).digest('hex');
        // Comparing hashes as strings ensures deterministic tie-breaking
        return hashB.localeCompare(hashA);
    });

    // 3. Select the top VALIDATOR_POOL_SIZE
    const selectedValidators = eligibleStakes.slice(0, VALIDATOR_POOL_SIZE).map(s => s.validatorId);

    console.log(`Total eligible validators: ${eligibleStakes.length}`);
    console.log(`Selected ${selectedValidators.length} validators for the active set.`);
    return selectedValidators;
}

/**
 * Updates the 'isActive' status on the ledger for the selected set.
 * @param selectedIds The list of IDs selected for the active set.
 * @param allStakes The full list of stakes to determine who to deactivate.
 */
export async function updateActiveSetOnLedger(selectedIds: string[], allStakes: Stake[]): Promise<void> {
    const activeSet = new Set(selectedIds);
    const updates: Promise<any>[] = [];

    for (const stake of allStakes) {
        const shouldBeActive = activeSet.has(stake.validatorId);
        
        if (stake.isActive !== shouldBeActive && stake.unbondInitiatedBlock === null) {
            // Only update if the status is changing and they are not unbonding
            updates.push(ledgerService.updateStakeStatus(stake.validatorId, { isActive: shouldBeActive }));
        } else if (stake.isActive && !shouldBeActive) {
            // Validator losing active status
            updates.push(ledgerService.updateStakeStatus(stake.validatorId, { isActive: false }));
        }
    }
    
    await Promise.all(updates);
    console.log(`Ledger updated: ${updates.length} staking statuses modified.`);
}

// --- 3. UNBOND RELEASE PROCESSOR LOGIC ---

/**
 * Checks for and processes any validator stakes that have completed their unbond cooldown.
 * @param currentStakes The list of all stakes.
 * @param currentBlock The current block height of the network.
 */
export async function processUnbondReleases(currentStakes: Stake[], currentBlock: number): Promise<void> {
    console.log(`\n--- Starting Unbond Release Processor (Block: ${currentBlock}) ---`);
    let releaseCount = 0;

    for (const stake of currentStakes) {
        if (stake.unbondInitiatedBlock !== null) {
            const cooldownEndBlock = stake.unbondInitiatedBlock + UNBOND_COOLDOWN_BLOCKS;
            
            if (currentBlock >= cooldownEndBlock) {
                console.log(`✅ Unbond complete for ${stake.validatorId}. Cooldown ended at block ${cooldownEndBlock}.`);
                
                // 1. Release funds
                await ledgerService.releaseFunds(stake.validatorId, stake.stakedAmount);
                
                // 2. Remove stake record (or reset to zero stake and null unbond)
                await ledgerService.updateStakeStatus(stake.validatorId, {
                    stakedAmount: 0,
                    unbondInitiatedBlock: null,
                    isActive: false 
                });
                releaseCount++;

            } else {
                const blocksRemaining = cooldownEndBlock - currentBlock;
                console.log(`⏳ ${stake.validatorId} unbond in progress. ${blocksRemaining} blocks remaining.`);
            }
        }
    }

    console.log(`Unbond Release Complete. ${releaseCount} stakes released.`);
}


// --- 4. EXECUTION SIMULATION ---

/**
 * Simulates the Validator Pool service running at the end of an era.
 * @param currentBlock The block height at which the process runs.
 */
export async function runEndOfEraProcess(currentBlock: number): Promise<void> {
    const allStakes = await ledgerService.getPoolStakes();

    // 1. Process Unbond Releases
    await processUnbondReleases(allStakes, currentBlock);
    
    // Refresh stakes after potential releases
    const remainingStakes = await ledgerService.getPoolStakes();
    
    // 2. Select New Active Validator Set
    const selectedValidators = await selectActiveValidators(remainingStakes);
    
    // 3. Update Ledger
    await updateActiveSetOnLedger(selectedValidators, remainingStakes);

    console.log(`\n--- Era ${Math.floor(currentBlock / ERA_DURATION_BLOCKS)} Complete. Active Set: ${selectedValidators.join(', ')} ---`);
}

// Example Execution - Test Multiple Scenarios
console.log(`\n*** SIMULATION 1: VP-005 Unbond Complete at Block 10500 ***`);
await runEndOfEraProcess(10500);

console.log(`\n\n*** SIMULATION 2: VP-007 Unbond Complete at Block 20000 ***`);
await runEndOfEraProcess(20000);
