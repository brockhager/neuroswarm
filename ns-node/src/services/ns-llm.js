// ns-node/src/services/ns-llm.js
// Adapter service used by ns-node to talk to NS-LLM backend.
// Preference order:
// 1) native-shim (neuroswarm/NS-LLM/native-shim.js) -> spawn native binary or fall back to prototype
// 2) HTTP client (neuroswarm/NS-LLM/ns-llm-client.js)

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
    return client;
  } catch (e) {
    console.warn('Native shim not available or failed to instantiate:', e.message || e);
  }

  try {
    const httpModule = await import('../../../NS-LLM/ns-llm-client.js');
    const ClientClass = httpModule.default || httpModule;
    // The HTTP client we wrote is a class that needs to be instantiated
    client = new ClientClass({ baseUrl: 'http://127.0.0.1:5555' });
    clientType = 'http';
    return client;
  } catch (e) {
    console.warn('HTTP client not available:', e.message || e);
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
    if (clientType === 'native') return await c.health();
    if (clientType === 'http') return await c.health();
    return { available: false };
  } catch (e) {
    return { available: false, error: e.message };
  }
}

export async function metrics() {
  const c = await initClient();
  if (!c) return null;
  try {
    if (clientType === 'native') return await c.metrics();
    if (clientType === 'http') return await c.metrics();
    return null;
  } catch (e) {
    console.warn('ns-llm metrics failed', e.message || e);
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
