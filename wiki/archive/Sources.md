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

After admission, the gateway will attach the `tx.sources` property and `tx.sourcesVerified`.
