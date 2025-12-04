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