import assert from 'node:assert';
import { test } from 'node:test';

const mod = await import('../../src/vp-state-machine.mjs');
const STATES = mod.STATES;
const VPStateMachine = mod.VPStateMachine;

test('state machine initializes and transitions', () => {
  const sm = new VPStateMachine({ initial: STATES.INITIALIZING, logger: () => {} });
  assert.strictEqual(sm.getState(), STATES.INITIALIZING);
  sm.setState(STATES.SYNCING_LEDGER);
  assert.strictEqual(sm.getState(), STATES.SYNCING_LEDGER);
  sm.setState(STATES.LISTENING_FOR_REVIEWS);
  assert.strictEqual(sm.getState(), STATES.LISTENING_FOR_REVIEWS);
  // check listener invocation
  let transitions = [];
  const unsub = sm.onTransition((p, n) => transitions.push(`${p}->${n}`));
  sm.setState(STATES.PRODUCING_BLOCK);
  assert.ok(transitions.includes(`${STATES.LISTENING_FOR_REVIEWS}->${STATES.PRODUCING_BLOCK}`));
  unsub();
});
