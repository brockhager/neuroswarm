# CN-08-E — Ledger Settlement Confirmation & VP Notification

Status: Prototype implemented

Overview
--------
CN-08-E completes the reward lifecycle by allowing the NS-Node to notify VP-Nodes when a reward settlement transaction (produced from a VP claim) is actually queued or processed by the ledger. This allows VP nodes to mark persisted claims as SETTLED once the transaction is accepted by the NS ledger.

Key implementation points
-------------------------
- `ns-node/src/services/ledger-settlement-confirmation.ts` — helper to POST settlement confirmations to a VP callback URL.
- `ns-node/src/services/ledger-reward-processor.ts` — after queuing a settlement transaction, the processor will (optionally) call the VP callback path specified by `VP_CALLBACK_URL` with { claimId, txHash }.
- `vp-node/server.js` — new endpoint added: `POST /api/v1/ledger/confirm-reward-settlement` that calls into `vp-node/reward-claims-db-service.ts` to mark claims SETTLED.

Testing & behavior
------------------
- Unit tests verify `sendSettlementConfirmationToVP()` sends the correct payload to a VP endpoint and handles non-200 responses.
- The reward-processor integration test mounts the router and verifies that after `POST /api/v1/ledger/submit-reward-claim` the NS processor queues a tx and notifies the configured VP callback URL.
- VP server tests exercise the confirmation endpoint and verify that persisted claims transition out of the pending set (SETTLED).

Next steps / Hardening
---------------------
- Replace the single global `VP_CALLBACK_URL` prototype with per-validator callback discovery (service directory / registry). Do not rely on a single global callback URL in production.
- Add secure authentication (mTLS or mutual auth + signing) for NS→VP callbacks.
- Make the confirmation flow idempotent (dedupe confirmations) and add retry/circuit-breaker rules on NS side for unreachable VPs.
- Add reconciliation (NS publishes on-chain settlement events, VP ingests and reconciles missed confirmations).
