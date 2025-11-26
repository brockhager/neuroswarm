# Release notes — Phase A: Embedding Backend (Production Ready)

Date: 2025-11-25

Summary
-------

Phase A (embedding backend) is now production-ready. Native artifacts are validated across Ubuntu, macOS and Windows. CI enforces strict embedding checks (shape and numeric-range) for all integration tests and uploads platform artifacts, checksums and manifest metadata.

What CI guarantees
-----------------
- Native artifacts are built for Ubuntu/macOS/Windows and verified in CI.
- E2E: node → ns-node → ns-llm (native/prototype) end-to-end embedding path is exercised.
- Strict validation: `STRICT_EMBED_DIM=1`, `CHECK_EMBED_RANGE=1`, `STRICT_EMBED_RANGE=1` are enforced across integration jobs.
- Artifacts include `checksums.txt` and `manifest.json`. If a GPG signing key is present in CI secrets, checksums are signed as `checksums.txt.sig`.

Artifacts
---------
- Names: `ns-llm-native-ubuntu-latest`, `ns-llm-native-macos-latest`, `ns-llm-native-windows-latest`
- Each artifact can be downloaded from the Actions run (or attached to a release when published).

Notes
-----
This release certifies Phase A and the native packaging + CI integration. Proceed to Phase B (generative backend) with confidence that the embedding runtime is production validated.
