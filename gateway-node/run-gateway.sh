#!/usr/bin/env bash
set -euo pipefail
# Run script for Gateway node (Linux/macOS)
echo "Starting Gateway node..."
cd "$(dirname "$0")"
export PORT=${PORT:-8080}
export NS_NODE_URL=${NS_NODE_URL:-http://127.0.0.1:3000}
node server.js --status
