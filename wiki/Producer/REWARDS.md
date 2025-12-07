# Producer Rewards & Fee Allocation

This page collects the reward / fee allocation rules relevant to Producers (VP nodes) in NeuroSwarm.

## NST Block Rewards (security / governance)
- The block subsidy for smart staking security is paid in NST according to a halving schedule.
- The canonical `ns-node` implementation determines the per-block reward via `calculateBlockReward(height)` (see `ns-node/src/services/chain.js`).

Key parameters:
- Initial Block Reward (IBR): 0.5 NST
- Halving interval: 14,700,000 blocks

## NSD Fee Allocation (utility / fees)

NSD collected as transaction fees is split across the block Producer and a shared network pool.

Default allocation:
- 90% — Awarded to the **Winning Validator / Producer** (VP node that produced the block).
- 10% — Allocated to the **NS Shared Pool** (`ns-rewards-pool`) for network-level use cases.

Prototype note (CN-08-A):
> The VP prototype `vp-node/fee-distribution-service.ts` implements an alternate, experimental split used by the CN-08-A feature set for testing and local simulations. The prototype allocation defaults to `60%` (producer), `30%` (stake pool/delegators), `10%` (network fund). This is intentionally separate from the canonical NS applyBlock split and exists to support early validator economics testing. Production on-chain settlements should be driven by the canonical NS ledger rules.

Implementation notes (reference):
- In the NS applyBlock path, fees are summed and then split as:

```js
// Calculate total fees
let totalNsdFees = 0n;
for (const tx of block.txs) totalNsdFees += BigInt(tx.fee || 0);

const validatorShare = (totalNsdFees * 9n) / 10n; // 90%
const poolShare = totalNsdFees - validatorShare; // 10%

// Credit validator account (producer) and ns shared pool accordingly
```

### Where this shows up
- The Producer receives both the NST mint subsidy and the NSD fee share when their produced block is accepted by NS.

---

See also: `wiki/Staking/dynamic-reward-logic.md` and `wiki/Tokenomics-and-Economics/dynamic-reward-logic.md` for broader tokenomics context.
