# Router Refund Reconciliation — Grafana Dashboard & Alerts

This folder contains the example Grafana dashboard and a sample alert rule used to monitor the Router API's refund reconciliation pipeline.

Files
- `router-refund-dashboard.json` — Grafana dashboard JSON (visualizes retry & alert counts).
- `alert-rule-refund-retries.json` — Example Grafana alert rule that fires a CRITICAL alert when the global number of refund retries increases by more than 5 within 5 minutes.

How to import the dashboard
1. In Grafana, go to Dashboards → Manage → Import.
2. Paste the contents of `router-refund-dashboard.json` or upload the file.
3. Set the Prometheus datasource and save.

How to add the alert rule
1. Import `alert-rule-refund-retries.json` via Grafana's Alerting → Notification policies / Alert rules (import UI depends on Grafana version).
2. Ensure the rule uses Prometheus as the datasource and that `router_refund_retries_total` metric is being scraped from the Router API's `/metrics` endpoint.
3. Configure the rule to send to your Ops notification channel (Discord webhook configured in AlertingService) or other destinations.

Recommended thresholds
- Triage threshold: > 3 retries (warning)
- Critical threshold: > 5 retries across all jobs in the last 5 minutes

Runbook pointer
When the rule fires:
1. Check the Router API logs and `router-api/logs/refunds.jsonl` for refund attempts/status.
2. Check Prometheus metrics (/metrics) for spikes in `router_refund_retries_total` and `router_refund_alerts_total`.
3. Verify Solana RPC connectivity and devnet/localnet health. If RPC unavailable, escalate to blockchain infra team.
