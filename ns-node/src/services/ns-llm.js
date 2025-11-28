// ns-node/src/services/ns-llm.js
// Adapter service used by ns-node to talk to NS-LLM backend.
// Uses the shared ns-llm-client library with retry logic, circuit breaker, and metrics.

let client = null;
let clientType = null; // 'native' | 'http' | null

async function initClient() {
  if (client) return client;

  try {
    // Try native shim first
    const shimModule = await import('../../../NS-LLM/native-shim.js');
    const ShimClass = shimModule.default || shimModule;
    client = new ShimClass();
    clientType = 'native';
    console.log('[NS Node] Using native NS-LLM client');
    return client;
  } catch (e) {
    console.warn('[NS Node] Native shim not available:', e.message || e);
  }

  try {
    // Use shared HTTP client with retry/circuit breaker
    const httpModule = await import('../../../shared/ns-llm-client.js');
    client = httpModule.default || httpModule; // Singleton instance
    clientType = 'http';
    console.log('[NS Node] Using HTTP NS-LLM client with circuit breaker');
    return client;
  } catch (e) {
    console.warn('[NS Node] HTTP client not available:', e.message || e);
  }

  // No client available
  return null;
}

export async function isAvailable() {
  const c = await initClient();
  return !!c;
}

export async function health() {
  const c = await initClient();
  if (!c) return { available: false, error: 'no-client' };

  try {
    if (clientType === 'native') {
      return await c.health();
    }
    if (clientType === 'http') {
      const healthy = await c.isHealthy();
      return { available: healthy, backend: 'http' };
    }
    return { available: false };
  } catch (e) {
    return { available: false, error: e.message };
  }
}

export async function metrics() {
  const c = await initClient();
  if (!c) return null;

  try {
    if (clientType === 'native') {
      return await c.metrics();
    }
    if (clientType === 'http') {
      return c.getMetrics();
    }
    return null;
  } catch (e) {
    console.warn('[NS Node] ns-llm metrics failed:', e.message || e);
    return null;
  }
}

export async function embed(text, opts = {}) {
  const c = await initClient();
  if (!c) throw new Error('ns-llm client missing');

  try {
    return await c.embed(text, opts);
  } catch (e) {
    throw e;
  }
}

export async function generate(text, opts = {}) {
  const c = await initClient();
  if (!c) throw new Error('ns-llm client missing');

  try {
    return await c.generate(text, opts);
  } catch (e) {
    throw e;
  }
}

export async function generateStream(text, opts = {}, onToken) {
  const c = await initClient();
  if (!c) throw new Error('ns-llm client missing');

  try {
    return await c.generateStream(text, opts, onToken);
  } catch (e) {
    throw e;
  }
}

export function getClientType() {
  return clientType;
}
