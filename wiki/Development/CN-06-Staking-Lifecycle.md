# CN-06: Staking Lifecycle — Design & Behaviour

This page documents the complete staking lifecycle implemented for CN-06, the consensus integration, and the unbond release processor hardening.

## Overview
This feature set implements a local account-level staking model (NST), ties staked balances to validator voting weight used by `chooseValidator()`, and adds robust unbonding/unrelease behavior. It includes reorg-safety and concurrent-release safeguards validated by a comprehensive integration test suite.

Key guarantees:
- Deterministic validator selection based on `account.staked_nst` (consensus weights)
- Safe unbonding: `NST_UNSTAKE` moves funds into `pending_unstakes` for a 7-day unbonding period; funds are not immediately returned to `nst_balance`
- Release processing is transactional and idempotent across concurrent callers and reorgs

## Transaction Types
- `NST_STAKE`:
  - Moves NST from `nst_balance` to `staked_nst` on the account row.
  - Enforces minimum **5,000 NST** self-stake when staking (required to `REGISTER_VALIDATOR`).
  - On canonical blocks the account was persisted and if `is_validator_candidate` is true, `syncValidatorStakeFromAccount()` updates validator weight.

- `NST_UNSTAKE`:
  - Reduces `staked_nst` immediately.
  - Creates a `pending_unstakes` persistent record:
    - id: txId
    - address: account address
    - amount: amount to be released
    - unlockAt: timestamp (7 days from creation by default)
    - createdAt
  - Removal from `pending_unstakes` and crediting to `nst_balance` happens only when `releaseMatureUnstakes()` runs at finalization time (canonical blocks only).

- `REGISTER_VALIDATOR`:
  - Toggles `is_validator_candidate` to true for accounts where `staked_nst >= 5000 NST`.
  - Once set, an account's `staked_nst` is used to set its validator weight.

## Consensus Integration - chooseValidator()
- Validators and their stake are tracked in-memory (`validators` Map) and persisted.
- For account-based staking, `syncValidatorStakeFromAccount(address)` copies `account.staked_nst` into the `validators` entry for that address if `is_validator_candidate`.
- `chooseValidator(prevHash, slot)` seeds deterministic selection using `sha256(prevHash + slot)` and weights selection by `state.totalStake` (sum of validator stakes).
- Reorg handling uses per-block snapshots to reconstruct branch-local validator stake and perform replays for the canonical chain.

## Unbond Release Processor (`releaseMatureUnstakes()`)
- Scans `pendingUnstakes` for records where `unlockAt <= cutoffTime`.
- For each matured record:
  1. Starts DB transaction
  2. Re-checks `pending_unstakes` row to avoid races
  3. Persists `released_unstakes(id, address, amount, releasedAt)` as a record to enable reorg reversal
  4. Deletes `pending_unstakes` row
  5. Credits `account.nst_balance` by the amount
  6. Commits transaction
  7. Removes pending_unstake from in-memory map, updates `accounts` map
- Designed to be idempotent (db check prevents double-credit when concurrent callers race)
- Reorg revert: If a block is rolled back and it had an unstake whose release is recorded, `performReorg()` will detect `released_unstakes` and revert them:
  - Begin transaction, subtract the released amount from account, recreate `pending_unstakes` row, delete `released_unstakes` record, commit.
  - In-memory maps updated so application state and DB remain consistent.

## Timing & Edge Cases
- Release occurs when cutoffTime >= unlockAt — exact boundary behavior validated by `unbond_timing.test.mjs`.
- Concurrent processes / threads: multiple callers scanning and releasing matured unstakes will not double-credit because operations are transactional and re-check DB state before crediting (tested in `unbond_concurrent.test.mjs` and `unbond_concurrent_process.test.mjs`).
- Reorgs: releases are tracked by `released_unstakes` so they can be reverted if a previously canonical block is rolled back. The revert then restores the pending_unstake and subtracts the credited balance (tested by `unbond_reorg.test.mjs`).

## Tests & Validation
- Integration tests added/updated (ns-node/tests/integration):
  - `unbond_release.test.mjs` — basic release sweeps matured unstakes
  - `unbond_timing.test.mjs` — exact unlockAt boundary behavior
  - `unbond_concurrent.test.mjs` — concurrent callers within same process are idempotent
  - `unbond_concurrent_process.test.mjs` — independent processes racing to sweep a record (prevents double-crediting)
  - `unbond_reorg.test.mjs` — reorg reverts release and then reapplies on new canonical chain
  - `validator_account_tracking.test.mjs` — fixed to use dynamic imports so test DB path is honored before state initialization

## Operational Notes
- Default unbond period (production) is controlled in the chain code; tests use a mocked 7-day offset to simulate unlocks.
- `released_unstakes` is persisted in DB to guarantee reorg revertability.
- WAL mode (SQLite) used to support concurrent access and transactions.

## Next Steps & Recommendations
- Monitor CI run across all packages after pushing branch/PR. CI will run full integration tests and longer test matrix.
- Optionally add stress tests for thousands of concurrent release attempts to test DB locking under load.
- Add doc links to the `neuroswarm/wiki/` index and reference this CN-06 doc from package READMEs.

---
Last updated: 2025-12-04  (by automation/assistant)
