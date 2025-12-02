# NeuroSwarm Alert Sink

Simple Express service that accepts alert payloads (Prometheus/Grafana style) and forwards formatted messages to a Discord webhook. This is a lightweight alert sink intended for staging/testing and as a blueprint for production integrations.

Config (env)
- DISCORD_WORKFLOW_WEBHOOK — Discord incoming webhook URL for the alert channel (required for delivery)
- PORT — Optional port (default 3010)
- APP_NAME — Optional display name used in messages
- GRAFANA_LINK — Optional link used as runbook fallback
 - GOOGLE_APPLICATION_CREDENTIALS — Path to a GCP service account JSON file for Firestore access (optional)
 - SERVICE_ACCOUNT_JSON — Inline GCP service account JSON to use instead of a file (optional; useful for CI)

Run (dev)

```powershell
cd neuroswarm/alert-sink
pnpm install
$env:DISCORD_WORKFLOW_WEBHOOK='https://discord.com/api/webhooks/...'
pnpm dev
# POST alerts to http://localhost:3010/webhook/alerts
```

Test

```powershell
pnpm -C neuroswarm/alert-sink test

Firestore tests

To run the Firestore integration test you must provide credentials via either `GOOGLE_APPLICATION_CREDENTIALS` (path) or `SERVICE_ACCOUNT_JSON` (inline JSON). When credentials aren’t present the Firestore integration tests are skipped.
```

Notes
- For production use, integrate with secure credentials and a message delivery / retry layer. Consider adding throttling and deduplication there (T20), and hooking a proper runbook / incident management integration (PagerDuty) for escalation.
