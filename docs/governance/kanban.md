# NeuroSwarm Kanban Guidance

This file defines the principles and expectations for how work flows through the NeuroSwarm project.  
It is not a task list — it is guidance for contributors and agents to follow.

## Core Principles
- **Kanban, not sprints**: Work flows continuously from Backlog → In Progress → Done. No time-boxed iterations.
- **WIP discipline**: Keep the number of items in "In Progress" small to avoid overload. Pull new work only when capacity frees up.
- **Explicit policies**: "Done" means code committed, tests passing, documentation updated, and CI/CD green.
- **Repo separation**: Infrastructure tasks belong in `neuro-infra`. Application repos (`neuro-shared`, `neuro-program`, `neuro-services`, `neuro-web`) remain focused on their domains.
- **Transparency**: Every task must be tagged with its repo (`[neuro-infra]`, `[neuro-services]`, etc.) so contributors know where it belongs.
- **Auditability**: Changes should be documented in the appropriate `/docs` file and reflected in Kanban movement.

## Agent Expectations
- **Respect repo boundaries**: Do not create phantom directories or mix infra code into app repos.
- **Flow management**: Move tasks through the board only when criteria are met. Do not skip states.
- **Documentation-first**: Every major feature must have a corresponding doc (`docs/*.md`) explaining architecture, usage, and observability.
- **Observability hooks**: Add logging, metrics, and tracing early so behavior can be monitored.
- **Security baseline**: Enforce secret scanning, RBAC, and compliance notes as part of infra work.
- **Release hygiene**: Ensure CI/CD pipelines produce reproducible builds, semantic versioning, and multi-arch Docker images.

## Continuous Improvement
- Keep the Kanban board current — remove completed items from Backlog, mark them Done, and break down complex tasks into smaller checklists.
- Surface blockers explicitly so they can be addressed quickly.
- Expand infra capabilities incrementally (Helm, Terraform, dashboards, sync engine, anchoring) while maintaining modularity.

---

This guidance ensures the agent knows **how to behave** in Kanban: respect repo boundaries, enforce WIP discipline, document everything, and keep infra centralized in `neuro-infra`. It’s not a list of tasks, but a set of operating principles.  

Would you like me to also add a **short “Definition of Done” checklist** at the bottom so the agent has a clear standard for when to move a card to Done?
