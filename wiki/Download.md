# Downloads

This page provides clear, copy‑paste friendly download links for official release artifacts across platforms and guidance for verifying downloads and maintaining the links.

## Official Releases

We publish pre-built installers / release artifacts on GitHub Releases under the `neuroswarm` project.

Canonical release page:

- https://github.com/brockhager/neuroswarm/releases

Quick access (latest release asset helper):

- Latest ns-node (Linux): https://github.com/brockhager/neuroswarm/releases/latest/download/ns-node-linux-x64.tar.gz
- Latest ns-node (macOS): https://github.com/brockhager/neuroswarm/releases/latest/download/ns-node-macos-x64.tar.gz
-- Latest ns-node (Windows): https://github.com/brockhager/neuroswarm/releases/latest/download/ns-node-win-x64.zip (or `.exe` when provided by the release)

- Latest gateway-node (Linux): https://github.com/brockhager/neuroswarm/releases/latest/download/gateway-node-linux-x64.tar.gz
- Latest gateway-node (macOS): https://github.com/brockhager/neuroswarm/releases/latest/download/gateway-node-macos-x64.tar.gz
-- Latest gateway-node (Windows): https://github.com/brockhager/neuroswarm/releases/latest/download/gateway-node-win-x64.zip (or `.exe` when provided by the release)

- Latest vp-node (Linux): https://github.com/brockhager/neuroswarm/releases/latest/download/vp-node-linux-x64.tar.gz
- Latest vp-node (macOS): https://github.com/brockhager/neuroswarm/releases/latest/download/vp-node-macos-x64.tar.gz
-- Latest vp-node (Windows): https://github.com/brockhager/neuroswarm/releases/latest/download/vp-node-win-x64.zip (or `.exe` when provided by the release)

Note: The `latest` URL uses the redirect to the most recent release tag. If you need to pin a version, replace `latest` with `vX.Y.Z` in the URL (e.g., `https://github.com/brockhager/neuroswarm/releases/download/v0.1.0/ns-node-linux-x64.tar.gz`).

---

## Platform-Specific Examples

Linux/macOS (bash):

```bash
# Download the latest Linux ns-node
curl -LO https://github.com/brockhager/neuroswarm/releases/latest/download/ns-node-linux-x64.tar.gz
tar -xzf ns-node-linux-x64.tar.gz
cd ns-node
# Start the node (example)
PORT=3000 ./start.sh

---

## Run scripts included in ZIP downloads

All release ZIPs include `run-*.bat` and `run-*.sh` files for immediate use after extraction. Windows users can run `run-*.bat` (or `start-windows.bat`), and Linux/macOS users can run `./run-*.sh` (make executable with `chmod +x`). These scripts point at `server.js` and include `--status` by default in the start helpers.

Example expected startup log messages:

```
[GW][2025-11-18T18:47:00.000Z] Gateway node started, listening on port 8080
[NS][2025-11-18T18:47:00.100Z] NS node started, verifying blocks
[VP][2025-11-18T18:47:00.150Z] VP node started, producing blocks
```
```

Windows (PowerShell):

```powershell
# Download the latest Windows gateway binary
Invoke-WebRequest -Uri https://github.com/brockhager/neuroswarm/releases/latest/download/gateway-node-win-x64.zip -OutFile gateway-node-win-x64.zip
Expand-Archive gateway-node-win-x64.zip -DestinationPath gateway-node
Set-Location gateway-node
# Start the gateway (example)
start-windows.bat  # Start a new CMD window; this script defaults to --status and keeps the window open for monitoring
```

---

## Verify Downloads (Checksum / Signature)

For releases we include a `checksums.txt` and an optional `checksums.sig` (GPG signature) file in release assets.

Linux / macOS (SHA256):

```bash
curl -LO https://github.com/brockhager/neuroswarm/releases/latest/download/ns-node-linux-x64.tar.gz
curl -LO https://github.com/brockhager/neuroswarm/releases/latest/download/checksums.txt
sha256sum ns-node-linux-x64.tar.gz
grep ns-node-linux-x64.tar.gz checksums.txt
```

Windows (PowerShell SHA256):

```powershell
Invoke-WebRequest -Uri https://github.com/brockhager/neuroswarm/releases/latest/download/ns-node-win-x64.zip -OutFile ns-node-win-x64.zip
Get-FileHash ns-node-win-x64.zip -Algorithm SHA256
# Compare with the checksums.txt published alongside the release
```

### Verify Windows `start-windows.bat` and `--status`

To maintain consistent behaviour across releases, ensure `start-windows.bat` is present in Windows ZIPs and that it defaults to `--status` and opens a cmd window via `cmd /k`. Use PowerShell to extract and inspect the script:

```powershell
Expand-Archive ns-node-win-x64.zip -DestinationPath ns-node
Test-Path ns-node\start-windows.bat
Get-Content ns-node\start-windows.bat | Select-String "--status"
Get-Content ns-node\start-windows.bat | Select-String "cmd /k"
```

Maintainers: CI packaging validation will assert the same checks; ensure those checks continue to pass whenever packaging scripts are modified.

GPG verification (if release signatures present):

```bash
curl -LO https://github.com/brockhager/neuroswarm/releases/latest/download/checksums.txt
curl -LO https://github.com/brockhager/neuroswarm/releases/latest/download/checksums.sig
gpg --verify checksums.sig checksums.txt
```

If GPG verification passes you also confirm the checksums are intact and the release author signed them.

---

## Release Asset Naming Conventions

We publish platform-specific artifacts with the following naming convention in our release assets. This is required by the download links above and by our packaging scripts:

- `ns-node-<os>-<arch>.tar.gz` or `.zip` (e.g., `ns-node-linux-x64.tar.gz`)
- `gateway-node-<os>-<arch>.tar.gz` or `.zip`
- `vp-node-<os>-<arch>.tar.gz` or `.zip`
- `checksums.txt` — SHA256 checksums of the artifacts
- `checksums.sig` — (Optional) GPG signature of `checksums.txt`

---

## How to Maintain / Update Downloads

Maintainers: keep these links accurate and current by following the release checklist below.

When publishing a new release:
1. Create a release tag `vX.Y.Z` and push it.
2. Run packaging/build for all platforms via CI (`neuroswarm/.github/workflows/build-release-installers.yml`).
3. Upload release assets using the naming convention above.
4. Generate `checksums.txt` (sha256) and upload it to the release.
5. If signing (recommended): sign `checksums.txt` and upload `checksums.sig`.
6. Update `docs/download.md` (if you want to link to versioned assets) or rely on `latest` redirect above.
7. Confirm Windows ZIP artifacts contain `start-windows.bat` that uses `cmd /k` and includes `--status` by default.
8. Run the wiki publish workflow (repo `Publish Wiki Now`) or run `neuroswarm/publish-wiki-now.bat` to sync docs to the GitHub wiki.

---

## Release Checklist (summary)

1. Bump release tag `vX.Y.Z`.
2. CI artifacts built for Linux, macOS, Windows (x64/x86_64) per node.
3. Generate checksums and (optional) GPG signature for `checksums.txt`.
4. Upload all artifacts to the GitHub release.
5. Confirm artifacts download and sha256 checksum locally.
6. Push or dispatch `Publish Wiki Now` workflow to update the wiki pages.

---

If you want a script to compute checksums and auto-populate `checksums.txt`, ask and I can add an example script to the `neuroswarm/scripts/` folder.

If you'd like to pin specific versioned links to be shown on the wiki, maintainers can add a small table below linking specific `vX.Y.Z` assets. For simplicity, the `latest` URL is used above and resolves to the most recent tag.

---

## Release Checklist (maintainers)

Before publishing a new release, follow this checklist:

1. Create and push the new annotated tag `vX.Y.Z`.
2. Run `pnpm -C neuroswarm package:bins -- --os <platform>` and verify outputs in `neuroswarm/dist`.
3. Upload release assets with proper names (e.g., `ns-node-linux-x64.tar.gz`, `checksums.txt`, `checksums.sig`).
4. Generate `checksums.txt` with sha256 sums and sign it if using GPG; upload to the release.
5. Update `docs/download.md` with `vX.Y.Z` links when you want to pin versioned assets (optional); otherwise rely on `latest` redirects.
6. Run `neuroswarm/publish-wiki-now.bat --local` or dispatch `Publish Wiki Now` via GH Actions to update the wiki.
7. Verify the wiki `Download` page lists the new release and the checksums/signatures are present.

If you want automation for step 5, add a small CI job that updates `docs/download.md` with a pinned `vX.Y.Z` table and triggers the publish workflow.

If you'd like me to populate the exact `vX.Y.Z` links for the most recent release automatically, I can add a script to compute and inject the latest tag automatically into the wiki during CI publishing.