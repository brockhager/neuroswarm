# Router API Deployment & Verification Runbook (v1.0)

Last updated: 2025-12-01

Purpose
-------
This runbook documents the deployment and post-deployment verification steps for the NeuroSwarm Router API in staging and production. It standardizes schema migration procedures, service rollout steps, and verification checks so Ops can deploy safely and validate the service and observability pipeline.

Target: Router API Service + PostgreSQL Schema + Observability (Prometheus / Grafana)

Prerequisites
-------------
- Elevated DB credentials (PGUSER, PGPASSWORD) with ALTER TABLE privileges on the target DB.
- psql (Postgres CLI) installed on the runner machine (host / CI agent) and on PATH.
- DISCORD/SLACK webhook secrets configured in target environment (if using alert delivery): DISCORD_WORKFLOW_WEBHOOK, DISCORD_REPORT_WEBHOOK, SLACK_ALERT_WEBHOOK.
- A healthy CI job that runs the E2E pipeline including `run-migrations.*` (this ensures migrations are tested against a disposable Postgres instance before deploy).

High-level Rules
----------------
1) Migrations MUST be applied before the new Router API container is rolled out. Altering schema after deployment may result in runtime errors.
2) Always run migrations using the standardized runners in `router-api/migrations/` to keep CI/local parity.
3) Verify observability (metrics + Grafana alerts) immediately after deployment.

Quick references
----------------
- Migrations folder: `router-api/migrations/`
- Migration runners: `router-api/migrations/run-migrations.sh` (Linux/CI/macOS), `router-api/migrations/run-migrations.ps1` (Windows)
- E2E runner scripts (updated to use the migration runners): `router-api/e2e-test.sh`, `router-api/e2e-test.ps1`
- Grafana dashboard + alert rule assets: `router-api/grafana/`

I. Readiness checklist (Ops lead)
---------------------------------
Complete these checks before applying migrations or deploying containers:

- [ ] Latest code merged into `main` (includes migration SQL and the migration runners).
- [ ] E2E CI succeeded (this includes running migrations in CI via `run-migrations.sh`).
- [ ] Target environment secrets configured: DISCORD_WORKFLOW_WEBHOOK, DISCORD_REPORT_WEBHOOK, SLACK_ALERT_WEBHOOK (as applicable).
- [ ] DB credentials available (PGHOST, PGPORT, PGUSER, PGPASSWORD, PGDATABASE) for the deployment runner.
- [ ] A rollback / snapshot plan exists (DB backup / dump and retention policy for the target DB).

II. Deployment process (mandatory order)
--------------------------------------
Note: apply DB migration first, then deploy the new container.

Step 1 — Apply database schema migrations
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
Why: The Router API depends on new persistent columns for refunds and reconciliation (refund_retry_count, refund_last_attempt_at, refund_alert_count, refund_last_alert_at). These columns must exist before new code runs.

Runner usage (Linux / CI / macOS)
~~~bash
# set environment variables for the target DB
export PGHOST="<db-host>"
export PGPORT="<db-port>"
export PGUSER="<db-user>"
export PGPASSWORD="<db-password>"
export PGDATABASE="<db-name>"

./router-api/migrations/run-migrations.sh
~~~

Runner usage (Windows PowerShell)
~~~powershell
$env:PGHOST = '<db-host>'
$env:PGPORT = '<db-port>'
$env:PGUSER = '<db-user>'
$env:PGPASSWORD = '<db-password>'
$env:PGDATABASE = '<db-name>'
.\router-api\migrations\run-migrations.ps1
~~~

Verification (terminal)
- Expect the runner output to finish with: "All migrations applied." or "--- All migrations successfully applied ---" depending on runner.
- Double-check the new columns exist:
  psql -h <db-host> -U <db-user> -d <db-name> -c "\d+ jobs" or
  SELECT column_name FROM information_schema.columns WHERE table_name='jobs' AND column_name LIKE 'refund_%';

Step 2 — Deploy Router API container
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
Action: Use your standard rollout method (Kubernetes, ECS, Docker Compose, etc.) to deploy the new router-api image.

Notes:
- Ensure environment variable `DATABASE_URL` in the service points to the updated DB.
- Consider rolling update / canary with 1–2 instances first to validate behavior.

Verification (service health)
- Check logs for any schema-related or startup errors (look for "column does not exist" messages). If you see those, STOP and rollback DB or adjust deployment: this indicates migrations were not applied or the migration did not run correctly.
- Ping health/metrics endpoint:
  curl -f http://<router-api-host>:3000/health
  curl -f http://<router-api-host>:3000/metrics

III. Post-deployment verification (Ops & Dev)
-------------------------------------------
3.1 Observability checks (Prometheus & metrics) — CRITICAL
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
Confirm the new metrics are present and being scraped.

Metric — Expected check — Action if failing
- router_refund_retries_total — Exists and >= 0 — CRITICAL: check router-api logs and metric init code
- router_refund_alerts_total — Exists and >= 0 — CRITICAL: check Prometheus scrape config & /metrics output

Prometheus query examples
~~~promql
# Check counter exists
count(router_refund_retries_total)
rate(router_refund_retries_total[5m])
rate(router_refund_alerts_total[5m])
~~~

If you do not see metrics:
- Check `NODE_ENV` for 'prod' or 'test' behavior that could result in filtered metrics.
- Confirm `prometheus` scrape config covers the target host and correct metrics path (/metrics).

3.2 Grafana configuration and alert verification
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
Import or ensure the Grafana assets are installed (dashboard + alert rule):

- Dashboard: `router-api/grafana/grafana_refund_dashboard.json`
- Alert rule: `router-api/grafana/grafana_alert_rule.json`

Verify:
- The dashboard displays counts and recent job activity.
- The alert rule is enabled and points at the right datasource.

Test alert delivery (simulated):
1) Using Grafana: open the alerting UI, run the alert evaluation manually against a time range or set a test condition to force firing.
2) Confirm that this results in a message to your configured channel (#ops-alerts-critical) via the configured webhook (Discord or Slack).

3.3 Functional (E2E) validation — Verify refund persistence + reconciliation
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
Run a non-destructive test to simulate a job that will fail and produce a refund.

Recommended approach (E2E harness)
1) Run the `router-api` E2E harness (this starts a disposable Postgres, applies migrations and runs tests):

Linux/macOS:
~~~bash
cd router-api
./e2e-test.sh
~~~

Windows PowerShell:
~~~powershell
cd router-api
.\e2e-test.ps1
~~~

2) Alternatively: send a test request to the Router API that will time out or fail and cause a refund path to be triggered (follow your local E2E instructions).

Database checks
- After a simulated failure, query the job:
  SELECT job_id, refund_retry_count, refund_last_attempt_at, refund_tx_signature FROM jobs WHERE job_id = '<TEST_JOB_ID>';
- Expectation: `refund_retry_count` > 0, `refund_last_attempt_at` is set, and if refund attempted successfully `refund_tx_signature` is populated.

Metrics checks
- Confirm `router_refund_retries_total` increments for the test case by running Prometheus query on the time window while the test runs.

IV. Rollback / remediation plan
------------------------------
1) If migration fails mid-run:
  - Stop and do NOT deploy the new Router API image.
  - Restore from DB backup/snapshot or follow the migration's reverse steps if provided.

2) If the Router API crashes due to schema mismatch:
  - Re-deploy the previous Router API image that is compatible with the current DB schema.
  - Investigate migration runner logs to repair partial migration; apply corrective SQL or restore DB from backup.

3) If observability fails (Prometheus/Grafana):
  - Re-check Prometheus scrape config for the router-api service and confirm /metrics is reachable from Prometheus server
  - Ensure Grafana datasource credentials are valid and reload the dashboard.

V. Notes & best practices
-------------------------
- Keep migrations idempotent and small — prefer multiple small and safe changes.
- Always test migrations in CI against an ephemeral Postgres container prior to production.
- Record the migration-run logs and store them in the release artifacts for troubleshooting.

VI. Troubleshooting checklist (quick)
-----------------------------------
- DB connectivity issue: check firewall / VPC rules, confirm PGHOST/PGPORT, and test with psql client.
- Missing column errors: confirm migrations applied successfully and check `information_schema.columns`.
- Alerts not firing: confirm alert rule is enabled, Grafana alerting not muted, webhook properly configured.

Contact & escalation
--------------------
- Primary: NeuroSwarm Backend/Platform on-call
- Secondary: Engineering Pager / Slack #backend-alerts

End of runbook — version 1.0
