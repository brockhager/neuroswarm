# Downloads

This page provides links to official distribution artifacts and releases for NeuroSwarm.

Note: For the moment we have removed the Installation page from the wiki and replaced it with this Downloads page which focuses on providing pre-built bundles and release artifacts.

## Release Downloads

Find official release assets on the GitHub Releases page for the `neuro-infra` repository:

- https://github.com/brockhager/neuro-infra/releases

Artifacts available typically include platform-specific ZIPs for:
- `ns-node` (Linux/macOS/Win)
- `gateway-node` (Linux/macOS/Win)
- `vp-node` (Linux/macOS/Win)

## Getting the right artifact

1. Visit the Releases page.
2. Choose the latest release.
3. Download the ZIP for your desired node and platform.

## After downloading

- Unzip the archive.
- Open the included `start.sh` (Linux/macOS) or `start.bat` (Windows) to launch the node.

## Notes for developers

- If you need to build artifacts locally, package scripts are available in `neuroswarm` and CI automates building the same assets used as release downloads.
- For packaging and release generation, see `neuroswarm/scripts/package-binaries.mjs` and the release workflow `neuroswarm/.github/workflows/build-release-installers.yml`.

---

If you'd like us to restore the Installation page with more step-by-step instructions later, we can reintroduce it into the Wiki once the Installers are stable and have current release assets.