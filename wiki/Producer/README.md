# Producer (VP) — Overview

This folder consolidates all documentation about the Producer role (VP Node) in NeuroSwarm.

What is a Producer?
- The Producer (also called designated producer or VP node) is the validator selected to produce a block for a specific height / slot. Selection is stake-weighted and deterministic within the core NS consensus rules (see `getProducer(height)` semantics).
- The Producer is responsible for building block payloads from the Gateway mempool, signing headers, optionally persisting payloads (IPFS), and submitting `POST /blocks/produce` to the canonical NS node for validation and inclusion.

Why this folder?
- Producer documentation was previously scattered across several wiki pages (Terms, Technical architecture, System Overview, VP design and implementation notes). This folder centralizes Producer design, selection logic, production policies, reward split, and implementation guidance.

Contents
- DESIGN.md — deep-dive into VP node design and signature policy
- SELECTION.md — producer selection algorithm and deterministic behaviors (seed, randomness factor)
- T21_IMPLEMENTATION.md — fault-tolerant VP implementation notes (state persistence, retries)
- REWARDS.md — short note on reward splits and how a Producer receives block fees

If you need a pointer from older pages, search for "Producer" in the wiki — older files have been updated to reference this folder.
