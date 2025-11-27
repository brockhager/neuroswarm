# Internal announcement — Phase A: NS‑LLM embedding backend production ready

Date: 2025-11-25

We have validated the NS‑LLM native artifacts across Ubuntu/macOS/Windows in CI with strict shape and numeric checks.

Highlights:
- Native binaries built and tested on all major desktop OSes.
- CI enforces strict embedding shapes and numeric ranges to prevent regressions.
- Checksums & manifest are uploaded with artifacts; signing is supported via CI secrets.

You can download artifacts from the CI run or from the release (artifact publishing is available via the workflow).

Next: Start Phase B (generative backend) with confidence that embedding runtime is production-ready.
