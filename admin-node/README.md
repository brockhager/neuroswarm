# ⚠️ WARNING! ⚠️

**DO NOT USE ADMIN NODE UNLESS GIVEN PERMISSION BY FOUNDER.**

**USING WITHOUT PERMISSION CAN RESULT IN PERMANENT BAN**

---

# Admin Node

NeuroSwarm Admin Node - Founder control plane for observability and emergency controls.

## Overview

The Admin Node provides a secure, founder-only interface for monitoring NeuroSwarm's core systems and executing emergency controls. It implements multi-signature authentication with HSM integration and comprehensive governance logging.

## Architecture

- **Framework**: Express.js with TypeScript
- **Authentication**: Multi-signature JWT with HSM integration
- **Observability**: Real-time dashboards for consensus, tokenomics, and communication streams
- **Security**: Founder-only access with comprehensive audit trails
- **Logging**: Cryptographically signed governance logs for all actions

## API Endpoints

### Health Check
- `GET /health` - Service health status

### Admin Operations (Founder Only)
- `GET /v1/admin/status` - System status overview
- `POST /v1/admin/freeze` - Emergency system freeze
- `POST /v1/admin/restore` - Emergency system restore
- `GET /v1/admin/logs` - Recent governance logs
- `POST /v1/admin/config` - Update system configuration

### Observability (Admin Access)
- `GET /v1/observability/consensus` - Consensus monitoring data
- `GET /v1/observability/tokenomics` - Tokenomics monitoring data
- `GET /v1/observability/communication` - Agent communication monitoring
- `GET /v1/observability/metrics` - General system metrics

## Security Model

- **Multi-signature Authentication**: Requires founder key validation
- **HSM Integration**: Hardware-secured cryptographic operations
- **Role-based Access**: Founder > Admin > User hierarchy
- **Audit Logging**: All actions logged with cryptographic signatures
- **Rate Limiting**: DDoS protection and abuse prevention

## Development

### Prerequisites
- Node.js 18+
- TypeScript 5.3+
- Access to governance private key (for signing logs)

### Setup
```bash
npm install
npm run build
npm run health-check  # Verify configuration before starting
npm start
```

### Environment Variables
- `PORT`: Server port (default: 8080)
- `JWT_SECRET`: JWT signing secret
- `GOVERNANCE_PRIVATE_KEY_PATH`: Path to governance signing key
- `ALLOWED_ORIGINS`: CORS allowed origins (comma-separated)

### Pre-Startup Health Check
Before starting the Admin Node, run the health check to verify configuration:

```bash
npm run health-check
```

This validates:
- ✅ dotenv configuration loads correctly
- ✅ Required environment variables are defined
- ✅ Key files exist and have correct PEM format
- ✅ Governance signing is enabled

Example output:
```
🔍 Admin Node Health Check
==========================

1. Checking dotenv configuration...
✅ dotenv loaded successfully (90 environment variables)

2. Checking environment variables...
✅ SERVICE_JWT_PRIVATE_KEY_PATH: secrets/admin-node.jwt.key
✅ FOUNDER_PUBLIC_KEY_PATH: secrets/founder.jwt.pub
✅ GOVERNANCE_PRIVATE_KEY_PATH: secrets/founder.jwt.key

3. Validating key files...
✅ Admin Node JWT Private Key: Valid private key
✅ Founder Public Key: Valid public key
✅ Governance Private Key: Valid private key

4. Governance signing readiness...
✅ Governance signing enabled - logs will be cryptographically signed

🎉 Health Check Complete!
========================
✅ dotenv configuration: OK
✅ Environment variables: OK
✅ Key files: OK
✅ Governance signing: ENABLED

🚀 Admin Node is ready to start!
```

### Genesis Anchoring (Blockchain Verification)

NeuroSwarm anchors founder keys and genesis configuration to Solana blockchain for public verification:

#### Generate Fingerprints
```bash
npm run anchor-genesis
```

This creates SHA-256 fingerprints of:
- Founder public key (founder.jwt.pub)
- Admin Node public key (admin-node.jwt.pub)
- Genesis configuration (admin-genesis.json)

#### Manual Blockchain Anchoring
Execute the generated Solana CLI command:
```bash
solana transfer --allow-unfunded-recipient --memo "<fingerprint_json>" <FOUNDER_KEYPAIR> <RECIPIENT> 0.000000001
```

#### Verify Genesis Integrity
Contributors can verify fingerprints against blockchain:
```bash
npm run verify-genesis <TRANSACTION_SIGNATURE>
```

This fetches the memo from Solana and compares hashes locally.

### Testing
```bash
npm test
npm run lint
```

## Governance Integration

All admin actions are logged to `wp_publish_log.jsonl` with:
- Timestamp and actor identification
- Cryptographic signatures for integrity
- Complete audit trails for forensic analysis
- Structured JSON format for automated processing

## Phase 1 Implementation Status

✅ **Completed:**
- TypeScript service scaffolded with Express.js framework
- Multi-signature authentication middleware implemented
- Governance logging service with cryptographic signing
- Admin and observability route structures
- Secure configuration management
- Health check and error handling

🔄 **In Progress:**
- HSM client integration for key operations
- Dashboard UI framework implementation
- Real-time data stream integration
- Comprehensive testing and validation

## Deployment

The admin node should be deployed with:
- HSM access for cryptographic operations
- Secure network isolation (founder-only access)
- High availability and backup systems
- Comprehensive monitoring and alerting

## Contributing

See [CONTRIBUTOR-GUIDE.md](../../docs/CONTRIBUTOR-GUIDE.md#admin-node-awareness) for admin node awareness requirements and security protocols.