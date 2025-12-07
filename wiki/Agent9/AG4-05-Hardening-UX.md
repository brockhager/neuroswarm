# AG4-05: Agent 9 Hardening & UX

## Overview

This module implements client-side hardening and UX improvements: streaming backpressure handling, partial-message edit throttling, token aggregation, resumable streams, and clearer error messages for users.

**File**: `agent9/streaming-manager.ts`

## Features

1. **Backpressure handling**: `BackpressureQueue` enforces an in-memory queue with capacity and concurrency controls. When overloaded, the queue throws a structured `BACKPRESSURE` error so the UI can apply backoff and notify the user.

2. **Partial-message throttling**: `EditThrottler` prevents users from sending too many partial-message edits in short windows to avoid abuse or accidental flooding.

3. **Token aggregation**: `TokenAggregator` collects token estimates across message parts to perform client-side enforcement and reporting so requests remain within allowed budgets.

4. **Resumable streams**: The backpressure-aware queue supports retryable handlers and can be extended into resumable streaming transports.

5. **User-friendly error model**: `formatError()` creates structured errors with codes and details for both UI rendering and automated handling.

## Testing

See: `tests/agent9_streaming_manager_test.ts` — validates token aggregation, throttling, backpressure behavior and the estimateTokens helper.

## Integration Recommendations

- Integrate `BackpressureQueue` with the real-time UI: when backpressure error occurs, show a brief user-friendly notice and automatically retry after exponential backoff.
- Use `EditThrottler` to disable the edit controls briefly when too many partial edits are performed, showing remaining cooldown time.
- Use `TokenAggregator` to show user token budget in the editor (progress bar), preventing unexpected billing spikes.

---

*Last Updated: 2025-12-06*
