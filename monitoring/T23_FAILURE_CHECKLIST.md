# T23 Failure Modes and Recovery Runbook

Date: 2025-12-01 23:43

Purpose
- Operators: This runbook gives a concise list of common failure modes for the T23 preflight (t23_devnet_anchor_test), how to detect them in CI logs and system metrics, and the exact, runnable remediation steps to recover quickly.

Scope
- Focus: router-api T23 pipeline (anchorAudit → IPFS pin → Governance sink → Solana on-chain anchoring) and the gated CI job `t23_devnet_anchor_test` that runs `router-api/scripts/run-t23-full-anchor.ts` on `main`.
- Assumption: You have admin access to the GitHub repository (to add secrets and re-run workflows), Devnet & IPFS credentials, and access to router-api & admin-node logs.

How to use
1. If the `t23_devnet_anchor_test` job fails, capture the GitHub Actions job log bundle and immediately search for the error lines. Use the ‘Find’ feature in Actions UI for keywords: "IPFS", "pin", "SOLANA", "sendTransaction", "GOVERNANCE_LOGGER", "persist".
2. Use the relevant section in this runbook for step-by-step remediation.

---

Quick verification helpers (local)
- Quick local preflight run (run on an admin box with secrets env):
```powershell
# Run from repository root
cd C:\JS\ns\neuroswarm\router-api
# Set required env (example) - replace placeholders
$env:SOLANA_RPC_URL = 'https://api.devnet.solana.com'
$env:ROUTER_PRIVATE_KEY = '[[JSON_SECRET_KEY_ARRAY]]'
$env:IPFS_API_URL = 'https://ipfs.pin.example/add'
$env:GOVERNANCE_SERVICE_TOKEN = 'secret-gov-token'
$env:DISCORD_CRITICAL_ALERT_WEBHOOK = 'https://discord.com/api/webhooks/..'
# Execute preflight
npx ts-node scripts/run-t23-full-anchor.ts
```
- Re-run the CI workflow (if merge happened): Re-run job from Actions UI → click 'Re-run jobs' ; use 'Re-run failed jobs' to avoid re-running entire workflow.

---

Common failure modes and actionable fixes

1) IPFS pinning failures (timeouts, gateway failures, invalid URL, rate-limit)
Symptoms / logs:
- Error lines: "IPFS pin attempt X/Y failed", "IPFS gateway did not return CID", or axios timeouts.
- Final CI error: "IPFS pinning failed after all retries" or preflight error complaining CIS assertion: "IPFS CID is invalid or looks like a mock".

Immediate triage:
- Check `IPFS_API_URL` secret value and gateway health (status page, credentials).
- Inspect CI job logs to identify whether gateway returned non-200 or timed out.
- Verify IPFS provider quotas / rate-limits and whether the gateway requires authentication headers/token.

Remediation steps (ordered):
1. Validate env and retry locally:
```powershell
# test API with curl (PowerShell)
$ipfs = 'https://ipfs.pin.example/add'
# send a tiny object and check response
Invoke-RestMethod -Method Post -Uri $ipfs -Body '{"test":"x"}' -ContentType 'application/json' -TimeoutSec 30
```
2. If you see auth errors, confirm IPFS API token/headers are configured correctly with provider docs.
3. If intermittent (timeouts/502), retry the CI job (Actions → Re-run failed jobs). Consider adding `IPFS_PIN_ATTEMPTS` / `IPFS_PIN_BACKOFF_MS` temporarily to environment if provider is slow.
4. If gateway is down or project exceeds quota, contact provider and/or swap to a fallback pinning service (update `IPFS_API_URL` in secrets) and re-run.
5. For test/CI safety: if ipfs provider cannot be reached immediately and you must progress, you may temporarily set `IPFS_API_URL='mock'` **only** on a disposable branch for triage — but DO NOT merge this into main as it bypasses the integrity check.

Validation after fix:
- Re-run local preflight, verify `Audit anchored -> { ipfs_cid: 'Qm...' }` and CI preflight assertion passes.

---

2) Governance sink ingestion failures (admin-node timeline ingestion)
Symptoms / logs:
- Error lines: "Persist attempt X/Y to governance logger failed" or "Failed to persist timeline record to governance logger after retries".
- Timeout errors 504, 403, 401, or connection refused.

Triage:
- Confirm `GOVERNANCE_LOGGER_URL` and `GOVERNANCE_SERVICE_TOKEN` secrets are present in Actions environment and match admin-node configuration.
- Check admin-node health endpoints and `POST /v1/admin/timeline` (ingestion) service logs for authentication errors or JSON parse problems.

Remediation steps:
1. Validate ingestion locally against admin-node dev instance (or test endpoint):
```powershell
# Example: ensure admin-node is reachable
Invoke-RestMethod -Method Post -Uri 'http://admin-node-host:3000/v1/admin/timeline' -Headers @{ 'x-governance-token' = 'secret-gov-token' } -Body ('{"action":"heartbeat","actor":"ci-test"}') -ContentType 'application/json'
```
2. If you see 401/403: rotate or re-check the `GOVERNANCE_SERVICE_TOKEN` in secrets and update admin-node config if needed.
3. If admin-node endpoint missing or misconfigured: check logs, confirm route exists `src/routes/admin.ts` and timeline service is healthy. Restart admin-node and confirm health.
4. Test persist again; when successful, re-run local preflight and CI.

Post-fix validation:
- CI log shows that router-api persisted the timeline record and admin-node returned 201; preflight continues to Solana step.

---

3) Solana RPC / on-chain anchoring failures (sendTransaction, confirmation timeouts)
Symptoms / logs:
- Error lines: "Transaction not confirmed within timeout", "sendTransaction failed", or net-level errors like 500 from the RPC.
- CI preflight may show Solana signature starting with `mock_tx_` — indicates fallback path.

Triage:
- Confirm `SOLANA_RPC_URL` is a stable Devnet endpoint and `ROUTER_PRIVATE_KEY` env contains valid secret-key array JSON.
- Check for rate limiting / RPC health using Solana provider docs and status pages.

Remediation steps:
1. Validate RPC reachability and check slot/health from an admin box:
```powershell
# Using solana/web3.js in Node - quick check script
node -e "const {Connection} = require('@solana/web3.js'); (async()=>{const c=new Connection(process.env.SOLANA_RPC_URL||'https://api.devnet.solana.com'); console.log(await c.getHealth()).catch(e=>console.error(e));})();"
```
2. Confirm key format (PowerShell):
```powershell
# router private key must parse as JSON array of 64 bytes
$json='[1,2,3,...]'
$bytes=ConvertFrom-Json $json
$bytes.Length  # expect 64
```
3. If the RPC is unreliable, try an alternate Devnet URL (e.g. an alternative RPC provider or a different Devnet mirror) and update `SOLANA_RPC_URL` repo secret.
4. If the key is invalid or incorrectly formatted, rotate/recreate the router signing key (see `admin-node/scripts/rotate-governance-key.ts` for sample tooling), update `ROUTER_PRIVATE_KEY` secret and re-run.
5. If transactions fail to confirm due to Devnet congestion increase timeout constants (`SOLANA_ANCHOR_CONFIRM_TIMEOUT_MS`) for the CI run temporarily to allow longer confirmation.

Validation after fix:
- Local preflight prints a real Solana signature (match regex in `run-t23-full-anchor.ts`) — e.g. 87-88 chars. CI preflight asserts the signature is real and will pass.

---

4) Missing / mis-set repository secrets (gated job exits early)
Symptoms:
- CI job exits with code 78 and a clear message 'Required secret X not set — this gated job requires credentials to run.'

Remediation steps:
- Add secrets in repo Settings → Secrets (or use gh CLI). Confirm names and that they are present for the workflow run.
- Ensure keys are not wrapped or escaped incorrectly when pasted (e.g., JSON arrays must be raw JSON). Make sure there are no stray newlines in private key entries.

Quick validation:
- Re-run the CI job from Actions; the job will proceed past the gating step if secrets are set.

---

5) TypeScript/Jest / pnpm lockfile CI failures (test flakes / install failures)
Symptoms:
- Install fails with frozen-lockfile mismatch (ERR_PNPM_OUTDATED_LOCKFILE)
- Jest fails due to runtime/ts compile issues

Remediation steps:
1. Update lockfiles for the relevant package(s) locally using pnpm v10 and `--no-frozen-lockfile`, commit lockfile updates and push branch. CI should then succeed install with `--frozen-lockfile`.
```powershell
# example (in affected package):
cd router-api
pnpm install --no-frozen-lockfile
pnpm test  # get tests passing locally
git add pnpm-lock.yaml
git commit -m "chore(router-api): update lockfile to match package.json (CI friendly)"
git push
```
2. Fix TypeScript / jest compile errors by adjusting typings, typed catches, or return flows as appropriate.

---

6) CI job environment network segregation (firewall / outbound rules)
Symptoms:
- CI job cannot reach external IPFS or Solana API endpoints; timeouts/connection refused.

Remediation:
- Confirm GitHub Actions runner environment has outbound access (for self-hosted runners verify firewall rules).
- If using enterprise security/proxy settings, configure appropriate proxy env vars for the runner or use a self-hosted runner with proper NAT access.

---

7) Post-failure rollbacks and safe reverts
- If an immediate fix risks production integrity, revert the merge on GitHub (revert commit or PR) and run the preflight on a disposable branch for debugging.
- Avoid merging any temporary config that disables integrity checks (e.g., using IPFS_API_URL='mock'); use feature branches for temporary recovery attempts.

---

8) Recovering the time-sensitive run (fast path)
If the CI run just failed and you need a fast re-run while you remedy the issue (e.g., provider recovered), use Actions UI to re-run only the failed workflow job. If a configuration/secret fix is applied, re-run the workflow after the change.

---

9) Contact / escalation
- If provider-side problems persist (IPFS provider or Solana RPC health) and you cannot resolve in 30–60 minutes, escalate to the on-call infra owner, include:
  - GitHub Action job logs (full log)
  - Timestamps, workflow run id
  - Provider request/incident number

---

10) Follow-up tasks to add to runbooks (post-recovery)
- Add synthetic monitoring: create scheduled jobs that run the `run-t23-full-anchor.ts` (non-destructive mode) daily in a staging job to detect external provider issues earlier.
- Add automatic retries in CI for transient network failures with exponential backoff.

---

Prepared by: Agent 4 — T23 Ops Runbook

Notes:
- Keep the T23 preflight script immutable in `router-api/scripts/run-t23-full-anchor.ts` once the branch is confirmed stable — any temporary changes should be made on a disposable branch and rolled only after verification.
- This file should be stored in the repo for audit & be accessible on-call.



