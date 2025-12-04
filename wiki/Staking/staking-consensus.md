# Staking → Consensus Mapping

This short note documents how account-level staking (`accounts.staked_nst`) maps to validator consensus weights used during VP selection.

Key points:

- Accounts hold `staked_nst` (NST) as a separate ledger field from `validators.stake`.
- When a canonical block applies an `NST_STAKE` or `REGISTER_VALIDATOR` transaction, the node syncs the account's `staked_nst` into the `validators` map using `syncValidatorStakeFromAccount(address)`.
- `state.totalStake` is maintained as the sum of `validators.stake` and persisted in chain state.
- Only canonical blocks (blocks that extend the canonical tip) update persisted account and validator state; snapshots are created for non-canonical branch blocks and used during reorg replay.
- Reorgs restore validator state from the ancestor snapshot then replay the new canonical branch to reconstruct stake distribution.

Testing notes:
- Integration tests under `ns-node/tests/integration` exercise the above behavior:
  - `staking.test.mjs` — stake lifecycle and pending unstakes
  - `staking_consensus.test.mjs` — ensures higher stakers are favored by `chooseValidator()`
  - `staking_reorg.test.mjs` — causes a fork and verifies validator state and totalStake are consistent after a reorg

Design decisions:
- The current model maintains a separation between account balances and validator stake; rewards are credited to account balances and do not auto-compound into `validators.stake` unless a dedicated stake tx is issued.
- Minimum self-stake for validator registration is enforced (`MIN_SELF_STAKE = 5000 NST`).
