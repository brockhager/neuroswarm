# Merge CN-06: Complete Staking Lifecycle, Consensus Integration, and Hardening

This Pull Request finalizes the core security and financial mechanisms for Validator Peers (VP-Nodes) by implementing the full staking lifecycle, integrating stake weight into consensus selection, and hardening the logic against reorgs and concurrency issues.

## Goal
Establish a robust Proof-of-Stake (PoS) foundation for block production and ensure unbond safety and reorg resilience.

## Key Changes & Features Implemented (CN-06)

### 1) Full Staking Lifecycle
- NST_STAKE: Moves NST from `nst_balance` to `staked_nst` and enforces **5000 NST** minimum self-stake.
- NST_UNSTAKE: Decrements `staked_nst` and registers a persistent `pending_unstake` record requiring a 7-day unbonding period before being moved back to `nst_balance`.
- REGISTER_VALIDATOR: Sets `is_validator_candidate` only when the account meets the minimum self-stake.

### 2) Consensus Integration & Reorg Safety
- Validator weight now reflects `account.staked_nst` via `syncValidatorStakeFromAccount()`.
- `chooseValidator()` deterministically selects validators by weighted stake and uses block snapshots to ensure accurate reorg replay.
- Reorg handling restores snapshot state, rolls back releases, and replays canonical path correctly.

### 3) Unbond Release Processor & Hardening
- Implemented `releaseMatureUnstakes()` invoked at canonical block finalization:
  - Uses DB transactions and `released_unstakes` tracking to prevent double-credit and support reorg reversion.
  - Idempotent by design — re-checks DB before crediting.
- Extensive tests added for timing, concurrency, cross-process release races, and reorg reversion.

## Tests (ns-node/integration)
- All integration tests pass locally: 21/21.
- New tests added:
  - `unbond_release.test.mjs`, `unbond_timing.test.mjs`, `unbond_concurrent.test.mjs`, `unbond_concurrent_process.test.mjs`, `unbond_reorg.test.mjs`
- Fixed `validator_account_tracking.test.mjs` by switching to dynamic imports so each test gets an isolated DB setup.

## Operational Notes
- `released_unstakes` table persists release records so reorgs can revert releases safely.
- DB uses WAL mode and explicit transactions to prevent double-credit with concurrent processes.

## Next Steps
- CI validation (CN-06-F) — please run GitHub Actions via PR and review logs.
- Optional: add stress tests for scale, long reorg scenarios, performance profiling of DB under heavy concurrent load.

---

If you want I can: create the PR on your behalf (requires git remote/credentials in environment) or finalize a PR description and review checklist you can paste into the GitHub UI.
