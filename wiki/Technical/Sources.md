# Sources / Allie‑AI Adapters
[← Home](../Getting-Started/Home.md)

NeuroSwarm's sources adapters provide a way to attach external data attestation to transactions prior to block inclusion. They are managed under `neuroswarm/sources/` and the gateway performs queries at admission time.

## Folder structure
```
neuroswarm/sources/
  sources.json
  adapters/
    allie-price.js
    allie-weather.js
    allie-news.js
    allie-eth.js
    allie-oracle.js
  tools/
    import-allie.mjs
  index.js
```

## How adapters work
- Each adapter module exports `query(params)` and an optional `status()` function.
- `query(params)` returns a normalized object: `{ source, value, verifiedAt, origin, raw }`.
- `origin` should be the adapter origin string (e.g., `allie-ai`).
- Gateway calls adapters for each `tx.sourcesRequired` entry and attaches normalized metadata to the tx using the `tx.sources` property and adds `tx.sourcesVerified=true` if adapter results are valid.

## Example adapter
`sources/adapters/allie-price.js` (short summary): attempts to import the `allie-ai` package and uses the price API; fallback is CoinGecko. Returns `{ source: 'AlliePrice', value: 45000, verifiedAt: '2025-11-17T20:49Z', origin: 'allie-ai', raw: {...} }`.

## Example transaction with sources
```
curl -s -X POST http://localhost:8080/v1/tx \ 
  -H 'Content-Type: application/json' -d '{
    "type": "sample",
    "fee": 1,
    "content": "example",
    "sourcesRequired": ["allie-price"],
    "sourceParams": { "coin": "bitcoin" }
  }'
```

After admission, the gateway will attach the `tx.sources` property:
```
tx.sources = [ { adapter: 'allie-price', origin: 'allie-ai', result: { source: 'AlliePrice', value: 45000, verifiedAt: '2025-11-17T20:49Z', raw: {...}} } ]
tx.sourcesVerified = true
```

## VP and `sourcesRoot`
- `VP` includes the sources metadata in the IPFS payload and computes a Merkle root over normalized source data (`sourcesRoot`) that is included in `header.sourcesRoot`.

## NS verification
- On `POST /blocks/produce` or when verifying IPFS payload by CID, NS will compute `computeSourcesRoot(reconstructedTxs)` and compare to `header.sourcesRoot`. If mismatch: reject the block with `payload_sources_root_mismatch`.

## Importing new Allie adapters
- Use `sources/tools/import-allie.mjs` to fetch adapter files from a GitHub repo (e.g., `brockhager/allie-ai`):
  ```bash
  GITHUB_TOKEN=<token> node neuroswarm/sources/tools/import-allie.mjs --repo brockhager/allie-ai --dir adapters
  ```
- Run `node neuroswarm/scripts/integration/sources-allie.mjs` and `node neuroswarm/scripts/integration/gateway-sources-policy.mjs` to validate integration.

## Examples
- You can call `POST /v1/sources/query` to test an adapter manually:
```
curl -s -X POST http://localhost:8080/v1/sources/query -H 'Content-Type: application/json' -d '{"adapter":"allie-price","params":{"coin":"bitcoin"}}'
```

## Troubleshooting
- If adapters return slow or timeout: configure `GATEWAY_SOURCES_QUERY_TIMEOUT_MS`.
- If external API quota is exceeded: configure caching via `GATEWAY_SOURCES_CACHE_TTL_MS` or route to internal proxy.

## Developer Contribs
- Ensure adapters export `query(params)` to normalize the output shape. Add `origin: 'allie-ai'` to sources.json entries for attribution.
