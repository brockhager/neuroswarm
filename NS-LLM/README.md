# NS-LLM Prototype (neuroswarm/NS-LLM)

This folder contains the prototyping app for Phase A (Embedding backend) used for local development and integration testing.

Quick start

1. Run the prototype server:

```powershell
cd neuroswarm/NS-LLM
node index.js
```

2. Run the integration checks (from this folder):

```powershell
node test-integration.js
```

3. Run the client integration checks:

```powershell
node test-client.js
```

Notes
- This is a prototype only — final implementation will be a native ONNX runtime binary.
- The prototype binds to 127.0.0.1:5555 by default and returns deterministic pseudo-embeddings useful for tests.

Native scaffold & shim

- `native/` contains a C++ scaffold with `CMakeLists.txt` and a `--stub` mode so CI can build and run the binary without ONNX runtime immediately.
- `native-shim.js` will attempt to spawn the native binary and talk via a line-oriented JSON protocol. If the binary is not present it safely falls back to the HTTP prototype.

Model packaging placeholders

- `models/manifest.example.json` and `models/checksums.example.txt` are example formats for packaged models.
- `compute-checksums.js` will compute SHA256 checksums for files under `models/` and write `models/checksums.txt` (used by packaging/CI pipelines).

Native build with ONNX Runtime

If you want to build the native binary with ONNX Runtime inference enabled set `ONNXRUNTIME_DIR` to a directory containing ONNX Runtime headers and libs before running CMake. See `native/README.md` and `wiki/NS-LLM/Phase-A-Embedding-Backend.md` for exact build commands and examples.

Testing & benchmarks

- To run the quick client integration test:

```powershell
node test-client.js
```

- To run a fast benchmark (default 200 requests):

```powershell
node benchmark.js
```

You can override the number of requests with the environment variable N, e.g. `$env:N=500; node benchmark.js` on PowerShell.

## 🔍 Health Check

To verify the NS‑LLM server locally or in CI, use the portable Node‑based test harness:

```bash
npm run test-health
```

This will:

- Start the server (`index.js`) in the background
- Poll GET /health until success or timeout
- Print server logs to the console
- Stop the server cleanly

Notes
- Works cross‑platform (Linux, macOS, Windows)
- CI workflow `ns-llm-health-check.yml` runs this command on all OS runners
- PowerShell helpers (`start-server.ps1`, `stop-server.ps1`, `test-health.ps1`) remain available for contributors who prefer them

## 🚀 Contributor Quick Start

A short, copy-pasteable set of commands to get a development environment up and running and to run the health check locally.

1) Install (from the NS-LLM folder)

PowerShell / Windows:
```powershell
cd neuroswarm\NS-LLM
npm ci
```

macOS / Linux:
```bash
cd neuroswarm/NS-LLM
npm ci
```

2) Start the server (foreground)

PowerShell / Windows:
```powershell
node index.js
```

macOS / Linux:
```bash
node index.js
```

3) Run the cross-platform health test (same command CI uses)

```bash
npm run test-health
```

The test harness will:
- Start the server in a child process
- Poll GET /health until success or timeout
- Print server logs to stdout/stderr
- Stop the server cleanly

4) Optional: Start/stop helpers (PowerShell)

```powershell
.\build\start-server.ps1  # background start
.\build\stop-server.ps1   # stop
.\build\test-health.ps1   # powershell-based check
```

5) Quick troubleshooting

- If `npm run test-health` fails with `EADDRINUSE` it means a different process is listening on port 5555 — free the port or set a different PORT before starting:

PowerShell:
```powershell
Stop-Process -Id <pid> -Force
# or set PORT and restart
$env:PORT=5566; node index.js
```

macOS / Linux:
```bash
sudo lsof -i :5555
kill <pid>
PORT=5566 node index.js
```

That's it — this will let new contributors run the same health check locally and gives CI a single, portable command to run across platforms.

