# Downloads

This page provides clear, copy‑paste friendly download links for official release artifacts across platforms and guidance for verifying downloads and maintaining the links.

## Official Releases

We publish pre-built installers / release artifacts on GitHub Releases under the `neuroswarm` project.

Canonical release page:

- https://github.com/brockhager/neuroswarm/releases

Quick access (latest release asset helper):
- Latest ns-node (Linux): https://github.com/brockhager/neuroswarm/releases/latest/download/ns-node-linux-x64.tar.gz
- Latest ns-node (macOS): https://github.com/brockhager/neuroswarm/releases/latest/download/ns-node-macos-x64.tar.gz
- Latest ns-node (Windows): https://github.com/brockhager/neuroswarm/releases/latest/download/ns-node-win-x64.zip
- Latest gateway-node (Windows): https://github.com/brockhager/neuroswarm/releases/latest/download/gateway-node-win-x64.zip
- Latest vp-node (Windows): https://github.com/brockhager/neuroswarm/releases/latest/download/vp-node-win-x64.zip
---

## Platform-Specific Examples
Linux/macOS (bash):

```bash
# Download the latest Linux ns-node
curl -LO https://github.com/brockhager/neuroswarm/releases/latest/download/ns-node-linux-x64.tar.gz
tar -xzf ns-node-linux-x64.tar.gz
cd ns-node
# Start the node (example) — start script included in package
PORT=3000 ./start.sh
```

Windows (PowerShell):

```powershell
# Download the latest Windows gateway binary
Invoke-WebRequest -Uri https://github.com/brockhager/neuroswarm/releases/latest/download/gateway-node-win-x64.zip -OutFile gateway-node-win-x64.zip
Expand-Archive gateway-node-win-x64.zip -DestinationPath gateway-node
Set-Location gateway-node
# Start the gateway (example)
.\start.bat
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

Before publishing a Windows ZIP, confirm the `start-windows.bat` is present and defaults to `--status` and `cmd /k`:

PowerShell example:

```powershell
Expand-Archive ns-node-win-x64.zip -DestinationPath ns-node
Test-Path ns-node\start-windows.bat
Get-Content ns-node\start-windows.bat | Select-String "--status"
Get-Content ns-node\start-windows.bat | Select-String "cmd /k"
```

CI will automatically run the packaging validation job to assert these conditions; if you need to run the same verification locally, use the above PowerShell commands after building artifacts with `pnpm -C neuroswarm package:bins -- --os win`.

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
## How to Maintain / Update Downloads
Maintainers: keep these links accurate and current by following the release checklist below.

When publishing a new release:
1. Create a release tag `vX.Y.Z` and push it.
2. Run packaging/build for all platforms via CI (`neuroswarm/.github/workflows/build-release-installers.yml`).
3. Upload release assets using the naming convention above.
4. Generate `checksums.txt` (sha256) and upload it to the release.
5. If signing (recommended): sign `checksums.txt` and upload `checksums.sig`.
6. Update `docs/download.md` (if you want to link to versioned assets) or rely on `latest` redirect above.
7. Run the wiki publish workflow (repo `Publish Wiki Now`) or run `neuroswarm/publish-wiki-now.bat` to sync docs to the GitHub wiki.

---

## Release Checklist (summary)
1. Bump release tag `vX.Y.Z`.
2. CI artifacts built for Linux, macOS, Windows (x64/x86_64) per node.
3. Generate checksums and (optional) GPG signature for `checksums.txt`.
4. Upload all artifacts to the GitHub release.
5. Confirm artifacts download and sha256 checksum locally.
6. Push or dispatch `Publish Wiki Now` workflow to update the wiki pages.

---

If you want a script to compute checksums and auto-populate `checksums.txt`, I can add an example script to the `neuroswarm/scripts/` folder.
If you'd like to pin specific versioned links to be shown on the wiki, maintainers can add a small table below linking specific `vX.Y.Z` assets. For simplicity, the `latest` URL is used above and resolves to the most recent tag.

***

If you'd like me to populate the exact `vX.Y.Z` links for the most recent release automatically, I can add a script to compute and inject the latest tag automatically into the wiki during CI publishing.
# Downloads

This page provides clear, copy‑paste friendly download links for official release artifacts across platforms and guidance for verifying downloads and maintaining the links.

## Official Releases

We publish pre-built installers / release artifacts on GitHub Releases under the `neuro-infra` project.

Canonical release page:

- https://github.com/brockhager/neuro-infra/releases

Quick access (latest release asset helper):

- Latest ns-node (Linux): https://github.com/brockhager/neuro-infra/releases/latest/download/ns-node-linux-x64.tar.gz
- Latest ns-node (macOS): https://github.com/brockhager/neuro-infra/releases/latest/download/ns-node-macos-x64.tar.gz
- Latest ns-node (Windows): https://github.com/brockhager/neuro-infra/releases/latest/download/ns-node-win-x64.zip

- Latest gateway-node (Linux): https://github.com/brockhager/neuro-infra/releases/latest/download/gateway-node-linux-x64.tar.gz
- Latest gateway-node (macOS): https://github.com/brockhager/neuro-infra/releases/latest/download/gateway-node-macos-x64.tar.gz
- Latest gateway-node (Windows): https://github.com/brockhager/neuro-infra/releases/latest/download/gateway-node-win-x64.zip

- Latest vp-node (Linux): https://github.com/brockhager/neuro-infra/releases/latest/download/vp-node-linux-x64.tar.gz
- Latest vp-node (macOS): https://github.com/brockhager/neuro-infra/releases/latest/download/vp-node-macos-x64.tar.gz
- Latest vp-node (Windows): https://github.com/brockhager/neuro-infra/releases/latest/download/vp-node-win-x64.zip

Note: The `latest` URL uses the redirect to the most recent release tag. If you need to pin a version, replace `latest` with `vX.Y.Z` in the URL (e.g., `https://github.com/brockhager/neuro-infra/releases/download/v0.1.0/ns-node-linux-x64.tar.gz`).

---

## Platform-Specific Examples

Linux/macOS (bash):

```bash
# Download the latest Linux ns-node
curl -LO https://github.com/brockhager/neuro-infra/releases/latest/download/ns-node-linux-x64.tar.gz
tar -xzf ns-node-linux-x64.tar.gz
cd ns-node
We publish pre-built installers / release artifacts on GitHub Releases under the `neuroswarm` project.

Canonical release page:

- https://github.com/brockhager/neuroswarm/releases
PORT=3000 ./start.sh
```

- Latest ns-node (Linux): https://github.com/brockhager/neuroswarm/releases/latest/download/ns-node-linux-x64.tar.gz
- Latest ns-node (macOS): https://github.com/brockhager/neuroswarm/releases/latest/download/ns-node-macos-x64.tar.gz
- Latest ns-node (Windows): https://github.com/brockhager/neuroswarm/releases/latest/download/ns-node-win-x64.zip
# Download the latest Windows gateway binary
- Latest gateway-node (Linux): https://github.com/brockhager/neuroswarm/releases/latest/download/gateway-node-linux-x64.tar.gz
- Latest gateway-node (macOS): https://github.com/brockhager/neuroswarm/releases/latest/download/gateway-node-macos-x64.tar.gz
- Latest gateway-node (Windows): https://github.com/brockhager/neuroswarm/releases/latest/download/gateway-node-win-x64.zip
# Start the gateway (example)
- Latest vp-node (Linux): https://github.com/brockhager/neuroswarm/releases/latest/download/vp-node-linux-x64.tar.gz
- Latest vp-node (macOS): https://github.com/brockhager/neuroswarm/releases/latest/download/vp-node-macos-x64.tar.gz
- Latest vp-node (Windows): https://github.com/brockhager/neuroswarm/releases/latest/download/vp-node-win-x64.zip

---
Note: The `latest` URL uses the redirect to the most recent release tag. If you need to pin a version, replace `latest` with `vX.Y.Z` in the URL (e.g., `https://github.com/brockhager/neuroswarm/releases/download/v0.1.0/ns-node-linux-x64.tar.gz`).

## Verify Downloads (Checksum / Signature)

For releases we include a `checksums.txt` and an optional `checksums.sig` (GPG signature) file in release assets.

Linux / macOS (SHA256):

curl -LO https://github.com/brockhager/neuroswarm/releases/latest/download/ns-node-linux-x64.tar.gz
curl -LO https://github.com/brockhager/neuro-infra/releases/latest/download/ns-node-linux-x64.tar.gz
curl -LO https://github.com/brockhager/neuro-infra/releases/latest/download/checksums.txt
sha256sum ns-node-linux-x64.tar.gz
grep ns-node-linux-x64.tar.gz checksums.txt
```

Windows (PowerShell SHA256):

```powershell
Invoke-WebRequest -Uri https://github.com/brockhager/neuro-infra/releases/latest/download/ns-node-win-x64.zip -OutFile ns-node-win-x64.zip
Invoke-WebRequest -Uri https://github.com/brockhager/neuroswarm/releases/latest/download/gateway-node-win-x64.zip -OutFile gateway-node-win-x64.zip
# Compare with the checksums.txt published alongside the release
```

GPG verification (if release signatures present):

```bash
curl -LO https://github.com/brockhager/neuro-infra/releases/latest/download/checksums.txt
curl -LO https://github.com/brockhager/neuro-infra/releases/latest/download/checksums.sig
gpg --verify checksums.sig checksums.txt
```

If GPG verification passes you also confirm the checksums are intact and the release author signed them.

---
curl -LO https://github.com/brockhager/neuroswarm/releases/latest/download/ns-node-linux-x64.tar.gz
curl -LO https://github.com/brockhager/neuroswarm/releases/latest/download/checksums.txt

We publish platform-specific artifacts with the following naming convention in our release assets. This is required by the download links above and by our packaging scripts:

- `ns-node-<os>-<arch>.tar.gz` or `.zip` (e.g., `ns-node-linux-x64.tar.gz`)
- `gateway-node-<os>-<arch>.tar.gz` or `.zip`
- `vp-node-<os>-<arch>.tar.gz` or `.zip`
- `checksums.txt` — SHA256 checksums of the artifacts
Invoke-WebRequest -Uri https://github.com/brockhager/neuroswarm/releases/latest/download/ns-node-win-x64.zip -OutFile ns-node-win-x64.zip

---

## How to Maintain / Update Downloads

Maintainers: keep these links accurate and current by following the release checklist below.

curl -LO https://github.com/brockhager/neuroswarm/releases/latest/download/checksums.txt
curl -LO https://github.com/brockhager/neuroswarm/releases/latest/download/checksums.sig
2. Run packaging/build for all platforms via CI (`neuroswarm/.github/workflows/build-release-installers.yml`).
3. Upload release assets using the naming convention above.
4. Generate `checksums.txt` (sha256) and upload it to the release.
5. If signing (recommended): sign `checksums.txt` and upload `checksums.sig`.
6. Update `docs/download.md` (if you want to link to versioned assets) or rely on `latest` redirect above.
7. Run the wiki publish workflow (repo `Publish Wiki Now`) or run `neuroswarm/publish-wiki-now.bat` to sync docs to the GitHub wiki.

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

If you'd like me to populate the exact `vX.Y.Z` links for the most recent release automatically, I can add a script to compute and inject the latest tag automatically into the wiki during CI publishing.