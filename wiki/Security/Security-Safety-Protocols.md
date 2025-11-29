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