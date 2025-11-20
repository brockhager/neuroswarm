# Changelog — 2025-11-18 : Downloads Page Restored

This changelog entry documents the restoration and update of the Wiki "Downloads" page for NeuroSwarm.

## Summary
- The Download page was restored and updated across the repository docs and wiki to provide clear, copy‑paste friendly links for Linux, macOS, and Windows release artifacts.
- Updated `docs/run-nodes.md` and the project `README.md` to reference the Download page instead of the old Installation page.
- Added a release checklist and maintainer guidance for updating asset links and checksums.

## What changed
- New `docs/download.md` and wiki `neuroswarm/wiki/Download.md` and `neuroswarm/neuroswarm/wiki/Download.md` with platform-specific examples and verification instructions (sha256 / GPG).
- Updated `docs/run-nodes.md` to point users to the Download page for canonical artifacts rather than embedding static links.
- Updated `neuroswarm/README.md` and Home wiki pages to point to Download.

## Why
- This simplifies discoverability for end users (single page with OS/platform links) and reduces confusion from the previous Installation page while we stabilize packaging and CI flow.

## Maintainer note
- Release assets must remain consistent in naming and include a `checksums.txt` file (sha256 sums) and optionally a `checksums.sig` for GPG verification.
- CI follows the `neuroswarm/.github/workflows/build-release-installers.yml` flow; when new version tags are created, the Release assets in GitHub should follow the naming convention documented on the Downloads page.

***

If you want me to append a `vX.Y.Z`-specific asset table to the Downloads page for the current latest tag, I can add a small script to compute and insert the latest release tag into the wiki during publish.
