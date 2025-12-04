# Router API Prototype (Port 4001)

The Router API prototype implements authenticated and authorized endpoints used by Agent 9 and other clients for governance voting and artifact ingestion. This prototype demonstrates production-grade security (JWT verification + RBAC) and server-side validation for uploaded artifacts.

## 🚀 Getting started

### Prerequisites
- Node.js (v20+)
- npm (for dependency management)

### Install

Open a terminal in the `router-api-prototype` folder and install:

```powershell
cd router-api-prototype
npm install
```

### Run the server

Set the necessary environment variables (see below) and start the server locally:

```powershell
# PowerShell example — using a symmetric secret
$env:ROUTER_JWT_SECRET = 'your_shared_secret_here'; npm start
```

By default the server listens on port 4001 (use `PORT` env var to override).

## 🔒 Configuration (Environment variables)

The Router API currently supports two JWT verification modes. You must configure at least one of these for authentication to succeed.

| Env var | Default | Purpose |
|---|---:|---|
| PORT | 4001 | port for Express server |
| MAX_FILE_UPLOAD_BYTES | 5242880 (5 MB) | Max size allowed for artifact uploads (server-side validation) |
| ROUTER_JWT_SECRET | — | HS256 symmetric secret (service-to-service) |
| ROUTER_JWT_PUBLIC_KEY | — | PEM public key for RS256/ES256 verification (recommended for production) |

> Notes:
> - If `ROUTER_JWT_PUBLIC_KEY` is provided, the server will use asymmetric verification (RS256/ES256) and prefer it over symmetric HS256.
> - For production, use an auth provider or JWKS and avoid embedding private keys in app config.

## 🧭 Endpoints (proto)

- `POST /governance/vote` — Submit a governance vote. Requires a valid JWT and the `governance` role.
- `POST /ingest/artifact` — Submit artifact metadata (contentCid, uploaderId, metadata). Requires valid JWT and `ingest` (or other approved) role(s). Server-side validation enforces CID format, metadata fields, size and allowed extensions.

### Request contract — /ingest/artifact
```json
{
	"contentCid": "bafy...|Qm...",
	"uploaderId": "discord:user-123",
	"metadata": {
		"filename": "example.pdf",
		"size": 102400,
		"contentType": "application/pdf"
	}
}
```

## 🧪 Testing & CI

The prototype includes unit and integration tests that verify the authentication, RBAC and validation behavior.

### Test scripts (from `router-api-prototype`)
- `npm run test:unit` — Unit tests (helpers and validators)
- `npm run test:integration` — Integration tests (server started on ephemeral port + request lifecycle)
- `npm run test:integration:rs256` — RS256 specific integration tests
- `npm run test:ci` — Runs unit + both integration suites (CI target)

### Running the integration tests (PowerShell)

The integration tests expect an environment configuration. For CI-like runs, set the symmetric secret (or a public key) before running.

```powershell
$env:ROUTER_JWT_SECRET = 'TEST_SECRET_12345';
$env:MAX_FILE_UPLOAD_BYTES = 5242880; # (optional override)
npm run test:ci
```

### GitHub Actions

A workflow has been added at `.github/workflows/router-api-contracts.yml` which runs `npm run test:ci` on pushes and pull requests to `main`/`master`. This ensures the Router API contracts and security checks remain protected by CI.

Note about persistence-path coverage in CI:
- The Router API CI runs the test matrix across two persistence configurations: `sqlite` (high-fidelity, better-sqlite3) and `fallback` (file-backed JSON) to ensure both code paths are exercised.
	This is controlled by `EXPECT_SQLITE` and `FORCE_FALLBACK` environment variables and verified by dedicated integration tests.

Additionally, the Agent 9 E2E CI workflow (`.github/workflows/agent9-e2e.yml`) uses the same matrix to validate the client→server ingestion flow in both persistence modes.

## 🧩 Security notes & next steps

- RS256 is recommended for production. The tests cover both HS256 and RS256 flows.
- For a real deployment, use a secure Auth/AuthZ service that issues signed tokens and publish the public keys via JWKS (or configure a key rotation mechanism).
- Next improvements we recommend:
	- Add server-side pinning policy + DB recording for artifact jobs.
	- Add integration tests that simulate Agent 9 → Router → IPFS → Router anchoring flows (end-to-end).
	- Add a JWKS endpoint or remote JWKSet verification for RS256 verification (using `jose.createRemoteJWKSet`) to avoid static PEMs in env.

If you want, I can add a short troubleshooting / examples section (cURL samples) or wire up a local dev launcher to start mock dependencies. Would you like that?
# Router API Prototype

Purpose: contract scaffolding for Agent 9 features (governance vote ingestion and artifact ingestion).

Files:
- `server.js` — Express-based prototype server exposing `/governance/vote` and `/ingest/artifact` (POST)
- `openapi.yaml` — OpenAPI contract for the two endpoints

How to run locally (PowerShell):

```powershell
cd c:\JS\ns\neuroswarm\router-api-prototype
node server.js
# Use curl or the Agent 9 client prototype to exercise endpoints
```