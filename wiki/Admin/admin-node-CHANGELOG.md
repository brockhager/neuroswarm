# Changelog

## Unreleased (2025-11-15)
### Added
- `GET /v1/admin/latest-anchor` (founder-only): Return the latest governance anchor for founder actions.
- `GET /v1/observability/latest-anchor` (public): Read-only observability endpoint for dashboards and contribs.
- UI: Added Latest Anchor modal and inline card on Governance Anchoring tab; buttons for copy/mark verified/set tx.
- E2E: Playwright setup and tests for the Latest Anchor modal metrics and interaction.
### UI
- Toasts: Non-blocking toast notifications for copy-to-clipboard, mark verified, and set tx signature actions.
- Modal improvements: Overlay click-to-close, Escape key to close, and focus management for accessibility.
### Changed
- Admin routes: `GET /v1/admin/verify-genesis/:txSig` now founder-only (`requireFounder`).
- `AnchorService.findLatestAnchor` updated to select the most recent timeline entry with a txSignature.
### Fixed
- Anchor verification edge cases: better handling of missing timeline files, top-level vs fingerprints hashes.

## Previous
- (Initial release and earlier changes are tracked in commit history.)
# Admin Node Changelog

## [Unreleased]
- 2025-11-15: Implemented `GET /v1/admin/latest-anchor` (founder-only) and `GET /v1/observability/latest-anchor` (public).
- 2025-11-15: Added UI modal & inline card for Latest Anchor with copy verification & mark verified actions.
- 2025-11-15: Added Playwright E2E tests for Latest Anchor modal and founder vs admin behavior; CI workflow updated to run e2e tests.
- 2025-11-15: Added `AnchorService.getLatestAnchorByType` and updated tests to improve verification scenarios.
