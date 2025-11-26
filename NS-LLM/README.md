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
