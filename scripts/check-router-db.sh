#!/usr/bin/env bash
set -euo pipefail

URL="http://localhost:3000/health"

echo "Checking router-api health endpoint: $URL"

if curl -sf "$URL" >/dev/null 2>&1; then
  echo "router-api is responding. If you still see DB errors check logs for Postgres connectivity."
  exit 0
else
  echo "router-api did not respond on $URL — checking for common DB misconfig (Postgres)"

  echo "1) Check if a local Postgres is running on 5432:"
  if nc -z 127.0.0.1 5432 >/dev/null 2>&1; then
    echo "  - Postgres listening on 127.0.0.1:5432"
  else
    echo "  - No Postgres on 127.0.0.1:5432"
  fi

  echo "2) Check if our test Postgres container (router-api/docker-compose.test.yml) is running on host:5433"
  if nc -z 127.0.0.1 5433 >/dev/null 2>&1; then
    echo "  - Test Postgres appears to be listening on 127.0.0.1:5433"
  else
    echo "  - No test Postgres on 127.0.0.1:5433 — start it with:"
    echo "      docker compose -f router-api/docker-compose.test.yml up -d --build db"
  fi

  echo "3) If you're running local dev (ts-node) ensure DATABASE_URL is set, e.g.:"
  echo "      set DATABASE_URL=postgres://neuroswarm_user:neuroswarm_password@localhost:5433/neuroswarm_router_db_test"

  exit 1
fi
