# Monitoring — NeuroSwarm

This folder contains monitoring artifacts for the NeuroSwarm stack: Grafana dashboards and Prometheus alert rules for sync/VP/NS monitoring.

Contents:
- grafana/sync-monitoring-dashboard.json — Grafana dashboard JSON for sync health: request rate, rejections, inflight count, ancestry mismatch rate, error stats.
- prometheus/rules/sync-alerts.yml — Prometheus alert rules for sync anomalies (ancestry mismatches, persistent 429s, request errors, inflight backlog, node down).

How to use / import:
- Grafana: Import the JSON file in Grafana UI (Dashboard → Import → Upload JSON). Set the Prometheus data source.
- Prometheus:
  - Copy `sync-alerts.yml` into your `prometheus/rules` folder and reference it from `prometheus.yml` using `rule_files:`.
  - Reload Prometheus or restart the server.

CI / Test guidance:
- The alert rules can be smoke-tested by generating synthetic metrics against Prometheus (pushgateway or a test harness) in a staging environment.
- Consider adding a CI job to validate the YAML syntax and run an alert manager smoke test.

CI smoke test (recommended):
- Add a lightweight validation step in CI that runs `node monitoring/scripts/validate-sync-alerts.mjs` to ensure required fields are present and syntactically valid before merging.
- Optionally run a small Prometheus/Alertmanager integration job in staging that generates synthetic metrics and verifies alerts fire via the test route.

Notes:
- Thresholds are conservative and should be tuned on staging during load tests.
- Use alertmanager routes to notify appropriate on-call teams (ops) and to avoid noisy escalation during maintenance windows.
