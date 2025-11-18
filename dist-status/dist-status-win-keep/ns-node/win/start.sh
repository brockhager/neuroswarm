#!/usr/bin/env bash
export PORT=3000
export NS_NODE_URL=http://localhost:3000
export NS_CHECK_EXIT_ON_FAIL=false
export STATUS=1

# Run node in the foreground so logs stream to this shell
node "$(dirname "$0")/server.js" "$@"
EXIT_CODE=$?
if [ $EXIT_CODE -ne 0 ]; then
  echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] ns-node exited with code $EXIT_CODE"
  read -n 1 -s -r -p "Press any key to close..."; echo
fi

