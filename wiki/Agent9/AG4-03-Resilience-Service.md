# AG4-03: Agent 9 Resilience & Offline Handling

## Overview

This module implements client-side resilience features for Agent 9. It provides local persistence for user-generated jobs, network health monitoring, and deferred submission logic so users can keep working when the network/Gateway is unavailable.

**File**: `agent9/resilience-service.ts`

## Key Features

- Local persistence (mock Firestore) for queued jobs: `queueLocalJob(job)`
- Deterministic helpers to reset the local state: `resetLocalJobs()`
- Deferred submission logic for queued jobs: `submitDeferredJobs()`
- Network monitoring and automatic resubmission when online: `setupNetworkMonitoring()` and `setOnlineStatus()`
- Deterministic testing helpers for CI and local run

## How it works

1. The service signs in anonymously (for private per-user store).
2. Jobs are stored under a per-user path in the local persistence layer.
3. When the client detects being online again, it attempts to re-send locally queued jobs.
4. After successful submission the local job status is updated to `sent`.

## Public API

- `initializeAuth()` — Sign in user and initialize state
- `initializeResilienceService()` — Initialize auth, start monitoring and attempt deferred submission
- `queueLocalJob(job)` — Save a job locally for later submission
- `getLocallyQueuedJobs()` — Read locally queued jobs
- `updateLocalJobStatus(jobId, status)` — Update a job's local status
- `submitDeferredJobs()` — Attempt to submit queued jobs to Gateway
- `resetLocalJobs()` — Test helper: clear locally queued jobs
- `setOnlineStatus(bool)` — Test helper: set online/offline deterministically
- `runDemo()` — Manual demo runner (invoked with env RUN_NEUROSWARM_RESILIENCE_SIM=1)

## Tests / Quick Runs

### Deterministic test (automated)

```powershell
# Runs tests/tests/agent9_resilience_test.ts
npx tsx tests/agent9_resilience_test.ts
```

### Manual demo

```powershell
# Run the demo mode that simulates offline queuing and resubmission
$env:RUN_NEUROSWARM_RESILIENCE_SIM=1; npx tsx agent9/resilience-service.ts
```

## Notes

This implementation uses a lightweight in-memory Firestore mock for local testing and CI. In production the module should be backed by an actual persistence layer (IndexedDB, LocalStorage, or Firebase) and integrate with the user's authentication system and UI. The module is intentionally deterministic when using the exported test helpers (`resetLocalJobs`, `setOnlineStatus`) to make CI deterministic.

---

*Last updated: 2025-12-06*
