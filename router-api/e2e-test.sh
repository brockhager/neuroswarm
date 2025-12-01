#!/usr/bin/env bash
# Simple E2E runner for router-api using docker-compose.test.yml
set -euo pipefail

ROOT_DIR=$(cd "$(dirname "$0")" && pwd)
COMPOSE_FILE="$ROOT_DIR/docker-compose.test.yml"

echo "[E2E] Starting E2E environment using $COMPOSE_FILE"
docker compose -f "$COMPOSE_FILE" up -d --build

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
