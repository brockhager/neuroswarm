# VP Node — T21 Fault-Tolerant Implementation

This page contains notes on the T21 fault-tolerant VP node implementation, copied from the `vp-node` implementation docs.

## Overview
An enhanced VP (Validator/Processing) Node implementation provides state persistence, durable job queues, exponential backoff, health monitoring, and graceful shutdown semantics.

Key features:
- Automatic checkpointing and state recovery
- Durable job queue with stale detection and requeue
- Exponential backoff & retry semantics for external calls
- Health endpoints and operational state inspection

See the full implementation notes in `vp-node/` (server-with-persistence.js and `config/persistence.yml`) for configuration options and deployment guidance.
