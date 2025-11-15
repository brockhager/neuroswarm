# Terminology & Conventions

Overview

This page documents the common terms, API names, and naming conventions used in the NeuroSwarm codebase and wiki.

Terms
- Admin Node: The canonical governance node that records governance events and anchors them to the blockchain.
- Timeline: The distributed governance timeline stored as a JSONL file (usually `governance-timeline.jsonl`) and observable via `/v1/observability/*` endpoints.
- Anchor: A blockchain anchoring entry with `txSignature` and `fingerprints` for immutability.
- Founder: The role with the highest privileges used to manage governance-critical operations.
- Safe Mode (shutdown): A protective mode enabled via SafetyService that blocks mutating actions.

Conventions
- Docs/pages should follow: Overview → Details → How-to → References
- Use `data-testid` in UI elements to ensure stable e2e selectors (avoid locating elements by textual content that can be truncated)
- All CLI & test commands should be provided in fenced code blocks and in both PowerShell and Bash where possible

Last updated: 2025-11-15