# How to Contribute
[← Home](../Getting-Started/Home.md)

Welcome — thanks for contributing to NeuroSwarm! This page describes how to add adapters, tests, and docs.

## Adding a new Source Adapter
1. Open `neuroswarm/sources/sources.json` and add an entry for your adapter:
```json
{ "name": "my-adapter", "module": "my-adapter.js", "desc": "My data adapter", "origin": "allie-ai" }
```
2. Create `neuroswarm/sources/adapters/my-adapter.js` and export `query(params)`. Example:
```js
export async function query(params){
  // return normalized result
  return { source: 'MyAdapter', value: 42, verifiedAt: new Date().toISOString(), origin: 'allie-ai', raw: {} };
}
```
3. Add a `status()` export if your adapter can validate reachability: `export async function status(){ return { ok: true, message: 'ok' } }`.
4. Add unit tests for adapter normalization and integration scripts if appropriate.

## Extending tests & CI
- Add unit tests under `neuroswarm/tests/` and add integration tests to `scripts/integration/`.
- Add a `pnpm -C neuroswarm test:*` script in `neuroswarm/package.json` if you add new test groups.
- Update the CI workflow to include your integration test; use `validate-start-scripts.yml` as the integration template (it includes `ipfs` start, node start, and test steps).

## Documentation updates
- Add or update docs under `neuroswarm/docs/wiki/` and ensure the Home page links to any new pages.
- Use `scripts/publishUpdate.mjs` to add release note entries; CI sync workflow `docs-wiki-sync.yml` pushes to the GitHub wiki.

## Coding guidelines
- Use `console.log` with an ISO timestamp or utility logging wrapper when adding logs:
  - Example: `console.log(`[GATEWAY] [${new Date().toISOString()}] Accepted tx ${txId}`);`
- Add `origin` to adapter metadata for traceability (e.g., `origin: 'allie-ai'`).
- Keep `ns-node` lightweight: do not implement adapter queries inside NS. Gateway remains authoritative for source validation.

## PR review checklist
- Tests updated/included and passing locally.
- Documentation updated with examples & quick start (for adapters or dev guides).
- `pnpm -w build` passes; check that `neuroswarm` package tests pass locally.
