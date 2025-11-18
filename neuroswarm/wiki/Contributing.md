# How to Contribute
[← Home](Home.md)

Welcome — thanks for contributing to NeuroSwarm! This page describes how to add adapters, tests, and docs.

## Adding a new Source Adapter
1. Open `neuroswarm/sources/sources.json` and add an entry for your adapter.
2. Create `neuroswarm/sources/adapters/my-adapter.js` and export `query(params)`.
3. Add `status()` if adapter can check reachability.
4. Add unit tests and integration tests as needed.

## Extending tests & CI
- Add unit tests under `neuroswarm/tests/` and integration tests under `scripts/integration/`.
- Update `neuroswarm/package.json` and CI workflow accordingly.
