// Minimal ns-llm-client.js
// - open/closed/half-open circuit breaker
// - retries with exponential backoff
// - timeout via AbortController

class CircuitBreaker {
  constructor({ failures = 3, cooldownMs = 10000 } = {}) {
    this.failures = failures;
    this.cooldownMs = cooldownMs;
    this.failCount = 0;
    this.openUntil = 0;
  }

  recordSuccess() {
    this.failCount = Math.max(0, this.failCount - 1);
  }

  recordFailure() {
    this.failCount++;
    if (this.failCount >= this.failures) {
      this.openUntil = Date.now() + this.cooldownMs;
    }
  }

  isOpen() {
    return Date.now() < this.openUntil;
  }
}

class NsLlmClient {
  constructor({ baseUrl = 'http://127.0.0.1:5555', timeoutMs = 5000, retries = 2, circuitOptions } = {}) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.timeoutMs = timeoutMs;
    this.retries = retries;
    this.circuit = new CircuitBreaker(circuitOptions);
  }

  async fetchJson(path, { method = 'GET', body, timeoutMs } = {}) {
    if (this.circuit.isOpen()) throw new Error('circuit-open');
    const url = `${this.baseUrl}${path}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs || this.timeoutMs);

    try {
      const res = await fetch(url, {
        method,
        headers: body ? { 'Content-Type': 'application/json' } : undefined,
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal
      });
      clearTimeout(timeout);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      this.circuit.recordSuccess();
      return data;
    } catch (err) {
      clearTimeout(timeout);
      this.circuit.recordFailure();
      throw err;
    }
  }

  async retry(fn, retriesLeft = this.retries, backoffMs = 200) {
    try {
      return await fn();
    } catch (err) {
      if (retriesLeft <= 0) throw err;
      await new Promise(r => setTimeout(r, backoffMs));
      return this.retry(fn, retriesLeft - 1, Math.min(2000, backoffMs * 2));
    }
  }

  async embed(text, opts = {}) {
    if (typeof text !== 'string') throw new TypeError('text must be string');
    const path = '/embed';
    return this.retry(() => this.fetchJson(path, { method: 'POST', body: { text, model: opts.model }, timeoutMs: opts.timeoutMs }), this.retries);
  }

  async health() {
    return this.fetchJson('/health');
  }

  async metrics() {
    return this.fetchJson('/metrics');
  }
}

export default NsLlmClient;
