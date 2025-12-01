# Migration Runner

This folder contains SQL migration files used by the E2E harness and for manual/CI deployment.

Current migration:
- `001_add_refund_persistence.sql` — Adds `refund_retry_count`, `refund_last_attempt_at`, `refund_alert_count`, `refund_last_alert_at` to the `jobs` table (idempotent).

How to run migrations in CI or locally
1) Use the E2E runner script which automatically mounts migrations in the Postgres container and applies them before starting the Router API.
   - Linux/macOS: From `router-api/` run `./e2e-test.sh` (the script starts DB, waits for it, applies migrations, then starts router-api and runs tests).
   - Windows PowerShell: From `router-api/` run `.
 e2e-test.ps1` (same flow, PS version).

2) Manual application (safe and idempotent):
   psql "postgres://neuroswarm_user:neuroswarm_password@<host>:5432/neuroswarm_router_db_test" -f migrations/001_add_refund_persistence.sql

Notes
- The migration file performs checks against `information_schema` and will only add columns or indices if they do not already exist — safe to re-run in CI or production.
