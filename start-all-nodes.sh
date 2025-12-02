#!/usr/bin/env bash
set -u

echo "Starting NeuroSwarm network (POSIX shell)..."

ROOT_DIR=$(dirname "$(readlink -f "$0")")
cd "$ROOT_DIR" || exit 1

open_url() {
  URL=$1
  if command -v xdg-open >/dev/null 2>&1; then
    xdg-open "$URL" >/dev/null 2>&1 || true
  elif command -v open >/dev/null 2>&1; then
    open "$URL" >/dev/null 2>&1 || true
  else
    echo "Open $URL in a browser to view it"
  fi
}

# IPFS
echo "[1/10] Checking for IPFS daemon..."
if command -v ipfs >/dev/null 2>&1; then
  echo "IPFS found — starting daemon (background)..."
  ipfs daemon >/tmp/ns-ipfs.log 2>&1 &
  sleep 2
else
  echo "WARNING: IPFS not found — skipping. Install ipfs for payload storage."
fi

# Ollama (optional)
echo "[2/10] Checking for Ollama..."
if command -v ollama >/dev/null 2>&1; then
  echo "Ollama found — ensuring server is running..."
  if ss -ltn | grep -q ':11434'; then
    echo "Ollama appears to be running"
  else
    echo "Starting Ollama server (background)..."
    ollama serve >/tmp/ns-ollama.log 2>&1 &
    sleep 2
  fi
else
  echo "Ollama not found — AI features disabled"
fi

echo "[3/10] Starting NS-LLM (port 3006)"
cd "$ROOT_DIR/NS-LLM" && npm start >/tmp/ns-ns-llm.log 2>&1 &
sleep 2

echo "[4/10] Starting Router API (port 4001)"
cd "$ROOT_DIR/router-api" && npm start >/tmp/ns-router-api.log 2>&1 &
sleep 2

echo "[5/10] Starting NS Node (port 3009)"
cd "$ROOT_DIR/ns-node" && PORT=3009 node server.js >/tmp/ns-node.log 2>&1 &
sleep 1

echo "[6/10] Starting Gateway Node (port 8080)"
cd "$ROOT_DIR/gateway-node" && PORT=8080 NS_NODE_URL=http://localhost:3009 node server.js >/tmp/gateway-node.log 2>&1 &
sleep 1

echo "[7/10] Starting VP Node (port 4000)"
cd "$ROOT_DIR/vp-node" && PORT=4000 NS_NODE_URL=http://localhost:3009 node server.js >/tmp/vp-node.log 2>&1 &
sleep 1

echo "[8/10] Starting neuro-services (port 3007)"
cd "$ROOT_DIR/../neuro-services" && PORT=3007 NS_NODE_URL=http://localhost:3009 RUNNER_URL=http://localhost:3008 npm run dev >/tmp/neuro-services.log 2>&1 &
sleep 2

echo "[9/10] Starting neuro-runner (port 3008)"
cd "$ROOT_DIR/../neuro-runner" && PORT=3008 NS_NODE_URL=http://localhost:3009 npm run dev >/tmp/neuro-runner.log 2>&1 &
sleep 2

echo "[9.5/10] Starting alert-sink (port 3010)"
cd "$ROOT_DIR/alert-sink" && PORT=3010 npm start >/tmp/alert-sink.log 2>&1 &
sleep 1

echo "[10/10] Starting neuro-web (port 3005)"
cd "$ROOT_DIR/../neuro-web" && npm run dev -- -p 3005 >/tmp/neuro-web.log 2>&1 &
sleep 2

echo "Starting lightweight dashboard server (http port 8000)"
cd "$ROOT_DIR" && node scripts/start-dashboard.js 8000 >/tmp/dashboard.log 2>&1 &

sleep 2
open_url "http://localhost:3009/"
open_url "http://localhost:3005/control-center"
open_url "http://localhost:3010/"

echo
echo "All services started — logs placed under /tmp (e.g. /tmp/alert-sink.log)"
echo "Control Center: http://localhost:3005/control-center"
echo "Alert Sink:     http://localhost:3010/"
echo "Monitor Dashboard: http://localhost:8000/monitor-dashboard.html"
