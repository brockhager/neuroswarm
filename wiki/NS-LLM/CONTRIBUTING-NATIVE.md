# Contributing: Running & Testing native NS‑LLM artifacts

This document explains how to download and run the native NS‑LLM artifacts we produce in CI and verify they work on your platform.

Supported platforms: Ubuntu (x64), macOS (x64/arm64), Windows (x64). Artifacts appear in the CI build job as:

- `ns-llm-native-ubuntu-latest-v<VERSION>` (tarball / build dir)
- `ns-llm-native-macos-latest-v<VERSION>` (tarball / build dir)
- `ns-llm-native-windows-latest-v<VERSION>` (zip / build dir)

Where to get them
- From GitHub Actions: artifacts are uploaded by the build job and can be downloaded via the Actions UI.
- Alternatively: CI can be configured to attach artifacts to a GitHub Release — check the release notes for download links.

Quick usage

Ubuntu (tarball containing `ns-llm-native`):

```bash
# extract
tar -xzf ns-llm-native-ubuntu-latest.tgz
cd native/build
# run in stub mode (works without ONNX runtime)
./ns-llm-native --stub
```

macOS (tarball):

```bash
tar -xzf ns-llm-native-macos-latest.tgz
cd native/build
./ns-llm-native --stub
```

Windows (zip):

```powershell
Expand-Archive ns-llm-native-windows-latest.zip -DestinationPath .\native\build
Set-Location native\build
.\ns-llm-native.exe --stub
```

Running alongside NS Node
1. Start the native backend (as above) so it listens on stdio.
2. Start `ns-node` normally (`node server.js`) — the `native-shim` will detect the binary and use it automatically.

Verifying: After startup, check the /health endpoints:

```bash
curl http://127.0.0.1:5555/health   # ns-llm backend
curl http://127.0.0.1:3009/health   # ns-node which should include nsLlm in /health
```

If you find issues while booting the native binary, consult the `native/build` `stdout` logs and open an issue describing your OS, CPU architecture, and the native logs attached.

Security / signatures
- CI uploads `checksums.txt` and `manifest.json` with each artifact. When a `GPG_PRIVATE_KEY` is provided via GitHub Secrets we also sign `checksums.txt` and upload `checksums.txt.sig` (use `gpg --verify checksums.txt.sig checksums.txt` to verify locally).

Release process
---------------
The CI can automatically publish validated native artifacts as GitHub Releases when you push a semver-style tag (e.g. `v0.1.2`) or manually via workflow dispatch. To publish artifacts and signed checksums make sure the following repository secrets are set by a repo admin:

- `GPG_PRIVATE_KEY` — ASCII-armored private key used to sign `checksums.txt`.
- `GPG_PASSPHRASE` — passphrase for the private key (if any).
- Optionally `PUBLISH_ARTIFACTS=1` can be used as an env/secret to explicitly trigger publish flows; CI will also publish automatically on tag push.

When a release is published CI will:

1. Build native artifacts for all platforms (Ubuntu/macOS/Windows).
2. Compute `checksums.txt` and `manifest.json` for the artifact contents.
3. Sign `checksums.txt` producing `checksums.txt.sig` (if `GPG_PRIVATE_KEY` is present).
4. Create a GitHub Release with the tag name (the workflow uses `${{ github.ref_name }}` when triggered by a tag) and attach the artifact builds and metadata files. All artifacts are versioned using the repository `version-id.txt` value and are named with `-v<VERSION>` so each release is self-describing.

Version bumping
----------------
Before creating a release tag please bump the repository `version-id.txt` file at the repo root (e.g. `0.1.9`) so CI and binaries consistently embed the same version string. This single source-of-truth ensures artifact names, logs and runtime version values remain consistent across builds and releases.

Verifying releases locally
-------------------------
After downloading an artifact and its `checksums.txt` + `checksums.txt.sig` you can verify authenticity / integrity locally:

1. Import the public key used to sign the checksums (obtain from the project maintainers or keyserver):

```bash
gpg --import project-maintainers-public-key.asc
```

2. Verify the signature on the checksums file:

```bash
gpg --verify checksums.txt.sig checksums.txt
# should say 'Good signature from "..."' if valid
```

3. Validate a specific binary against the checksums:

```bash
# compute sha256 locally
sha256sum ns-llm-native
# compare against checksums.txt
grep ns-llm-native checksums.txt
```

If verification fails, do not use the artifact — reach out to the project maintainers for assistance.

Thanks for helping validate native artifacts — your tests ensure Phase A remains production-grade across platforms.
