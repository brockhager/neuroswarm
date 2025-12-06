import client from 'prom-client';

const register = new client.Registry();

// Default labels (can set node or validator id later)
register.setDefaultLabels({ service: 'vp-node' });

// Create metrics
export const vp_current_state = new client.Gauge({ name: 'vp_current_state', help: 'Current VP state (value 1; label=state)', labelNames: ['state'] });
export const vp_state_transitions_total = new client.Counter({ name: 'vp_state_transitions_total', help: 'Number of VP state transitions', labelNames: ['from', 'to'] });
export const vp_review_queue_size = new client.Gauge({ name: 'vp_review_queue_size', help: 'Number of REQUEST_REVIEW messages queued' });
export const vp_produce_attempts_total = new client.Counter({ name: 'vp_produce_attempts_total', help: 'Total produce attempts' });
export const vp_produce_failures_total = new client.Counter({ name: 'vp_produce_failures_total', help: 'Produce failures detected during pre-production checkpoint' });
export const vp_ns_sync_lag_seconds = new client.Gauge({ name: 'vp_ns_sync_lag_seconds', help: 'Seconds since last confirmed NS sync' });

// Register them
register.registerMetric(vp_current_state);
register.registerMetric(vp_state_transitions_total);
register.registerMetric(vp_review_queue_size);
register.registerMetric(vp_produce_attempts_total);
register.registerMetric(vp_produce_failures_total);
register.registerMetric(vp_ns_sync_lag_seconds);

export function initMetrics({ defaultLabels = {} } = {}) {
  try {
    register.setDefaultLabels(defaultLabels);
  } catch (e) {
    // older/newer prom-client may differ; swallow if setDefaultLabels is incompatible
    try { register.defaultLabels = defaultLabels; } catch (e) {}
  }
}

export function incrementStateTransition(from, to) {
  if (!from || !to) return;
  try {
    vp_state_transitions_total.inc({ from, to }, 1);
    // update current state gauge: set label for the new state to 1 and clear others by setting 0 for all known states
    // Note: we cannot know all possible states here; setting only the new label to 1 is fine.
    vmSetCurrentState(to);
  } catch (e) {
    // swallow metric failures
  }
}

export function vmSetCurrentState(state) {
  try {
    // set the current state gauge with that label
    vp_current_state.set({ state }, 1);
  } catch (e) {}
}

export function setReviewQueueSize(n) { try { vp_review_queue_size.set(n); } catch (e) {} }
export function incProduceAttempt() { try { vp_produce_attempts_total.inc(); } catch (e) {} }
export function incProduceFailure() { try { vp_produce_failures_total.inc(); } catch (e) {} }
export function setNsSyncLagSeconds(s) { try { vp_ns_sync_lag_seconds.set(Number(s || 0)); } catch (e) {} }

export async function metricsHandler(req, res) {
  res.set('Content-Type', register.contentType || 'text/plain; version=0.0.4');
  const metrics = await register.metrics();
  res.send(metrics);
}

export default { initMetrics, incrementStateTransition, vmSetCurrentState, setReviewQueueSize, incProduceAttempt, incProduceFailure, setNsSyncLagSeconds, metricsHandler };
