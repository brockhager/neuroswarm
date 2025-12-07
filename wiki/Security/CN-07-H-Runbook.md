# CN-07-H Runbook — Confirmation Authentication & Key Management (Operational Runbook)

Status: Draft — 2025-12-07

Purpose
-------
This runbook documents operational processes and incident handling for the CN-07-H security hardening project (ED25519 signing / verification and idempotency for reward claims & confirmations). It establishes safe procedures for key generation, rotation, compromise response, audit logging, and operator verification needed to maintain chain-of-trust for VP↔NS settlement flows.

Scope
-----
- NS-Node signing of settlement confirmation messages (NS → VP)
- VP-Node verification of confirmations using authoritative public key registry
- Vault/KMS integration for private key lifecycle (generation, rotation, access control)
- Durable idempotency/audit store for confirmation records
- Monitoring, testing and incident runbooks for key compromise and recovery

Definitions
-----------
- Key authority: The Key Management Service (KMS) or Vault that stores private keys and performs signing operations.
- PublicKeyRegistry: authoritative lookup service that provides public keys (used by VP to verify NS signatures).
- Idempotency Store: durable audit store that maps idempotency keys to confirmation records (claimId, txHash, recordedAt, processorNode).

Operational Goals
-----------------
- Private keys never leave the KMS/HSM in plaintext (sign-on-the-server preferred; private key material not exported).
- All confirmation messages (NS → VP) must be signed and VP must verify signature before state changes.
- Idempotency records are recorded with audit metadata to allow for forensic investigation.
- Keys are rotated regularly and emergency rotation is fast and safe.

1) Key Generation & Bootstrapping
---------------------------------
Recommended approach for production deployments:
- Provision a hardware-backed KMS (HashiCorp Vault with HSM-backed transit, AWS KMS, or cloud HSM).
- Create KMS master key for each node role (e.g., `ns-primary`, per-validator `vp-<id>` if required).
- Generate keys in KMS and do not export private material. Use the signing API for on-demand signing.
- Record the public key fingerprint in the PublicKeyRegistry (on-chain or consensus-backed registry for high-assurance).

Quick bootstrap (Dev/Testing):
- For local testing, use deterministic key derivation (already in prototype) but mark such deployments "non-production" in monitoring.
- Store dev keys in a protected environment variable only for CI fixtures with restricted access.

2) Signing Confirmations (NS → VP)
-----------------------------------
Message format (canonical JSON):
{
  "claimId": "<string>",
  "txHash": "<string>",
  "timestamp": "ISO8601 string",
  "sender": "NS-PRIMARY",
  "signature": "hex-of-signature"
}

- NS produces canonical payload and requests signature from KMS using its node identity.
- NS attaches signature to HTTP body and sends the confirmation to VP callback endpoint with `Idempotency-Key` header.
- NS logs the confirmation txn and idempotency key in its local audit trail (append-only JSONL) — do NOT mark it as settled on NS-only; VP marks and records the final idempotency audit record.

3) VP Verification (Server-side)
--------------------------------
- Upon receiving a confirmation, VP must:
  1. Validate request origin: ensure TLS + authenticated endpoint (mutual TLS or bearer token) if possible.
  2. Parse JSON body and ensure required fields exist.
  3. Lookup the `sender` public key in `PublicKeyRegistry` (fall back to local env override only for test/dev).
  4. Compute canonical hash and verify the attached signature. If verification fails -> respond 401 and log an alert.
  5. If verification succeeds, perform idempotency checks and apply settlement.
  6. Persist an audit record: { idempotencyKey, claimId, txHash, recordedAt: now, processorNode: 'VP-Node' }.

4) Key Rotation Policy
----------------------
Rotation frequency: rotate signing keys every 90 days (minimum) for production nodes.
Emergency rotation: immediate upon suspected compromise.

Recommended steps for rotation:
- Generate new key in KMS and publish new public key to the PublicKeyRegistry with an activation timestamp.
- Update NS configuration to use the new signing key (if using service-side signing, update KMS credential settings).
- Ensure a brief overlap period (configurable, e.g., 5 minutes) where both the old and new public keys are accepted by VP to avoid transient verification failures.
- After activation window and successful verification checks, retire the old public key and mark it archived in the registry with the archival timestamp and reason.

5) Key Compromise Response (Incident Playbook)
----------------------------------------------
If a private key is suspected of compromise for any node:
1. Immediately rotate the key in KMS and mark current key as revoked.
2. Publish new public key to registry and broadcast a revocation announcement to operator channels and monitoring systems.
3. Halt any batch settlement worker(s) if replay or spoofing risk is non-trivial and restore from safe checkpoint.
4. Re-verify audit logs for any unexpected confirmations in window of compromise and re-run claims verification for suspect confirmations.
5. Re-issue credentials, update bridge endpoints and ensure all nodes verify using the updated public keys.
6. Document the incident: timestamps, affected keys, mitigation timeline, and post-incident root cause analysis.

6) Audit & Monitoring
---------------------
Key telemetry to capture:
- `confirmation_sign_requests_total` (per NS node, labeled by nsId)
- `confirmation_verify_success_total` / `confirmation_verify_fail_total` (per VP)
- `idempotency_records_created_total` and `idempotency_dupes_total`
- Alert on repeated signature verification failures or excessively frequent idempotency-key collisions.

Audit records (append-only):
- All keys operations (gen, rotate, revoke) are logged with: operator, keyId, event, timestamp
- IdempotencyStore entries: idempotencyKey, claimId, txHash, recordedAt, processorNode
- NS & VP local JSONL logs include structured fields for signing, verification result, and correlation ids

7) Testing & CI Practices
-------------------------
- Add CI fixtures to exercise key rotation scenarios and ensure dual-key acceptance window works.
- Add regression tests verifying signature verification rejects malformed or replayed confirmations.
- Add test harness for KMS mocks that simulate HSM latency and signing failures.

8) Operational Playbook (Quick Commands)
---------------------------------------
- Rotate NS key (example using Vault transit):
  - Create new key: `vault write -f transit/keys/ns-primary` (example)
  - Get public key and publish to registry (or update environment).
  - Verify production nodes accept signatures from new key during overlap window.

- Auditing Idempotency Store (quick):
  - Inspect audit records from storage (Redis/Postgres or JSONL dump) for a given idempotency key:
    `SELECT * FROM idempotency WHERE idempotency_key = '<key>';`

9) Appendix — Environment variables used
----------------------------------------
- `VAULT_TOKEN` — token used by `KmsVaultClient` in prototype; in production this will be IAM / OIDC role-based credentials.
- `NS_NODE_ID` — identity used by NS for signing (default `NS-PRIMARY` in prototypes).
- `REGISTRY_PUBKEY_<ID>` — override storage for public key values in development only.

10) Next steps & improvements
----------------------------
- Replace prototype KMS client with a hardened Vault/AWS KMS-backed client using HSM-backed keys.
- Use an on-chain or consensus-backed public key registry for stronger trust (avoid single-point-of-failure).
- Harden idempotency store to a distributed DB with concurrency locks and consistency guarantees (Postgres or Redis).
- Formalize operator playbooks with runbooks in the escalation/ops handbook and periodic rotation drills.

---

Last updated: 2025-12-07

Maintainers: Security team / Platform team

