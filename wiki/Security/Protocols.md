# Security Protocols

This page outlines operational security protocols for contributors and maintainers to follow; it complements the Reporting and Overview pages.

## Access & Authentication
- Enforce Two-Factor Authentication (2FA) for all GitHub org members.
- Use least-privilege roles and review access quarterly.
- Use signed commits for release branches where possible.

## Developer Hygiene
- Run automated security scans locally and in CI (CodeQL, Dependabot, npm audit).
- Add vulnerability checks to the pull request checklist.
- Require `2+` reviews and owner approval for critical areas.

## Dependency Management
- Use Dependabot to keep dependencies up-to-date.
- Audit third-party packages before adding them to the repo.
- Avoid unverified or experimental packages in production codepaths.

## Secret Handling
- Do not store secrets in source control.
- Use environment secrets for GitHub Actions and other CI.
- Revoke/rotate leaked secrets immediately and document the incident.

## Incident Response
1. Triage and confirm the report.
2. If sensitive, switch public communications to a private channel and follow coordinated disclosure.
3. Freeze affected systems if the issue is high severity (owner-approved). 
4. Post-incident, publish a redacted post-mortem and any fixes.

## Supply Chain Security
- Verify builds with reproducible builds where feasible.
- Sign release artifacts.
- Maintain an allowlist for verified binaries and toolchains where possible.

## Ongoing Audits
- Schedule regular audits and penetration tests.
- Maintain an open bug bounty program for qualified security researchers.

## Related Pages
- [Reporting Security Vulnerabilities](Reporting.md)
- [Security & Trust Overview](Overview.md)
- [Governance Rituals & Security](../Governance/rituals.md)
