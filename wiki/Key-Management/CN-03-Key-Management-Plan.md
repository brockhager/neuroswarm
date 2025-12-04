# CN-03 Key Management Plan

## Executive Summary

This document outlines the key management strategy for the NeuroSwarm Canonical Node system, specifically for CN-03 (Validator/Producer Nodes) that sign blocks using ED25519 cryptographic signatures. Currently, the system uses in-memory key generation suitable for development and testing. This plan defines the requirements and recommended approaches for production key management.

---

## Current State

### Development/Test Implementation

**Location**: [`vp-node/server.js`](file:///c:/JS/ns/neuroswarm/vp-node/server.js#L136-L146)

```javascript
// Current: In-memory key generation
if (!PRIVATE_KEY_PEM) {
  const keypair = crypto.generateKeyPairSync('ed25519');
  PRIVATE_KEY_PEM = keypair.privateKey.export({ type: 'pkcs8', format: 'pem' });
  PUBLIC_KEY_PEM = keypair.publicKey.export({ type: 'spki', format: 'pem' });
}
```

**Characteristics**:
- Keys generated fresh on each server restart
- Stored only in process memory
- No persistence or backup
- Suitable ONLY for development/testing

---

## Production Requirements

### Security Requirements

1. **Private Key Protection**: Validator private keys must never be exposed in logs, environment variables, or source code
2. **Access Control**: Only authorized validator operators should access private keys
3. **Audit Trail**: All key access and signing operations should be logged
4. **Key Isolation**: Private keys should be separated from application code and configuration
5. **Disaster Recovery**: Secure backup and recovery mechanisms must exist

### Operational Requirements

1. **Key Persistence**: Keys must survive server restarts
2. **Validator Identity**: Each validator must maintain consistent identity (public key)
3. **Key Rotation**: Support periodic key rotation without service disruption
4. **Multi-Instance**: Support multiple validator instances with different keys

---

## Recommended Solutions

### Option 1: Encrypted File Storage (Simplest)

**Implementation**:
- Store private keys in encrypted files on disk
- Use strong encryption (AES-256-GCM)
- Decrypt using a master passphrase or key derivation function
- Store in restricted-permission directory (e.g., `~/.neuroswarm/keys/`)

**Pros**:
- Simple to implement
- No external dependencies
- Full operator control

**Cons**:
- Master passphrase management required
- Manual backup responsibility
- File system security critical

**Use Case**: Small-scale deployments, single-server validators

---

### Option 2: Hardware Security Module (HSM) - Recommended for Production

**Implementation**:
- Store private keys in dedicated HSM hardware
- Sign operations performed within HSM (key never leaves device)
- Examples: YubiHSM, AWS CloudHSM, Azure Dedicated HSM

**Pros**:
- Highest security: keys cannot be extracted
- FIPS 140-2 Level 2/3 compliance
- Tamper-resistant
- Built-in audit logging

**Cons**:
- Additional hardware cost
- Integration complexity
- Requires PKCS#11 interface

**Use Case**: Production validators, institutional deployments, high-value networks

---

### Option 3: Cloud Key Management Service (KMS)

**Implementation**:
- Use cloud provider KMS (AWS KMS, Google Cloud KMS, Azure Key Vault)
- Keys stored and managed by cloud provider
- API-based signing operations

**Pros**:
- Managed infrastructure
- Automatic backups and replication
- IAM integration for access control
- Audit logging included

**Cons**:
- Cloud vendor lock-in
- Requires internet connectivity
- Recurring costs
- Trust in cloud provider

**Use Case**: Cloud-native deployments, validators running in cloud infrastructure

---

### Option 4: Secure Vault (HashiCorp Vault)

**Implementation**:
- Deploy HashiCorp Vault cluster
- Store keys in Vault's encrypted backend
- Use Vault's transit secrets engine for signing
- Implement key rotation policies

**Pros**:
- Self-hosted security
- Dynamic secrets support
- Built-in key rotation
- Comprehensive audit logging
- Multi-cloud compatible

**Cons**:
- Operational complexity (Vault cluster management)
- Additional infrastructure
- Learning curve

**Use Case**: Multi-validator deployments, enterprise environments, hybrid cloud

---

## Implementation Roadmap

### Phase 1: File-Based Storage (Q1 2025)
- Implement encrypted file-based key storage
- Add environment variable `VALIDATOR_KEY_PATH` to specify key file location
- Create key generation utility: `npm run keygen`
- Document backup procedures

### Phase 2: Cloud KMS Integration (Q2 2025)
- Add AWS KMS support for cloud deployments
- Implement key rotation mechanism
- Add monitoring and alerting for signing operations

### Phase 3: HSM Support (Q3 2025)
- Integrate PKCS#11 interface for HSM devices
- Support YubiHSM and CloudHSM
- Implement multi-signature threshold schemes

---

## Key Rotation Policy

### Rotation Schedule
- **Normal Operations**: Annual key rotation
- **Suspected Compromise**: Immediate rotation
- **Validator Decommission**: Key revocation

### Rotation Process
1. Generate new key pair
2. Register new public key with NS-Node (`/validators/register`)
3. Submit key rotation proposal to governance
4. After governance approval, update validator configuration
5. Old key remains valid for grace period (7 days)
6. Securely destroy old private key after grace period

---

## Access Control Matrix

| Role | Generate Keys | Access Private Key | Sign Blocks | Rotate Keys | Revoke Keys |
|------|--------------|-------------------|-------------|-------------|-------------|
| Validator Operator | ✅ | ✅ | ✅ | ✅ | ✅ |
| Network Admin | ❌ | ❌ | ❌ | ❌ | ✅ |
| Auditor | ❌ | ❌ | ❌ | ❌ | ❌ (view only) |
| Application | ❌ | ✅ (via secure API) | ✅ | ❌ | ❌ |

---

## Monitoring and Alerting

### Key Metrics to Monitor
1. **Signing Latency**: Time to generate ED25519 signatures
2. **Key Access Frequency**: Rate of private key access requests
3. **Failed Signature Attempts**: Invalid signature generation attempts
4. **Key Age**: Time since last key rotation

### Alert Conditions
- Signing latency > 100ms (HSM degradation)
- Failed signature attempts > 10/hour (potential compromise)
- Key age > 400 days (rotation overdue)
- Unauthorized key access attempts

---

## Security Best Practices

1. **Never Log Private Keys**: Ensure private keys never appear in application logs
2. **Separate Key Storage**: Store keys separately from application code
3. **Minimize Key Exposure**: Load private keys only when needed for signing
4. **Use Secure Channels**: Transmit keys only over encrypted channels (TLS 1.3+)
5. **Regular Audits**: Conduct quarterly security audits of key management practices
6. **Disaster Recovery Drills**: Test key recovery procedures annually

---

## References

- [NIST SP 800-57: Key Management Recommendations](https://csrc.nist.gov/publications/detail/sp/800-57-part-1/rev-5/final)
- [ED25519 Specification (RFC 8032)](https://datatracker.ietf.org/doc/html/rfc8032)
- [PKCS#11 Cryptographic Token Interface](http://docs.oasis-open.org/pkcs11/pkcs11-base/v2.40/os/pkcs11-base-v2.40-os.html)

---

## Appendix: Environment Variables

### Current Development Variables
```bash
VALIDATOR_PRIVATE_KEY    # PEM-encoded ED25519 private key (INSECURE - for dev only)
VALIDATOR_PUBLIC_KEY     # PEM-encoded ED25519 public key
VALIDATOR_ID             # Unique validator identifier
```

### Proposed Production Variables
```bash
VALIDATOR_KEY_PATH       # Path to encrypted key file
VALIDATOR_KEY_PASSWORD   # Password for key decryption (recommend: external secret manager)
VALIDATOR_HSM_SLOT       # HSM slot ID (for HSM deployments)
VALIDATOR_KMS_KEY_ID     # Cloud KMS key ID (for KMS deployments)
VAULT_ADDR              # Vault server address (for Vault deployments)
VAULT_TOKEN             # Vault authentication token
```
