# Security & Safety Protocols
[← Index](../Index.md)

Overview

Security & Safety policies ensure that governance operations have appropriate access controls, fail-safe mechanisms (safe mode), and resiliency against misuse.

Key protocols
- Founder/Administrator roles: `requireFounder` and `requireAdmin` guard endpoints which are critical and require founder-level access.
- SafetyService (maintenance mode): `POST /v1/admin/shutdown` toggles safe-mode to temporarily block mutating actions; ensure `SafetyService` tests cover this behavior.
- Secrets management: Use `GOVERNANCE_PRIVATE_KEY_PATH` and `.env` files to avoid committing secrets, rotate keys, and restrict access.

How-to
1. To enforce safe mode on a live environment: `POST /v1/admin/shutdown` (founder-only route). See `admin-node/src/routes/admin.ts`.
2. To add secure endpoints, include `requireFounder` or `requireAdmin` middleware and add unit tests to validate permission enforcement.
3. To run safety tests locally: `npm test` from `admin-node` or run the integration suite including `shutdown.test.ts`.

Checklist
- [ ] All mutatingadmin endpoints are guarded by founder or admin controls.
- [ ] Safe mode blocks `set-tx-signature`, `verify-genesis`, or other mutating actions.
- [ ] `.env` and secret files are added to `.gitignore` and not committed.

References
- `admin-node/src/services/safety-service.ts`
- `admin-node/src/routes/admin.ts`
- `docs/security/api-rate-limiting.md`

Last updated: 2025-11-15

## CN-07-H — Production Crypto Implementation (Phase 1)

Status: In Progress → Phase 1 complete (prototype deployed)

Summary:
- Phase 1 replaces ad-hoc mock signing/verification with a shared cryptographic utility providing canonical payload hashing and an ED25519-style signing/verification API (prototype implementation uses HMAC-SHA256 as a deterministic stand-in for ED25519).
- Files added/updated: `shared/crypto-utils.ts`, `shared/crypto-utils.test.ts`, `vp-node/ns-node-client.ts`, `ns-node/src/services/ledger-reward-processor.ts`.

Why this matters:
- The economic security of reward claims and slashing evidence depends on robust cryptographic guarantees: authenticity, integrity and non-repudiation.
- Phase 1 creates a single source of truth for signing/verification and moves the codebase toward a real ED25519 implementation.

Next steps (Phase 2+):
1. Phase 2: Replace HMAC-based prototype with a real ED25519 library (recommend `@noble/ed25519`).
	- Status: **Phase 2 implemented** (shared/crypto-utils now dynamically uses ED25519 when available; sign/verify APIs are async with safe fallback).
2. Phase 3: Key Management Integration (Vault & Registry prototype).
	- Status: **Phase 3 implemented (prototype)** — `VaultClient` and `PublicKeyRegistry` classes added at `shared/key-management.ts`, integrated into VP/NS node flows. These are prototype interfaces for architecting KMS/HSM and registry integration.
2. Add integrated key management (HashiCorp Vault / AWS KMS / HSM) with secrets rotation and access controls.
3. Implement an authoritative public key registry for validators (on-chain or consensus-backed) and remove deterministic key derivation used in prototypes.
4. Add replay protection / idempotency records for claims and confirmations.
5. Add CI E2E tests and secrets fixtures for safe test coverage.

Security note: Phase 1 provides deterministic behavior for tests and prototype integration — it is not production safe. Do not use prototype keys or HMAC-based signatures in production deployments.