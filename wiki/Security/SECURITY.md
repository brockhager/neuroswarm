# Security Policy

## Overview

NeuroSwarm takes security seriously. This document outlines our security policies, procedures, and contact information for reporting security vulnerabilities.

## Reporting Security Vulnerabilities

**🚨 If you discover a security vulnerability, DO NOT create a public issue.**

Instead, please report it confidentially by:

1. Emailing security@neuroswarm.org (if available)
2. Creating a private security advisory on GitHub
3. Contacting a maintainer directly through secure channels

We will acknowledge receipt within 48 hours and provide a more detailed response within 7 days indicating our next steps.

## Security Measures

### Access Control
- GitHub organization ownership limited to verified core contributors
- Two-factor authentication (2FA) required for all contributors
- Repository creation rights restricted to organization owners
- Least-privilege access model for all team members

### Code Security
- All commits must be signed with verified keys
- Branch protection rules require:
  - 2+ code reviews
  - Code owner approval for critical paths
  - Passing CI/CD checks (lint, test, build)
  - No force pushes or branch deletions
- Automated security scanning with CodeQL and Dependabot

### Deployment Security
- Production deployments require manual owner approval
- Secrets scoped to environments with restricted access
- Release artifacts signed and verified
- Rollback procedures documented and tested

### Incident Response
- Emergency freeze procedures for critical security events
- Incident response team with 24/7 availability
- Post-incident reviews and security improvements

## Security Updates

Security updates and patches will be:
- Reviewed by the security team
- Tested in staging environments
- Deployed with minimal downtime
- Communicated to users through security advisories

## Recent Crypto Hardening (CN-07-H)

2025-12-07: Phase 1 prototype for production-grade cryptography has been merged. This creates a shared crypto utility (`shared/crypto-utils.ts`) offering canonical payload hashing, signing and verification primitives and tests (`shared/crypto-utils.test.ts`).

Important notes:
- Phase 1 uses a deterministic HMAC-based signing/verification stub as a test-friendly prototype and is NOT production-ready.
- Phase 2 (next) must integrate a real ED25519 library (e.g., `@noble/ed25519`) and implement secure key management (Vault/HSM). See `wiki/NEUROSWARM_LAUNCH/task-list-2.md` and `wiki/ns-node/CN-08-E-Settlement-Confirmations.md` for related work.

Action items for production rollout:
1. Replace prototype cryptographic functions with true ED25519 operations.  
  - Status: **Phase 2 implemented** — `shared/crypto-utils.ts` will use `@noble/ed25519` when available; sign/verify are now async with a secure fallback for tests.
2. Implement key management (Vault/HSM) + secure rotation and audit logging.
3. Add authoritative public key registry and CI-grade tests exercising key rotation and verification with real keys.

## Contact

For security-related questions or concerns:
- **Security Team**: security@neuroswarm.org
- **Response Time**: Within 48 hours for vulnerability reports
- **Disclosure**: Coordinated disclosure process for responsible disclosure

## Recognition

We appreciate security researchers who help keep NeuroSwarm safe. Contributors who report valid security vulnerabilities may be eligible for bounties and public recognition (with permission).