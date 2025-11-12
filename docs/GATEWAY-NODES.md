# Gateway Nodes — controlled access into the Global Brain

## Overview

Gateway Nodes act as controlled access points between NS Nodes (chatbot agents) and the Global Brain. They exist to keep the system stable by preventing overload, mitigating spam, and avoiding direct unfiltered access to heavy consensus and storage layers.

## Responsibilities

- Provide NS Nodes with access to validated data from the Global Brain (manifests, confidence scores, accepted artifacts).
- Rate-limit requests to prevent flooding or denial-of-service across downstream services.
- Cache frequently requested knowledge and manifests for faster responses and lower load.
- Authenticate and authorize nodes before granting access, applying governance-configured thresholds (stake, reputation).
- Route heavy or write-oriented requests (new submissions, verification queries, large artifact fetches) to validator and aggregator nodes or dedicated worker pools.

## Relation to other layers

- NS Nodes: Gateway Nodes are the primary interface through which chatbots connect to validated knowledge and services.
- Validator/Aggregator Nodes: Gateways forward heavy tasks to validators and aggregators for consensus, attestations, and merges.
- IPFS Storage: Gateways fetch artifacts and manifests from IPFS when content is not cached locally; they may also coordinate incentivized pinning requests.
- Governance Layer: Gateways enforce rules set by governance (rate limits, reputation thresholds, access policies) and surface telemetry for governance review.

## Benefits

- Keeps the system stable by controlling traffic flow and protecting downstream consensus/storage layers.
- Allows lightweight NS Nodes to operate without running heavy consensus or storage infrastructure.
- Improves user experience by serving cached responses and applying indexed lookups.
- Provides a scalable choke point to apply policy, telemetry, and throttling without changing core protocols.

## Workflow example

1. NS Node sends a query to a Gateway Node.
2. Gateway checks the NS Node's identity, stake, and reputation; applies governance-configured rate limits.
3. If the requested data is cached, return immediately with cached manifest and confidence metadata.
4. If not cached, Gateway looks up the manifest via an indexer or fetches artifacts from IPFS and may perform light verification checks.
5. For write-heavy operations (new submission, attestations request), Gateway routes the request to validator/aggregator nodes or worker pools and returns an acknowledgement/receipt to the NS Node.
6. Gateway logs request metrics, rate-limit events, and access decisions (privacy-respecting) for governance and auditing.

## Operational notes

- Gateways should be horizontally scalable and deployable by operators; governance can certify trusted gateway operators or allow permissionless deployments with reputation scoring.
- Gateways must respect privacy controls and encrypted payloads — they should not leak sensitive content in logs or dashboards.
- Gateways can optionally charge operator-level fees for premium caching, higher throughput, or SLA-backed access, but these are operator-level choices and not required by the protocol.

## See also

- `docs/GLOBAL-BRAIN.md`
- `docs/VALIDATOR-NODES.md`
- `docs/IPFS-storage.md`
- `docs/INDEXING-DISCOVERY.md`
