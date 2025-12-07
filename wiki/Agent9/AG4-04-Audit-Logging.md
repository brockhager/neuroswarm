# AG4-04: Agent 9 Audit Logging

## Overview

This module implements fine-grained, append-only audit logging for Agent 9. Audit logs are structured JSONL entries suitable for ingestion by downstream governance, archive, or compliance tools.

**File**: `agent9/audit-logger.ts`

## Design Goals

- Append-only, JSONL entries for immutability and easy ingestion
- Small, robust rotation policy to avoid unbounded disk growth
- Structured entries with correlation IDs for tracing across services
- Simple query functions for ingestion or UI preview
- Lightweight: works in environments without heavy dependencies

## API

- `initAuditLogger(opts)` — configure directory, file name, rotation thresholds
- `logEvent(event)` — append a structured AuditEvent
- `queryRecent(limit)` — read last `limit` entries
- `exportAll()` — return all entries in the active log file

## Example Event

```json
{
  "timestamp": "2025-12-06T03:22:13.123Z",
  "userId": "user-abc123",
  "correlationId": "sub_1765079700605_r75yg61sr",
  "action": "submitArtifact",
  "details": { "size": 1024, "artifactCid": "Qm..." },
  "severity": "info",
  "source": "agent9"
}
```

## Test & Validation

See `tests/agent9_audit_logger_test.ts` — the test validates logging, rotation, and queryRecent behavior.

## Operational Notes

- Logs are stored at `agent9/logs/` by default in the repository; in production, integrate with a secure storage location and an access-controlled archive (S3, GCS, or immutable object storage).
- Ensure log shipping to a centralized governance archive for long-term retention and compliance checks.

---

*Last Updated: 2025-12-06*
