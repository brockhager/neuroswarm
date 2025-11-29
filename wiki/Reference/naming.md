# NeuroSwarm Naming Conventions

This document defines the standardized terms we use across all repos, workflows, and governance logs. 
It will be updated continuously as new terms arise.

## Core Terms

- **Artifact**  
  A concrete output produced by a process (build, test, governance).  
  Examples: compiled binaries, test reports, governance log entries.

- **Field**  
  An individual piece of user input inside a payload or form.  
  Examples: "email" field, "deadline" field.

- **Manifest**  
  A declarative file that describes what exists, how it should be used, or how it should be deployed.  
  Examples: package.json, Kubernetes YAML, ready-queue-specs.md.

- **Payload**  
  A grouped set of user inputs submitted together.  
  Examples: JSON body of a POST request, form submission.

- **Record**  
  A stored entry representing a full user submission.  
  Examples: database row, log entry.

- **Submission**  
  A contributor-provided input or deliverable.  
  Examples: feature proposal, governance vote, task assignment.

- **User Input**  
  Any data submitted by a user (form fields, API payloads, CLI arguments).  
  Examples: name, email, password, task submission.

## Governance Note
- This document is a living artifact.  
- Contributors must update naming.md whenever new terms are introduced.  
- All references in onboarding, specs, and governance logs must use these standardized terms.