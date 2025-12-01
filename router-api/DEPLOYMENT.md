# Router API — CI Migration & Deployment Guide

This document explains how CI can apply DB migrations automatically and what secrets / configuration are required for safe deployment.

1) What the workflow does

- The GitHub Actions workflow `.github/workflows/router-api-apply-migration.yml` runs on pushes to `main` affecting `router-api/**` and `router-api/migrations/**`.
- It executes the SQL migration `router-api/migrations/001_add_refund_persistence.sql` against the target database using the psql client.

2) Required repository secrets (set in GitHub > Settings > Secrets):

- `STAGING_PG_HOST` — host for staging Postgres (or production DB for prod workflow)
- `STAGING_PG_PORT` — Postgres port (usually 5432)
- `STAGING_PG_USER` — username with migration privileges
- `STAGING_PG_PASSWORD` — password for the user
- `STAGING_PG_DATABASE` — database name where the `jobs` table exists

3) How to trigger migration manually

- From GitHub UI: go to Actions → Router API - Apply Schema Migration → Run workflow (workflow_dispatch)
- From CLI (requires gh CLI and auth):
  gh workflow run router-api-apply-migration.yml --ref main

4) Recommended sequence for deployment in CI/CD

1. Run migration workflow (above). This guarantees the schema is up-to-date in staging/prod.
2. Deploy the Router API service (containers/pkgs) that depends on the updated schema.
3. Run E2E tests / smoke tests after deployment.

5) Safety / Rollback

- The migration script included in repo is idempotent with checks — safe to run multiple times.
- For complex schema changes, prefer multi-step migrations with application compatibility (add columns as nullable/optional, backfill, deploy app code, then make columns mandatory).
