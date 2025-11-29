# Definition of Trusted Data and the Fight Against Misinformation

## Core Principle
NeuroSwarm must never accept information blindly. Every artifact, manifest, or attestation must carry a **verifiable provenance chain**, a **confidence score**, and an **audit trail**. Trusted data is defined not only by its content, but by its context and validation.

## What Counts as Trusted Data
- **Anchored**: The manifest or attestation is finalized on-chain (Solana program accounts with PDA-based addressing).
- **Attested**: Multiple validators have signed and submitted attestations, reaching consensus thresholds.
- **Provenanced**: Lineage can be traced back through a transparent chain of artifacts and validator actions.
- **Scored**: Confidence score reflects validator reputation, attestation count, and anchoring status.
- **Auditable**: Every step is logged, observable, and reproducible for external verification.

## Misinformation Defense Layers
1. **Anchoring Gate**  
   - Only store manifests that pass on-chain verification.  
   - Reject or quarantine artifacts without finalized provenance.

2. **Confidence Scoring**  
   - Weight information by validator reputation and attestation count.  
   - Expose scores in API, CLI, and dashboards so operators can judge reliability.

3. **Lineage Resolution**  
   - Every artifact must have a traceable chain.  
   - Missing or broken lineage is flagged as suspicious.

4. **Reputation & Banlist**  
   - Track peer behavior.  
   - Penalize nodes that repeatedly inject unverifiable or malicious data.

5. **Observability & Alerts**  
   - Dashboards highlight anomalies (low confidence, failed anchoring, unusual peer activity).  
   - Alerts notify operators of suspicious patterns.

## Governance & Policy
- **Definition of Done for Data**: Anchored, attested, scored, and documented.  
- **Transparency**: All rules for trust evaluation are documented in `docs/trust.md`.  
- **Configurable Thresholds**: Operators can set minimum confidence scores or validator counts required for acceptance.  
- **Community Oversight**: Contributors can audit provenance chains and confidence scoring logic.

## Guiding Statement
Trusted data in NeuroSwarm is **anchored, attested, scored, and auditable**.  
Misinformation cannot silently enter the system — it will either fail anchoring, show up with low confidence, or be flagged in lineage queries.  
This ensures the collective “brain” remains transparent, verifiable, and resilient against manipulation.
