# NeuroSwarm — Operations / Runbook

This page is the starting point for operators and DevOps engineers who will deploy, run, and manage NeuroSwarm in staging and production.

## Prioritized operational documents
- Deployment manifests (Docker Compose / production): `neuroswarm/docker-compose.production.yml` and `wiki/Deployment/OPS-04-Deployment-Manifests.md`
- Vault transit & KMS deployment guide: `wiki/Security/Vault-Deployment-Guide.md`
- Monitoring & alerting: `monitoring/grafana/sync-monitoring-dashboard.json` and `monitoring/prometheus/rules/sync-alerts.yml` and `wiki/Monitoring/Sync-Monitoring-Deployment.md`
- CI pipeline and orchestration: `.github/workflows/integration_tests.yml` and `scripts/test-with-firestore-emulator.mjs`

## Operational checklist (Quick start)
1. Provision machines and networking for services (see `neuroswarm/docker-compose.production.yml`)  
2. Configure secrets (Vault tokens / AppRole, JWKS, DB credentials)  
3. Install monitoring stack and import Grafana dashboards (see Monitoring docs)  
4. Start services and verify `/health` endpoints for each service  

## Vault & KMS notes
- The Vault Transit connector is implemented and ready to be wired by setting `USE_VAULT_TRANSIT` and providing Vault credentials  
- Follow `wiki/Security/Vault-Deployment-Guide.md` for production hardening and rotation playbooks
