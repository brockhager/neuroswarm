#!/usr/bin/env bash
# Simple E2E runner for router-api using docker-compose.test.yml
set -euo pipefail

ROOT_DIR=$(cd "$(dirname "$0")" && pwd)
COMPOSE_FILE="$ROOT_DIR/docker-compose.test.yml"

echo "[E2E] Starting E2E environment using $COMPOSE_FILE"

# Step A: Start only the Postgres DB first
docker compose -f "$COMPOSE_FILE" up -d --build db

echo "[E2E] Waiting for Postgres to be healthy (pg_isready)"
for i in {1..60}; do
  if docker compose -f "$COMPOSE_FILE" exec -T db pg_isready -U neuroswarm_user -d neuroswarm_router_db_test >/dev/null 2>&1; then
    echo "[E2E] Postgres is healthy"
    break
  fi
  echo "[E2E] waiting for Postgres... ($i)"
  sleep 1
done

echo "[E2E] Applying DB migrations (if needed)"
# Execute migration file from inside the container. File is mounted at /docker-entrypoint-initdb.d
MIGRATION_FILE_REL="/docker-entrypoint-initdb.d/001_add_refund_persistence.sql"
docker compose -f "$COMPOSE_FILE" exec -T db sh -c "psql -U neuroswarm_user -d neuroswarm_router_db_test -f ${MIGRATION_FILE_REL} || true"

# Step B: Start the router-api service after migrations applied
docker compose -f "$COMPOSE_FILE" up -d --build router-api

echo "[E2E] Waiting for router-api to be healthy (http://localhost:3000/health)"
for i in {1..60}; do
  if curl -sf http://localhost:3000/health >/dev/null 2>&1; then
    echo "[E2E] router-api is healthy"
    break
  fi
  echo "[E2E] waiting... ($i)"
  sleep 2
done

echo "[E2E] Running E2E tests (jest)
";
pnpm -C "$ROOT_DIR" test:e2e

EXIT_CODE=$?

echo "[E2E] Tearing down environment"
docker compose -f "$COMPOSE_FILE" down -v

exit $EXIT_CODE
