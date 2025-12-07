// agent9/streaming-manager.ts
// AG4-05: Streaming backpressure, partial-message throttling, token aggregation, and user-friendly errors

export type ErrorCode = 'RATE_LIMIT' | 'BACKPRESSURE' | 'TIMEOUT' | 'INVALID_INPUT' | 'UNKNOWN';

export interface ServiceError {
  code: ErrorCode;
  message: string;
  details?: Record<string, any>;
}

export function formatError(code: ErrorCode, message: string, details?: Record<string, any>): ServiceError {
  return { code, message, details };
}

// ------------------ Token Aggregator ------------------
// Aggregates token counts across message parts (useful for billing & throttling)

export class TokenAggregator {
  private tokenCount = 0;

  constructor(private capacity: number = 1_000_000) {}

  addTokens(n: number) {
    if (n < 0) throw new Error('Cannot add negative tokens');
    this.tokenCount = Math.min(this.capacity, this.tokenCount + n);
  }

  consumeTokens(n: number): boolean {
    if (n < 0) throw new Error('Cannot consume negative tokens');
    if (this.tokenCount >= n) {
      this.tokenCount -= n;
      return true;
    }
    return false;
  }

  getTokens() { return this.tokenCount; }

  reset() { this.tokenCount = 0; }
}

// ------------------ Edit Throttler (rate-limited edits) ------------------

export class EditThrottler {
  private timestamps: Map<string, number[]> = new Map();

  constructor(private maxEdits = 5, private windowMs = 60_000) {}

  canEdit(userId: string): boolean {
    const now = Date.now();
    const arr = (this.timestamps.get(userId) || []).filter(ts => ts > now - this.windowMs);
    return arr.length < this.maxEdits;
  }

  recordEdit(userId: string): boolean {
    if (!this.canEdit(userId)) return false;
    const now = Date.now();
    const arr = (this.timestamps.get(userId) || []).filter(ts => ts > now - this.windowMs);
    arr.push(now);
    this.timestamps.set(userId, arr);
    return true;
  }

  // Helper for tests
  clear(userId?: string) {
    if (userId) this.timestamps.delete(userId);
    else this.timestamps.clear();
  }
}

// ------------------ Backpressure Queue ------------------
// Small in-memory single-producer single-consumer queue with capacity and drain backoff

export type ChunkHandler<T> = (chunk: T) => Promise<void>;

export class BackpressureQueue<T> {
  private queue: T[] = [];
  private active = 0;
  private stopped = false;

  constructor(private concurrency = 2, private maxQueueSize = 50, private handler?: ChunkHandler<T>) {}

  setHandler(h: ChunkHandler<T>) { this.handler = h; }

  async enqueue(chunk: T): Promise<void> {
    if (this.stopped) throw new Error('Queue stopped');
    if (this.queue.length >= this.maxQueueSize) {
      throw formatError('BACKPRESSURE', 'Queue is full, backpressure enforced', { maxQueueSize: this.maxQueueSize });
    }
    this.queue.push(chunk);
    void this.processNext();
  }

  private async processNext() {
    if (!this.handler) return;
    if (this.active >= this.concurrency) return;
    const item = this.queue.shift();
    if (!item) return;
    this.active++;
    try {
      await this.handler(item);
    } catch (err) {
      // swallow for now; handler should log
    } finally {
      this.active--;
      void this.processNext();
    }
  }

  size() { return this.queue.length; }

  stop() { this.stopped = true; }
  start() { this.stopped = false; }
}

// ------------------ Utilities for streaming ------------------

export function estimateTokens(text: string): number {
  // very simple estimator for tests: 1 token per ~4 chars
  return Math.max(1, Math.floor(text.length / 4));
}

export default {
  TokenAggregator,
  EditThrottler,
  BackpressureQueue,
  formatError,
  estimateTokens,
};
