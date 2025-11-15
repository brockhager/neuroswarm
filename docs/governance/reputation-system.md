# Reputation System for Contributor Quality Assessment

This document outlines a high-level reputation system design for tracking and rewarding contributor quality and activity.

## Goals
- Surface high-quality contributors for role assignments and voting weight
- Provide transparent, auditable metrics tied to contributions
- Enable non-repudiated reputation changes via governance logs

## Key components
- Contribution scoring: a points-based system that considers PR reviews, merged PRs, test coverage contributions, and event participation
- Time decay: older activity slowly decays so recent contributions weigh more
- Multi-factor weighting: different contributions have different weights (code > docs > triage)
- Human review: reputation adjustments can be proposed via governance and must be voted

## Data and Storage
- Store computed reputation scores in governance-timeline.jsonl logs for auditability
- Expose computed reputation metrics via `/v1/observability/contributor-reputation`

## Next steps
- Define scoring rules precisely and add sample data
- Develop a small graph visualization for contributors
- Add a CLI tool to compute reputation from timeline
