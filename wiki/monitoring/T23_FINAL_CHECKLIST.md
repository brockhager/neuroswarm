# T23 Final Check / Operator Checklist

This checklist describes the final operational steps required to enable the credentialed, gated T23 Devnet preflight and confirm the full pin-then-anchor flow.

Prerequisites
- You must be a repo admin with access to the repository's Settings → Secrets.

Required repository secrets (add these before merging):
- SOLANA_RPC_URL — e.g. https://api.devnet.solana.com
- ROUTER_PRIVATE_KEY — Router signer private key as a JSON array (or use SOLANA_SIGNER_KEY)
- IPFS_API_URL — IPFS pinning HTTP API URL (e.g., Pinata / Infura / web3.storage pin endpoint)
- DISCORD_CRITICAL_ALERT_WEBHOOK — Discord webhook for critical alert notifications
- GOVERNANCE_SERVICE_TOKEN — internal token used from router-api → admin-node ingestion endpoint

Steps
1. Add the required repository secrets (Repository → Settings → Secrets):

   - SOLANA_RPC_URL
   - ROUTER_PRIVATE_KEY or SOLANA_SIGNER_KEY
   - IPFS_API_URL
   - DISCORD_CRITICAL_ALERT_WEBHOOK
   - GOVERNANCE_SERVICE_TOKEN

2. Double-check: `neuroswarm/.github/workflows/ci.yml` now contains a gated job `t23_devnet_anchor_test` that validates these env vars at runtime.

3. Merge this branch into `main`.

4. On GitHub Actions, watch the workflow run; you should see `t23_devnet_anchor_test` run when the merge triggers. It will exit early (code 78) when secrets are not set (safe gating behavior).

5. If the job runs successfully (GREEN), the workflow will execute `router-api/scripts/run-t23-full-anchor.ts` which performs the full pin-then-anchor flow against Devnet.

6. Confirm the preflight outputs a valid IPFS CID and a real Solana signature (Devnet). The script prints an explorer link for convenience.

7. Follow the monitoring guide to verify Prometheus metrics and the `T23OnChainAnchorFailures` alert; ensure Alertmanager routes to your `DISCORD_CRITICAL_ALERT_WEBHOOK`.

If you want me to finish the final merge and check the live GitHub CI, I cannot modify GitHub secrets or perform merges from here — but I can verify files and iterate on patches if you paste the failing workflow logs or grant me remote CI credentials. Otherwise once you add the secrets and merge I will happily validate the final CI pass and sign off.
