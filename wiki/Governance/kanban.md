# NeuroSwarm Kanban Guidance

This file defines the principles and expectations for how work flows through the NeuroSwarm project.
It is not a task list — it is guidance for contributors and agents to follow.

## Core Principles
- **Kanban, not sprints**: Work flows continuously from Backlog → In Progress → Done. No time-boxed iterations.
- **WIP discipline**: Keep the number of items in "In Progress" small to avoid overload. Pull new work only when capacity frees up.
- **Explicit policies**: "Done" means code committed, tests passing, documentation updated, and CI/CD green.
- **Repo separation**: Infrastructure tasks belong in `neuroswarm`. Application repos (`neuro-shared`, `neuro-program`, `neuro-services`, `neuro-web`) remain focused on their domains.
- **Transparency**: Every task must be tagged with its repo (`[neuroswarm]`, `[neuro-services]`, etc.) so contributors know where it belongs.
- **Auditability**: Changes should be documented in the appropriate `/docs` file and reflected in Kanban movement.

## Governance Integration

Every Kanban card must have a **documentation anchor** linking to relevant governance and process documentation. This ensures tasks are traceable, auditable, and aligned with governance requirements.

### 📋 Card Documentation Requirements

| Card Type | Required Documentation Links |
|-----------|------------------------------|
| **Feature Request** | [Governance Charter](./governance-charter.md#feature-proposals) |
| **Bug Fix** | [Security Guidelines (Wiki)](https://github.com/brockhager/neuroswarm/wiki/Security/Overview) |
| **Infrastructure** | [Development Standards](../Development/development.md) |
| **Governance Change** | [Voting Procedures](./how-to-vote.md) |
| **Documentation** | [Documentation Standards](../Development/development.md#documentation) |

### 🔗 Required Card Format

Every Kanban card must include these governance cross-references:

```
## Governance Links
- **Approval Process**: [Governance Charter](./governance-charter.md#decision-framework)
- **Quality Standards**: [Development Guide](../Development/development.md#quality-gates)
- **Security Review**: [Security Guidelines (Wiki)](https://github.com/brockhager/neuroswarm/wiki/Security/Overview)
- **Documentation**: [Relevant docs](../README.md)
```

## Agent Expectations
- **Respect repo boundaries**: Do not create phantom directories or mix infra code into app repos.
- **Flow management**: Move tasks through the board only when criteria are met. Do not skip states.
- **Documentation-first**: Every major feature must have a corresponding doc (`docs/*.md`) explaining architecture, usage, and observability.
- **Observability hooks**: Add logging, metrics, and tracing early so behavior can be monitored.
- **Security baseline**: Enforce secret scanning, RBAC, and compliance notes as part of infra work.
- **Release hygiene**: Ensure CI/CD pipelines produce reproducible builds, semantic versioning, and multi-arch Docker images.
- **Governance compliance**: Every card movement must reference applicable governance processes.

## Definition of Done

A task is **Done** when all of the following are true:

### ✅ Code Quality
- [ ] Code committed and peer-reviewed
- [ ] Tests passing (unit, integration, e2e)
- [ ] Code follows style guidelines
- [ ] Security scan passed

### ✅ Documentation
- [ ] Architecture documented in `/docs/program/`
- [ ] API documentation updated
- [ ] User-facing changes documented
- [ ] Cross-links to governance processes included

### ✅ Governance
- [ ] Governance approval obtained for significant changes
- [ ] Voting completed if required
- [ ] Community notification sent
- [ ] Audit trail maintained

### ✅ Infrastructure
- [ ] CI/CD pipeline green
- [ ] Deployment tested
- [ ] Monitoring and logging configured
- [ ] Rollback plan documented

### ✅ Quality Gates
- [ ] Security review completed
- [ ] Performance impact assessed
- [ ] Breaking changes documented
- [ ] Migration guide provided if needed

## Continuous Improvement

- Keep the Kanban board current — remove completed items from Backlog, mark them Done, and break down complex tasks into smaller checklists.
- Surface blockers explicitly so they can be addressed quickly.
- Expand infra capabilities incrementally (Helm, Terraform, dashboards, sync engine, anchoring) while maintaining modularity.
- Regularly review governance effectiveness and update processes based on community feedback.

---

This guidance ensures the agent knows **how to behave** in Kanban: respect repo boundaries, enforce WIP discipline, document everything, keep infra centralized in `neuroswarm`, and maintain governance compliance. Every task must have documentation anchors linking to relevant governance processes.

**Related Governance Documents:**
- [Complete Governance Charter](./governance-charter.md)
- [Voting Procedures](./how-to-vote.md)
- [Contributor Portal](./contributor-portal.md)
- [Code of Conduct](./code-of-conduct.md)
