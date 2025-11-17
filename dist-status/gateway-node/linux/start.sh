#!/usr/bin/env bash
export PORT=8080
export NS_NODE_URL=http://localhost:3000
export NS_CHECK_EXIT_ON_FAIL=false
export STATUS=1

# Run node in the foreground so logs stream to this shell
node "$(dirname "$0")/server.js" "$@"
EXIT_CODE=$?
if [ $EXIT_CODE -ne 0 ]; then
  echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] gateway-node exited with code $EXIT_CODE"
  read -n 1 -s -r -p "Press any key to close..."; echo
fi

# open browser on gateway for convenience; run in background so it doesn't block logs
(
  for i in {1..30}; do
    if curl --silent --fail http://localhost:8080/health; then
      if command -v xdg-open >/dev/null; then
        xdg-open http://localhost:8080 >/dev/null 2>&1 || true
      elif command -v open >/dev/null; then
        open http://localhost:8080 >/dev/null 2>&1 || true
      fi
      break
    fi
    sleep 1
  done
) &

