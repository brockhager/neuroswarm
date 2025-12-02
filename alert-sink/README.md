# NeuroSwarm Alert Sink

Simple Express service that accepts alert payloads (Prometheus/Grafana style) and forwards formatted messages to a Discord webhook. This is a lightweight alert sink intended for staging/testing and as a blueprint for production integrations.

Config (env)
- DISCORD_WORKFLOW_WEBHOOK — Discord incoming webhook URL for the alert channel (required for delivery)
- PORT — Optional port (default 3010)
- APP_NAME — Optional display name used in messages
- GRAFANA_LINK — Optional link used as runbook fallback

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
```

Notes
- For production use, integrate with secure credentials and a message delivery / retry layer. Consider adding throttling and deduplication there (T20), and hooking a proper runbook / incident management integration (PagerDuty) for escalation.
