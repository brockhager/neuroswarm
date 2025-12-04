## Router E2E smoke harness

This folder contains a minimal E2E smoke harness used in early CI to validate the Agent9 -> Router ingestion path.

How it works
- Starts a Router prototype server on an ephemeral port
- Uses Agent 9 client helpers (discord/src/lib/network_ingestion.js) to submit an artifact
- Verifies the artifact shows up in `/debug/pins`

How to run locally (PowerShell):

```powershell
cd router-api-prototype
# $env:ROUTER_JWT_SECRET = 'TEST_SECRET_12345'
npm run test:integration -- --run tests/e2e/contract_smoke_harness.test.mjs
```

Notes
- The harness uses HS256 (shared secret) by default for local runs and will skip certain checks if required env vars are not present.
