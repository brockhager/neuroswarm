# CN-08-B — NS-Node Reward Processing Endpoint

Status: Completed (prototype)

Overview
--------
CN-08-B implements the ledger-side endpoint which accepts signed reward claims from VP nodes (the producer/validator), verifies the signature against the validator registry, and queues a canonical settlement transaction for inclusion in the ledger.

Files added
-----------
- `ns-node/src/services/ledger-reward-processor.ts` — service exposing `/api/v1/ledger/submit-reward-claim` and a small verification/queueing mock.
- `ns-node/tests/ledger-reward-processor.test.mjs` — basic verification and route tests.

Design notes
------------
- Signature verification in this prototype uses a mocked `getValidatorPublicKey()` and expects `SIG-CLAIM-MOCK-<validatorId>` signatures.
- Queueing is also mocked — the function `queueSettlementTransaction()` logs and returns a pseudo-txHash. In production this should enqueue a canonical ledger transaction in the mempool or planner for the next block.

Security & hardening TODOs
-------------------------
- Replace mock verification with ED25519 signature verification using the validator registry / ledger identity keys.
- Add replay protection (nonce/timestamp/claimId dedupe) and persist claims as canonical ledger evidence.
- Authenticate VP nodes (mutual TLS or bearer token) for claim submission in production.

Next steps
----------
The next priority is CN-08-C (VP-side persistence and requeueing) so that VP nodes durably log claims and can re-submit if NS is temporarily unreachable or returns transient errors.
