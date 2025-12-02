# NS-LLM Native Backend (scaffold)

This folder contains a scaffold for a native ONNX Runtime based backend binary.

Design notes
- The native binary will implement a small stdio/CLI protocol for embeddings and health so the Node orchestrator can talk to it via stdio. This keeps the binary minimal (no HTTP server inside) and easy to wrap.
- Commands: `health`, `embed` (stdin JSON -> stdout JSON), `metrics`.
- The scaffold supports `--stub` mode (deterministic embeddings like the Node prototype) so CI and integration tests can run without a real model.

Files
- src/main.cpp  — C++ scaffold that reads JSON over stdin and writes JSON to stdout
- CMakeLists.txt — CMake project to build the binary
- build.sh / build.bat — helper build scripts for Linux/Mac and Windows

Build (example)
- You will need ONNX Runtime dev libs to build the full runtime-enabled binary. The scaffold builds in `--stub` mode without ONNX dependency so you can run tests immediately.

Linux / macOS (example)
```bash
mkdir build && cd build
cmake .. -DPROTOTYPE_ONLY=ON
cmake --build . --config Release
./ns-llm-native --stub
```

Windows (PowerShell)
```powershell
.\build.bat
ns-llm-native.exe --stub
```

Next steps
- Implement actual ONNX inference path when we add model assets and the runtime libs.
- Hook stdio binary into `ns-llm-client.js` via the shim.
