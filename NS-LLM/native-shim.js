import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

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
    const _filename = fileURLToPath(import.meta.url);
    const _dirname = path.dirname(_filename);

    const candidates = [
      path.join(_dirname, 'native', 'build', 'ns-llm-native'),
      path.join(_dirname, 'native', 'build', 'Release', 'ns-llm-native.exe'),
      path.join(_dirname, 'native', 'ns-llm-native.exe'),
    ];
    for (const c of candidates) {
      console.log(`[NativeShim] Checking candidate: ${c}`);
      if (fs.existsSync(c)) {
        console.log(`[NativeShim] Found binary: ${c}`);
        return c;
      }
    }
    console.warn('[NativeShim] No binary found in candidates');
    return null;
  }

  spawnBinary(binPath) {
    const _filename = fileURLToPath(import.meta.url);
    const _dirname = path.dirname(_filename);

    const child = spawn(binPath, ['--stub'], {
      stdio: ['pipe', 'pipe', process.stderr],
      cwd: _dirname
    });
    child.on('spawn', () => {
      this.process = child;
      this.ready = true;
    });

    child.on('exit', (code, signal) => {
      this.ready = false;
      this.process = null;
      this.fallback = true;
      console.warn(`native binary exited with code ${code} and signal ${signal}, switching to fallback HTTP prototype`);
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

          // Peek at current request
          const q = this.queue[0];
          if (!q) continue; // Spurious output?

          if (parsed.stream_token !== undefined) {
            // Streaming response
            if (q.onToken) {
              q.onToken(parsed);
            }

            if (parsed.done) {
              this.queue.shift();
              q.resolve(parsed);
            }
            // If not done, keep q in queue
          } else {
            // Standard response
            this.queue.shift();
            q.resolve(parsed);
          }
        } catch (e) {
          const q = this.queue.shift();
          if (q) q.reject(new Error('invalid-json-from-native'));
        }
      }
    });
    // TODO: error handling on stderr already forwarded
  }

  async callNative(payload, onToken = null) {
    if (!this.process) throw new Error('native-not-available');
    return new Promise((resolve, reject) => {
      this.queue.push({ resolve, reject, onToken });
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
      // if body present and no headers given, ensure Content-Type/Accept JSON
      const headers = opts.headers || (opts.body ? { 'Content-Type': 'application/json', Accept: 'application/json' } : undefined);
      // debug: show the full URL, method, headers and body we are calling
      try {
        const bodyPreview = opts.body ? (typeof opts.body === 'string' ? opts.body : JSON.stringify(opts.body)) : undefined;
        console.debug(`[NativeShim] callHttp -> ${url} method=${opts.method || 'GET'} headers=${JSON.stringify(headers)} body=${bodyPreview && bodyPreview.length > 4096 ? bodyPreview.slice(0,4096) + '...[truncated]' : bodyPreview}`);
      } catch (e) { }
      const res = await fetch(url, { method: opts.method || 'GET', headers, body: opts.body ? JSON.stringify(opts.body) : undefined, signal: controller.signal });
      // debug log when non-ok for easier CI troubleshooting
      if (!res.ok) console.warn(`[NativeShim] HTTP ${res.status} from ${url}`);
      clearTimeout(timeout);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      clearTimeout(timeout);
      // provide a richer error to help CI diagnostics
      console.warn(`[NativeShim] callHttp error -> ${err?.message || err}`);
      throw err;
    }
  }

  async embed(text, opts = {}) {
    if (this.fallback) return this.callHttp('/api/embed', { method: 'POST', body: { text, model: opts.model } });
    try {
      const res = await this.callNative({ cmd: 'embed', text, model: opts.model });
      if (res && res.error) throw new Error(res.error);
      return res;
    } catch (err) {
      // failover to HTTP prototype
      this.fallback = true;
      return this.callHttp('/api/embed', { method: 'POST', body: { text, model: opts.model } });
    }
  }

  async generate(text, opts = {}) {
    if (this.fallback) return this.callHttp('/api/generate', { method: 'POST', body: { text, max_tokens: opts.maxTokens } });
    try {
      return await this.callNative({ cmd: 'generate', text, max_tokens: opts.maxTokens });
    } catch (err) {
      this.fallback = true;
      return this.callHttp('/api/generate', { method: 'POST', body: { text, max_tokens: opts.maxTokens } });
    }
  }

  async generateStream(text, opts = {}, onToken) {
    if (this.fallback) {
      // HTTP fallback for streaming not fully implemented in shim yet, 
      // but if we were to do it, we'd need fetch with ReadableStream support.
      // For now, throw or fallback to non-streaming?
      throw new Error('Streaming not supported in fallback mode');
    }
    try {
      return await this.callNative({ cmd: 'generate', text, max_tokens: opts.maxTokens, stream: true }, onToken);
    } catch (err) {
      throw err;
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

export default NativeShim;
