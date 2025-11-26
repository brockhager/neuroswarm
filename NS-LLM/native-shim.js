const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

class NativeShim {
  constructor(options = {}) {
    // Options allowing override for tests
    this.baseBinaryPath = options.binaryPath || NativeShim.detectDefaultBinary();
    this.prototypeUrl = options.prototypeUrl || 'http://127.0.0.1:5555';
    this.process = null;
    this.queue = [];
    this.ready = false;
    this.fallback = false; // true when falling back to HTTP prototype

    if (this.baseBinaryPath && fs.existsSync(this.baseBinaryPath)) {
      try {
        this.spawnBinary(this.baseBinaryPath);
      } catch (err) {
        // failed to spawn -> fallback
        this.fallback = true;
      }
    } else {
      // binary not present -> fallback
      this.fallback = true;
    }
  }

  static detectDefaultBinary() {
    // possible build locations
    const candidates = [
      path.join(__dirname, 'native', 'build', 'ns-llm-native'),
      path.join(__dirname, 'native', 'build', 'Release', 'ns-llm-native.exe'),
      path.join(__dirname, 'native', 'ns-llm-native.exe'),
    ];
    for (const c of candidates) if (fs.existsSync(c)) return c;
    return null;
  }

  spawnBinary(binPath) {
    const child = spawn(binPath, ['--stub'], { stdio: ['pipe', 'pipe', process.stderr] });
    child.on('spawn', () => {
      this.process = child;
      this.ready = true;
    });

    child.on('exit', (code, signal) => {
      this.ready = false;
      this.process = null;
      this.fallback = true;
      console.warn('native binary exited, switching to fallback HTTP prototype');
    });

    // Buffer stdout lines
    let stdoutBuf = '';
    child.stdout.on('data', chunk => {
      stdoutBuf += chunk.toString();
      let idx;
      while ((idx = stdoutBuf.indexOf('\n')) >= 0) {
        const line = stdoutBuf.slice(0, idx).trim();
        stdoutBuf = stdoutBuf.slice(idx + 1);
        if (line.length === 0) continue;
        try {
          const parsed = JSON.parse(line);
          // dispatch next queued promise
          const q = this.queue.shift();
          if (q) q.resolve(parsed);
        } catch (e) {
          const q = this.queue.shift();
          if (q) q.reject(new Error('invalid-json-from-native'));
        }
      }
    });
    // TODO: error handling on stderr already forwarded
  }

  async callNative(payload) {
    if (!this.process) throw new Error('native-not-available');
    return new Promise((resolve, reject) => {
      this.queue.push({ resolve, reject });
      try {
        this.process.stdin.write(JSON.stringify(payload) + '\n');
      } catch (err) {
        this.queue.pop();
        reject(err);
      }
    });
  }

  async callHttp(path, opts = {}) {
    const url = `${this.prototypeUrl}${path}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), opts.timeoutMs || 5000);
    try {
      const res = await fetch(url, { method: opts.method || 'GET', headers: opts.headers, body: opts.body ? JSON.stringify(opts.body) : undefined, signal: controller.signal });
      clearTimeout(timeout);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      clearTimeout(timeout);
      throw err;
    }
  }

  async embed(text, opts = {}) {
    if (this.fallback) return this.callHttp('/embed', { method: 'POST', body: { text, model: opts.model } });
    try {
      const res = await this.callNative({ cmd: 'embed', text, model: opts.model });
      if (res && res.error) throw new Error(res.error);
      return res;
    } catch (err) {
      // failover to HTTP prototype
      this.fallback = true;
      return this.callHttp('/embed', { method: 'POST', body: { text, model: opts.model } });
    }
  }

  async health() {
    if (this.fallback) return this.callHttp('/health');
    try {
      return await this.callNative({ cmd: 'health' });
    } catch (err) {
      this.fallback = true;
      return this.callHttp('/health');
    }
  }

  async metrics() {
    if (this.fallback) return this.callHttp('/metrics');
    try {
      return await this.callNative({ cmd: 'metrics' });
    } catch (err) {
      this.fallback = true;
      return this.callHttp('/metrics');
    }
  }
}

module.exports = NativeShim;
