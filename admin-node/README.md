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
npm start
```

### Environment Variables
- `PORT`: Server port (default: 8080)
- `JWT_SECRET`: JWT signing secret
- `GOVERNANCE_PRIVATE_KEY_PATH`: Path to governance signing key
- `ALLOWED_ORIGINS`: CORS allowed origins (comma-separated)

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