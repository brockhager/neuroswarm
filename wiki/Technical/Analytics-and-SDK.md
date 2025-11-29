# Analytics & SDK
[← Index](Index.md)

Overview

NeuroSwarm exposes analytics endpoints and an SDK that helps developers build on top of the platform and gather insights.

How-to
1. The SDK lives in `neuro-shared` and `neuro-web` packages: read `docs/devx/sdk.md` for usage.
2. Analytics: pipeline components for analytics are described in the `docs/analytics` folder (if present) and include event ingestion and dashboards.

Key items
- SDK quickstart: import `neuro-shared` and use the example initializer from `docs/devx/sdk.md`.
- Event tracking: `governance` events are logged to the timeline and can be collected for analytics processing.

References
- `docs/devx/sdk.md`
- `docs/analytics/` (if present)

Last updated: 2025-11-15