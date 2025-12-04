CN-04: Tokenomics Integration (Dual-Token Model)
Task 1: ((DONE)) Dual-Balance Persistence - IN PROGRESS
Database Schema
Add accounts table to state-db.js
 Add nst_balance field (8 decimal NST balance)
 Add nsd_balance field (utility token balance)
 Add staked_nst field (staked amount)
 Add account address/ID indexing
State Service Integration
 Load accounts from DB on startup
 Export accounts Map for chain.js
 Add persistAccount() helper
 Initialize NS Shared Pool account (ns-rewards-pool)
Testing
 Verify accounts table creates correctly
 Test account persistence across restarts
 Verify dual-balance tracking
Task 2: ((DONE)) Dynamic Reward & Tokenomics Logic - NOT STARTED
Reward Calculation Function
 Implement calculateBlockReward(height) in chain.js
 Formula: IBR × (1/2)^(cycle - 1) where IBR = 0.5 NST
 Cycle boundaries: 0-14,699,999 (Cycle 1), 14.7M-29.4M (Cycle 2), etc.
 Return reward in NST (8 decimal precision)
Fee Allocation Logic
 Calculate total NSD fees from block transactions
 Split: 90% to validator, 10% to NS Shared Pool
 Update validator nsd_balance
 Update ns-rewards-pool nsd_balance
Block Application Integration
 Mint NST reward to validator's nst_balance
 Apply NSD fee splits
 Persist account updates to database
 Update applyBlock() in chain.js
Testing
 Test reward calculation for multiple cycles
 Verify Cycle 1: 0.5 NST per block
 Verify Cycle 2: 0.25 NST per block (after 14.7M blocks)
 Test NSD fee allocation (90/10 split)
Task 3: Validator Account Tracking - NOT STARTED
Validator Balance Management
 Link validator publicKey to account address
 Initialize validator accounts on registration
 Track NST rewards separately from stake
 Track NSD fee earnings
Integration
 Update validator registration to create account
 Link validator ID to account in state
 Persist validator balances with blocks
Task 4: Verification & Testing - NOT STARTED
Unit Tests
 Test calculateBlockReward() for all cycles
 Test NSD fee splitting logic
 Test account persistence
Integration Tests
 Submit block, verify NST minted to validator
 Submit txs with NSD fees, verify 90/10 split
 Restart server, verify balances persist
 Test across halving boundary (block 14,699,999 → 14,700,000)
E2E Tests
 VP-Node produces block → NS-Node applies → Validator receives NST + NSD
 Verify cumulative rewards over multiple blocks
 Test NS Shared Pool accumulation
Constants & Configuration
NST Specifications:

IBR (Initial Block Reward): 0.5 NST
Cycle Duration: 14,700,000 blocks (~3.96 years at 8.5s/block)
Block Time: 8.5 seconds
Max Supply: 21,000,000 NST (hard cap)
Validator Issuance: 14,700,000 NST (70%)
NSD Fee Allocation:

Validator Share: 90%
NS Shared Pool: 10%
Pool Address: ns-rewards-pool
Halving Schedule:

Cycle	Block Range	Reward (NST)
1	0-14,699,999	0.5
2	14.7M-29.4M	0.25
3	29.4M-44.1M	0.125
4	44.1M-58.8M	0.0625
5	58.8M-73.5M	0.03125



prompt from agent 5

Agent 4 Prompt: Resume CN-04 Tokenomics Integration

Current Objective: Implement the Dual-Token Model (NST/NSD) for NeuroSwarm.

Status Summary: We have completed the core persistence and logic for tokenomics, but explicitly halted the "Block Propagation Gossip" task per user request.

Completed Work:

Persistence (Task 1): ((DONE))
Updated 
state-db.js
 with an accounts table (stores nst_balance, nsd_balance, staked_nst).
Updated 
state.js
 to load accounts on startup and initialize the ns-rewards-pool.
Tokenomics Logic (Task 2): ((DONE)) 
Updated 
chain.js
 with 
calculateBlockReward(height)
 implementing the 4-year halving schedule (0.5 NST initial reward).
Updated 
applyBlock
 in 
chain.js
 to split NSD fees (90% to Validator, 10% to Shared Pool) and credit accounts.
Verification: Created and ran 
ns-node/tests/verify-tokenomics.js
 which confirmed the reward schedule is correct.
Current State & Reversions:

Task 3 (Block Propagation Gossip):  This was started but HALTED and REVERTED by user request. I reverted the changes to 
block-propagation.js
 (switched back to BLOCK_ANNOUNCEMENT). DO NOT work on this task.
Task.md: I attempted to reset Task 3 to "NOT STARTED", but please double-check the file state as the numbering might be inconsistent.
Next Steps (Your Mission):

Review & Cleanup 
Task
: Ensure the task list accurately reflects that Persistence and Logic are COMPLETE, and Gossip is skipped/halted.
Start "Validator Account Tracking":
Link validator public keys to account addresses.
Ensure validator registration creates the necessary account entries.
Verify that rewards are correctly accumulating in the validator's account (liquid balance) vs stake (consensus weight).
Integration Testing:
Run the server and simulate block production to verify that:
Validators receive the correct NST block reward.
NSD fees are split correctly between the validator and the ns-rewards-pool.
Balances persist after a node restart.
Key Files:

ns-node/src/services/chain.js
 (Reward logic)
ns-node/src/services/state-db.js
 (Schema)
ns-node/src/services/state.js
 (Account loading)
ns-node/tests/verify-tokenomics.js
 (Existing verification script)

 