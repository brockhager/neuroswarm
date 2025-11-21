#!/usr/bin/env bash
set -euo pipefail

echo "[learning] $(date -Is) Refreshing adapter selection..."
pnpm exec tsx neuro-learning/train-adapter-selection.ts "$@"

echo "[learning] $(date -Is) Refreshing response synthesis playbook..."
pnpm exec tsx neuro-learning/train-response-synthesis.ts "$@"

echo "[learning] $(date -Is) Triggering learning service reload..."
curl -s -X POST ${LEARNING_SERVICE_URL:-http://localhost:3007/learning/reload} >/dev/null || true
