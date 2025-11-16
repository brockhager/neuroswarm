# Reporting Security Vulnerabilities

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

## Contact

For security-related questions or concerns:
- **Security Team**: security@neuroswarm.org
- **Response Time**: Within 48 hours for vulnerability reports
- **Disclosure**: Coordinated disclosure process for responsible disclosure

**Alternatively**, you can also open a private GitHub Security Advisory for confidential reports:

- https://github.com/brockhager/neuro-infra/security/advisories

## Recognition

We appreciate security researchers who help keep NeuroSwarm safe. Contributors who report valid security vulnerabilities may be eligible for bounties and public recognition (with permission).
