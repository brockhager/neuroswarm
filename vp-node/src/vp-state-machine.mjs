// Simple deterministic VP state machine for CN-06
export const STATES = Object.freeze({
  INITIALIZING: 'INITIALIZING',
  SYNCING_LEDGER: 'SYNCING_LEDGER',
  LISTENING_FOR_REVIEWS: 'LISTENING_FOR_REVIEWS',
  PRODUCING_BLOCK: 'PRODUCING_BLOCK',
  QUIESCENT: 'QUIESCENT',
  ERROR: 'ERROR'
});

export class VPStateMachine {
  constructor({ initial = STATES.INITIALIZING, logger = console, metrics = null } = {}) {
    this._state = initial;
    this._logger = logger;
    this._listeners = new Set();
    // optional metrics object with incrementStateTransition and vmSetCurrentState
    this._metrics = metrics;
  }

  getState() { return this._state; }

  setState(next) {
    if (!Object.values(STATES).includes(next)) throw new Error(`invalid state: ${next}`);
    const prev = this._state;
    if (prev === next) return prev;
    this._state = next;
    try { this._logger && this._logger(`VP state: ${prev} -> ${next}`); } catch (e) {}
    try { if (this._metrics && typeof this._metrics.incrementStateTransition === 'function') this._metrics.incrementStateTransition(prev, next); } catch (e) {}
    try { if (this._metrics && typeof this._metrics.vmSetCurrentState === 'function') this._metrics.vmSetCurrentState(next); } catch (e) {}
    for (const l of Array.from(this._listeners)) {
      try { l(prev, next); } catch (e) { /* swallow listener errors */ }
    }
    return prev;
  }

  onTransition(fn) { this._listeners.add(fn); return () => this._listeners.delete(fn); }
}

export default VPStateMachine;
