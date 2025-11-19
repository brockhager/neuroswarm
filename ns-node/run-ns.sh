#!/usr/bin/env bash
set -euo pipefail
# Run script for NS node (Linux/macOS)
echo "Starting NS node..."
cd "$(dirname "$0")"
export PORT=${PORT:-3000}
node ../scripts/verifyEntry.mjs server.js ns || exit 2
node server.js --status
