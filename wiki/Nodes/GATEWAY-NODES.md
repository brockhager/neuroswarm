# Gateway Nodes — controlled access into the Global Brain

## Overview

Gateway Nodes act as controlled access points between NS Nodes (chatbot agents) and the Global Brain. They stabilize the system by mediating traffic, enforcing policies, and ensuring NS Nodes can access validated data without overloading consensus, indexing, or storage services.

## Responsibilities

- Accept requests from NS Nodes and route them appropriately (queries, reads, writes/submissions).
- Rate-limit and throttle traffic to prevent flooding or denial-of-service.
- Authenticate nodes based on stake and reputation before granting access; enforce authorization policies.
- Cache frequently requested validated data and manifests for faster responses and reduced load.
- Forward heavy requests (new submissions, verification queries, large artifact fetches) to Validator+Aggregator nodes or worker pools.
- Fetch artifacts and manifests from IPFS when needed, and coordinate incentivized pinning or archival actions.

### Data ingestion & submission handling

- NS Nodes submit new knowledge or adapter packages through Gateway Nodes. Submissions include manifests referencing off-chain CIDs and are signed by the submitter.
- Gateways authenticate submissions by verifying the submitter's stake and reputation and applying rate limits or temporary throttles.
- Valid write submissions are routed to Validator+Aggregator nodes for deterministic verification and confidence-weighted merging.
- Gateways coordinate artifact uploads to IPFS (or validate referenced CIDs) and provide submitters with an acknowledgement/receipt and pending manifest identifier.

## Relation to other layers

- **NS Nodes**: Gateways are the interface through which chatbots connect to validated knowledge and submit updates.
- **Validator+Aggregator Nodes**: Gateways forward submissions and verification tasks to these nodes and relay outcomes back to NS Nodes.
- **IPFS Storage**: Gateways retrieve stored artifacts and manifests from IPFS and may request pinning for important content.
- **Governance Layer**: Gateways enforce governance-configured rules (rate limits, reputation thresholds, access policies) and surface telemetry for review.

## Workflow narrative (ingestion + access)

1. NS Node packages submission artifact (knowledge update or adapter) and creates a signed manifest referencing any off-chain CIDs.
2. Submission is sent to a Gateway Node.
3. Gateway checks the submitting node's stake and reputation and applies rate limits or throttles if necessary.
4. Gateway forwards the submission to Validator+Aggregator nodes for verification and merging.
5. Validators verify the submission; aggregators merge accepted updates into a new manifest.
6. The canonical manifest and referenced artifacts are stored on IPFS; the manifest CID and settlement info may be anchored on-chain.
7. Gateway returns the validated manifest reference and metadata (confidence, attestations) to the NS Node.
8. All request and response actions are logged (privacy-respecting) to enable auditability and governance review.

## Benefits

- Prevents overload of the Global Brain by controlling traffic and routing heavy work to specialized nodes.
- Keeps NS Nodes lightweight by offloading consensus, verification, and storage responsibilities.
- Provides caching and indexing to improve latency and reduce repeated work.
- Ensures auditability by logging requests, routing decisions, and access control decisions while respecting privacy.

## Operational notes

- Gateways should be horizontally scalable and deployable by operators; governance may certify trusted gateway operators or allow permissionless deployments with reputation scoring.
- Gateways must honor privacy controls and encrypted payloads; they should avoid logging sensitive content.
- Gateways can offer operator-level premium features (caching SLAs, higher throughput) but charging is optional and outside protocol requirements.

## See also

- `docs/GLOBAL-BRAIN.md`
- `docs/VALIDATOR-AGGREGATOR-NODES.md`
- `docs/IPFS-STORAGE.md`

