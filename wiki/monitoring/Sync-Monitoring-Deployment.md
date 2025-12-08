# Sync Monitoring — Deployment & Integration Guide

This guide explains how to deploy the Sync Monitoring dashboard and alert rules for production/staging Prometheus + Grafana.

## Files added in repo
- `monitoring/grafana/sync-monitoring-dashboard.json` — Grafana dashboard JSON
- `monitoring/prometheus/rules/sync-alerts.yml` — Prometheus alert rules for sync anomalies
- `monitoring/scripts/validate-sync-alerts.mjs` — lightweight CI validator for the rules YAML

## Grafana — Import the dashboard
1. Open Grafana → Dashboards → Import → Upload `sync-monitoring-dashboard.json`.
2. Set the Prometheus data source when prompted.
3. Pin panels you want on the SRE home board.

## Prometheus — Configure rules
1. Place `sync-alerts.yml` in your Prometheus `rules` directory (e.g., `/etc/prometheus/rules/` or project-specific rules dir).
2. Add the file to `prometheus.yml` rule_files: section:

```yaml
rule_files:
  - 'rules/sync-alerts.yml'
  # other rule files
```

3. Reload Prometheus or restart the service.

## Alertmanager — Routes and receivers
- Configure routes in Alertmanager to deliver alerts to the correct on-call team. Example route labels: `team: ops`, `severity: critical`.
- Use silences for maintenance windows to avoid noisy alerts during deployments or known windows.

## CI — Validate rules before merging
- Add a CI step to run `node monitoring/scripts/validate-sync-alerts.mjs` to validate the basic structure of the rule file.
- Optionally create a staging job which posts synthetic metrics to Prometheus then verifies that the alert evaluates as expected via Alertmanager's test/receiver.

## Staging tuning & load testing
- Tune thresholds on staging with production-like traffic during a short load window before setting thresholds as `critical`.
- Focus on ancestry mismatch and 429s first; those are the most important early indicators for sync health.

## Notes & Follow-ups
- Dashboard thresholds and visual styles are intentionally conservative; adjust after real-world load tests.
- Add unit/integration tests for alert firing simulation if you adopt a Prometheus test harness in CI.
- Consider a Grafana provisioning config for automated dashboard deployment for production overlays.
