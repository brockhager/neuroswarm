#!/usr/bin/env bash
set -euo pipefail
# Run script for VP node (Linux/macOS)
echo "Starting VP node..."
cd "$(dirname "$0")"
export PORT=${PORT:-4000}
export NS_NODE_URL=${NS_NODE_URL:-http://127.0.0.1:3000}
node ../scripts/verifyEntry.mjs server.js vp || exit 2
node server.js --status
