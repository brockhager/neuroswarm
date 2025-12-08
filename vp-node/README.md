# VP Node — Deterministic Node ID Requirement

VP nodes must present a deterministic, cryptographic Node ID derived from their signing public key.

Why
- The Node ID is the canonical, tamper-resistant identifier for a validator — used for banning, auditing, and governance.
- Allowing anonymous or default IDs would permit nodes to join without accountability and undermine slashing/ban operations.

How it works
- The canonical `VAL_ID` is computed as the SHA-256 hash of the public key bytes, encoded as a 64-character lowercase hex string.
- The VP startup code supports two ways to provide/derive the Node ID:
  - Provide a `VALIDATOR_ID` environment variable directly (must be the canonical 64-char hex id), or
  - Provide the public key PEM (SPKI) via `PUBLIC_KEY_PEM` environment variable — VP will derive the `VAL_ID` automatically.

Examples (PowerShell)
```powershell
# 1) Provide PUBLIC_KEY_PEM (one-line content from a PEM file)
$env:PUBLIC_KEY_PEM = Get-Content C:\path\to\pubkey.pem -Raw
node server.js

# 2) Provide VALIDATOR_ID explicitly (64-char hex)
$env:VALIDATOR_ID = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'
node server.js
```

Tests
- Unit tests include `tests/unit/startup-id-enforcement.test.mjs` which asserts VP exits when no `VALIDATOR_ID` or `PUBLIC_KEY_PEM` is present.

If you need help generating a proper public key or deriving the ID from a keypair, see `shared/crypto-utils.ts` and the project test harness which demonstrates key derivation (`deriveKeypairFromSeed` and `nodeIdFromPublicKey`).
