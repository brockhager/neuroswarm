# HashiCorp Vault Transit Connector — Production Deployment Guide

This guide walks through deploying the concrete `VaultTransitConnector` implementation for production use with CN-07-H cryptographic hardening.

## Prerequisites

- HashiCorp Vault server (v1.12+ recommended) with Transit secrets engine enabled
- Node.js >=18.x runtime
- Access credentials (Vault token or AppRole role_id/secret_id)

---

## Step 1: Install Dependencies

The `VaultTransitConnector` dynamically imports `node-vault` when used. Install it as a production dependency:

```powershell
# In neuroswarm/shared or at workspace root
pnpm add node-vault
# or npm install node-vault
```

---

## Step 2: Enable Vault Transit Engine

If your Vault server doesn't have the Transit engine enabled, enable it:

```bash
# Enable transit secrets engine at default mount path
vault secrets enable transit

# Create a signing key (ED25519 or RSA)
vault write -f transit/keys/ns-node-signing-key type=ed25519

# Set key usage policy (sign-only, no export)
vault write transit/keys/ns-node-signing-key/config exportable=false allow_plaintext_backup=false
```

**Key naming convention:**
- `ns-node-signing-key` — NS node confirmation signing key
- `vp-node-signing-key` — VP node reward claim signing key
- Rotate keys by creating versioned keys: `ns-node-signing-key-v2`

---

## Step 3: Configure Authentication

### Option A: Token Auth (Recommended for Development)

```powershell
# Set environment variables for token-based auth
$env:VAULT_ADDR="https://vault.example.com:8200"
$env:VAULT_TOKEN="hvs.CAES..."
$env:VAULT_TRANSIT_MOUNT="transit"  # optional, defaults to 'transit'
```

### Option B: AppRole Auth (Recommended for Production)

```bash
# On Vault server: create AppRole
vault auth enable approle
vault write auth/approle/role/neuroswarm-ns token_ttl=1h token_max_ttl=4h

# Generate role credentials
vault read -field=role_id auth/approle/role/neuroswarm-ns/role-id
vault write -f -field=secret_id auth/approle/role/neuroswarm-ns/secret-id
```

```powershell
# Set environment variables for AppRole
$env:VAULT_ADDR="https://vault.example.com:8200"
$env:VAULT_ROLE_ID="<role-id>"
$env:VAULT_SECRET_ID="<secret-id>"
$env:VAULT_TRANSIT_MOUNT="transit"
```

---

## Step 4: Wire Connector into KmsVaultClient

The `KmsVaultClient` already supports the transit connector via environment flags:

```powershell
# Enable Vault Transit connector mode
$env:USE_VAULT_TRANSIT="true"
$env:VAULT_TRANSIT_IMPL_MODULE="./vault-transit-connector-vault.ts"  # optional, defaults to this
```

**In code (NS node ledger-settlement-confirmation.ts or VP server.js):**

```typescript
import { KmsVaultClient } from './shared/key-management.ts';

// KmsVaultClient automatically detects USE_VAULT_TRANSIT and initializes VaultTransitConnector
const kms = new KmsVaultClient('ns-node');
await kms.signPayloadInKms('ns-node-signing-key', hashBuffer);
```

No code changes required — the connector is injected via environment configuration.

---

## Step 5: Test Signing Flow

Run a quick smoke test to verify the connector works:

```powershell
# Start NS node with Vault connector
cd neuroswarm
$env:USE_VAULT_TRANSIT="true"; $env:VAULT_ADDR="https://vault.example.com:8200"; $env:VAULT_TOKEN="hvs.CAES..."; node ns-node/server.js
```

**Expected logs:**
```
[KmsVaultClient] Initialized with transit connector (production).
[TransitConnector] Authenticated with Vault at https://vault.example.com:8200
```

**Test signing via API:**
```powershell
# Submit a reward claim to trigger signing
curl -X POST http://localhost:3009/api/ledger/reward-claim `
  -H "Content-Type: application/json" `
  -d '{"validatorId":"vp-1","claimId":"test-1","amount":"100","signature":"..."}'
```

Check logs for successful signature generation.

---

## Step 6: Key Rotation Workflow

### Adding a New Key Version

```bash
# Create a new key version (Vault automatically versions keys)
vault write -f transit/keys/ns-node-signing-key/rotate

# Publish new public key to registry
vault read -field=keys transit/keys/ns-node-signing-key
# Extract public key from latest version and add to PublicKeyRegistry
```

### Overlap Period Configuration

During rotation, both old and new keys must be published in the registry:

```typescript
// shared/key-management.ts — PublicKeyRegistry
await registry.addPublicKey('ns-node', publicKeyV1, { validFrom: '2025-12-01', validUntil: '2025-12-15' });
await registry.addPublicKey('ns-node', publicKeyV2, { validFrom: '2025-12-07', validUntil: null });
// Overlap: Dec 7-15 both keys valid
```

VP nodes will accept confirmations signed by either key during overlap.

### Revoking Old Keys

After overlap period ends:

```bash
# Disable old key version in Vault
vault write transit/keys/ns-node-signing-key/config min_decryption_version=2 min_encryption_version=2

# Remove from PublicKeyRegistry
await registry.removePublicKey('ns-node', publicKeyV1);
```

---

## Step 7: Monitoring and Audit

### Vault Audit Logs

Enable audit logging to track all signing requests:

```bash
vault audit enable file file_path=/var/log/vault/audit.log
```

**Log entries to monitor:**
- `transit/sign/<key-id>` requests with requester identity
- Failed authentication attempts
- Key rotation events

### Application Metrics

Monitor KMS signing performance:

```typescript
// Prometheus metrics (already implemented in shared/metrics-service.ts)
neuroswarm_kms_sign_requests_total{key_id="ns-node-signing-key"}
neuroswarm_kms_sign_errors_total{key_id="ns-node-signing-key"}
neuroswarm_kms_sign_duration_seconds{key_id="ns-node-signing-key"}
```

### Idempotency Audit Trail

All signed confirmations are recorded in the idempotency store:

```typescript
// Query audit records
const record = await idempotencyStore.getAuditRecord(idempotencyKey);
console.log(record); // { idempotencyKey, claimId, txHash, recordedAt, processorNode, signature }
```

---

## Security Best Practices

✅ **Never export private keys** — Vault Transit keys configured with `exportable=false`  
✅ **Rotate credentials regularly** — AppRole secret_id TTL set to 4h max  
✅ **Use network segmentation** — Vault server accessible only from application network  
✅ **Enable audit logging** — All signing operations logged for forensic analysis  
✅ **Monitor failed auth attempts** — Alert on repeated authentication failures  
✅ **Test disaster recovery** — Vault snapshots and restore procedures documented  

---

## Troubleshooting

### Error: "Connector not authenticated"

**Cause:** Token expired or AppRole credentials invalid.

**Solution:**
```powershell
# Verify token validity
vault token lookup

# Renew token if expired
vault token renew

# Or generate new AppRole secret_id
vault write -f -field=secret_id auth/approle/role/neuroswarm-ns/secret-id
```

### Error: "Vault did not return a signature in the expected field"

**Cause:** Vault response format changed or key type incompatible.

**Solution:**
```bash
# Check key configuration
vault read transit/keys/ns-node-signing-key

# Ensure key type supports signing (ed25519, rsa-2048, rsa-4096)
# Ensure key has signing capability enabled
```

### Error: "node-vault module not found"

**Cause:** `node-vault` not installed.

**Solution:**
```powershell
pnpm add node-vault
# or npm install node-vault
```

---

## Production Checklist

- [ ] Vault server deployed with TLS certificates
- [ ] Transit secrets engine enabled at `/transit`
- [ ] Signing keys created with `exportable=false`
- [ ] AppRole configured with least-privilege policies
- [ ] Audit logging enabled to durable storage
- [ ] Network firewall rules restrict Vault access
- [ ] Backup/restore procedures tested
- [ ] Monitoring dashboards created (Grafana + Prometheus)
- [ ] Key rotation playbook documented
- [ ] Incident response plan includes key compromise scenario

---

## Next Steps

After completing deployment:

1. **Run E2E tests in staging** — Use the Firestore emulator + Vault dev server to validate full flow
2. **Perform load testing** — Verify Vault can handle production signing throughput (target: >100 req/s)
3. **Document runbooks** — Key rotation, disaster recovery, credential rotation procedures
4. **Train operators** — Ensure team understands Vault authentication, key management, and monitoring

---

## References

- [HashiCorp Vault Transit Documentation](https://www.vaultproject.io/docs/secrets/transit)
- [node-vault NPM Package](https://www.npmjs.com/package/node-vault)
- `neuroswarm/wiki/Technical/Vault-Transit-Connector.md` — Technical implementation guide
- `neuroswarm/shared/vault-transit-connector-vault.ts` — Production connector source
- `neuroswarm/wiki/Security/CN-07-H-Runbook.md` — Cryptographic hardening runbook

---

**Status:** Production deployment guide complete. Connector ready for use once dependencies installed and credentials configured. ✅
