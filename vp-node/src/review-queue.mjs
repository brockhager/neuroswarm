// Lightweight in-memory review queue used by VP to hold REQUEST_REVIEW items
// when node is syncing or quiescing.

export class ReviewQueue {
  constructor({ ttlMs = 1000 * 60 * 60 } = {}) { // default 1 hour
    this._ttl = ttlMs;
    this._entries = new Map(); // key: id or artifact_id, value: { tx, inserted }
  }

  _keyFor(tx) {
    return tx.id || tx.txId || tx.artifact_id || JSON.stringify(tx);
  }

  enqueue(tx) {
    const k = this._keyFor(tx);
    this._entries.set(k, { tx, inserted: Date.now() });
    return k;
  }

  size() { return this._entries.size; }

  drainAll() {
    const items = Array.from(this._entries.values()).map(e => e.tx);
    this._entries.clear();
    return items;
  }

  sweepExpired() {
    const now = Date.now();
    for (const [k, v] of this._entries.entries()) {
      if (now - v.inserted > this._ttl) this._entries.delete(k);
    }
  }

  peekAll() { return Array.from(this._entries.values()).map(e => e.tx); }
}

export default ReviewQueue;
