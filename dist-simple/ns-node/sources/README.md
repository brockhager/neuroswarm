# Sources Registry
This folder contains a small registry of source adapters which the Gateway can query at admission time to verify external data.

 - `sources.json` contains the list of adapters and their modules. Example entries include `origin: "allie-ai"` for adapters that wrap Allie-AI code.

Gateway endpoints:
 - `origin` - an adapter origin name (e.g., "allie-ai") for traceability

Importing adapters from a GitHub repo (Allie-AI):
1. If you maintain a GitHub repo of adapters (e.g., `brockhager/allie-ai`) you can use `sources/tools/import-allie.mjs` to fetch adapter files into `sources/adapters`. Example:

```bash
GITHUB_TOKEN=... node sources/tools/import-allie.mjs --repo brockhager/allie-ai --dir adapters
```

2. After importing, ensure `sources/sources.json` lists the adapter entries and that the `origin` is set to `allie-ai` for Allie adapters.

```js
export async function query(params) { return { source: 'coingecko', value: 123.45, verifiedAt: new Date().toISOString(), raw: {} } }
export async function status() { return { ok: true, message: 'ok' } }
```

Adapters should normalize responses into:
- `source` - a short name
- `value` - the canonical numeric or string value
- `verifiedAt` - ISO timestamp
- `raw` - optional raw adapter response
