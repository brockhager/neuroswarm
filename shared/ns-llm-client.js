/**
 * NS-LLM Client Library
 * 
 * Provides robust client for NS-LLM backend with:
 * - Connection pooling
 * - Retry logic with exponential backoff
 * - Circuit breaker pattern
 * - Timeout handling
 * - Metrics collection
 */

const http = require('http');
const https = require('https');

// Circuit breaker states
const CIRCUIT_STATE = {
    CLOSED: 'CLOSED',       // Normal operation
    OPEN: 'OPEN',           // Failing, reject requests immediately
    HALF_OPEN: 'HALF_OPEN'  // Testing if backend recovered
};

class NSLLMClient {
    constructor(options = {}) {
        this.baseUrl = options.baseUrl || 'http://127.0.0.1:5555';
        this.timeout = options.timeout || 5000;
        this.maxRetries = options.maxRetries || 3;
        this.retryDelay = options.retryDelay || 100; // Initial delay in ms

        // Circuit breaker config
        this.circuitBreakerThreshold = options.circuitBreakerThreshold || 5; // failures before opening
        this.circuitBreakerTimeout = options.circuitBreakerTimeout || 60000; // ms to wait before half-open
        this.circuitBreakerHalfOpenRequests = options.circuitBreakerHalfOpenRequests || 3; // test requests in half-open

        // Circuit breaker state
        this.circuitState = CIRCUIT_STATE.CLOSED;
        this.failureCount = 0;
        this.lastFailureTime = null;
        this.halfOpenSuccesses = 0;

        // Metrics
        this.metrics = {
            totalRequests: 0,
            successfulRequests: 0,
            failedRequests: 0,
            retriedRequests: 0,
            circuitBreakerTrips: 0,
            averageLatency: 0,
            lastRequestTime: null
        };

        // Connection pooling
        const parsedUrl = new URL(this.baseUrl);
        const isHttps = parsedUrl.protocol === 'https:';
        this.agent = new (isHttps ? https : http).Agent({
            keepAlive: true,
            keepAliveMsecs: 1000,
            maxSockets: 10,
            maxFreeSockets: 5
        });
    }

    /**
     * Check circuit breaker state and update if needed
     */
    _checkCircuitBreaker() {
        if (this.circuitState === CIRCUIT_STATE.OPEN) {
            const timeSinceFailure = Date.now() - this.lastFailureTime;
            if (timeSinceFailure >= this.circuitBreakerTimeout) {
                console.log('[NS-LLM Client] Circuit breaker entering HALF_OPEN state');
                this.circuitState = CIRCUIT_STATE.HALF_OPEN;
                this.halfOpenSuccesses = 0;
            } else {
                throw new Error(`Circuit breaker OPEN. Backend unavailable. Retry in ${Math.ceil((this.circuitBreakerTimeout - timeSinceFailure) / 1000)}s`);
            }
        }
    }

    /**
     * Record request success
     */
    _recordSuccess(latency) {
        this.metrics.successfulRequests++;
        this.metrics.lastRequestTime = Date.now();

        // Update average latency (exponential moving average)
        if (this.metrics.averageLatency === 0) {
            this.metrics.averageLatency = latency;
        } else {
            this.metrics.averageLatency = 0.7 * this.metrics.averageLatency + 0.3 * latency;
        }

        // Circuit breaker logic
        if (this.circuitState === CIRCUIT_STATE.HALF_OPEN) {
            this.halfOpenSuccesses++;
            if (this.halfOpenSuccesses >= this.circuitBreakerHalfOpenRequests) {
                console.log('[NS-LLM Client] Circuit breaker closing (backend recovered)');
                this.circuitState = CIRCUIT_STATE.CLOSED;
                this.failureCount = 0;
            }
        } else if (this.circuitState === CIRCUIT_STATE.CLOSED) {
            // Reset failure count on success
            this.failureCount = 0;
        }
    }

    /**
     * Record request failure
     */
    _recordFailure() {
        this.metrics.failedRequests++;
        this.failureCount++;
        this.lastFailureTime = Date.now();

        // Circuit breaker logic
        if (this.circuitState === CIRCUIT_STATE.HALF_OPEN) {
            console.log('[NS-LLM Client] Circuit breaker opening (backend still failing)');
            this.circuitState = CIRCUIT_STATE.OPEN;
            this.metrics.circuitBreakerTrips++;
        } else if (this.circuitState === CIRCUIT_STATE.CLOSED && this.failureCount >= this.circuitBreakerThreshold) {
            console.log(`[NS-LLM Client] Circuit breaker opening (${this.failureCount} consecutive failures)`);
            this.circuitState = CIRCUIT_STATE.OPEN;
            this.metrics.circuitBreakerTrips++;
        }
    }

    /**
     * Make HTTP request with timeout
     */
    _makeRequest(path, data, timeout) {
        return new Promise((resolve, reject) => {
            const parsedUrl = new URL(this.baseUrl);
            const isHttps = parsedUrl.protocol === 'https:';
            const httpModule = isHttps ? https : http;

            const postData = JSON.stringify(data);

            const options = {
                hostname: parsedUrl.hostname,
                port: parsedUrl.port || (isHttps ? 443 : 80),
                path: path,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(postData)
                },
                agent: this.agent,
                timeout: timeout
            };

            const req = httpModule.request(options, (res) => {
                let body = '';
                res.on('data', (chunk) => body += chunk);
                res.on('end', () => {
                    if (res.statusCode === 200) {
                        try {
                            resolve(JSON.parse(body));
                        } catch (e) {
                            reject(new Error(`Invalid JSON response: ${e.message}`));
                        }
                    } else {
                        reject(new Error(`HTTP ${res.statusCode}: ${body}`));
                    }
                });
            });

            req.on('error', reject);
            req.on('timeout', () => {
                req.destroy();
                reject(new Error(`Request timeout after ${timeout}ms`));
            });

            req.write(postData);
            req.end();
        });
    }

    /**
     * Execute request with retry logic
     */
    async _executeWithRetry(path, data, timeout) {
        let lastError;

        for (let attempt = 0; attempt < this.maxRetries; attempt++) {
            try {
                const result = await this._makeRequest(path, data, timeout);
                if (attempt > 0) {
                    this.metrics.retriedRequests++;
                }
                return result;
            } catch (error) {
                lastError = error;

                // Don't retry on last attempt
                if (attempt < this.maxRetries - 1) {
                    const delay = this.retryDelay * Math.pow(4, attempt); // 100ms, 400ms, 1600ms
                    console.log(`[NS-LLM Client] Request failed (attempt ${attempt + 1}/${this.maxRetries}). Retrying in ${delay}ms...`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            }
        }

        throw lastError;
    }

    /**
     * Generate text using the generative model
     * @param {string} text - Input prompt
     * @param {Object} options - Generation options
     * @returns {Promise<Object>} - Generated text response
     */
    async generate(text, options = {}) {
        this._checkCircuitBreaker();

        this.metrics.totalRequests++;
        const startTime = Date.now();

        const timeout = options.timeout || 30000; // 30s default for generation
        const maxTokens = options.maxTokens || 20;

        try {
            const result = await this._executeWithRetry('/api/generate', {
                cmd: 'generate',
                text: text,
                max_tokens: maxTokens
            }, timeout);

            const latency = Date.now() - startTime;
            this._recordSuccess(latency);

            return result;
        } catch (error) {
            this._recordFailure();
            throw error;
        }
    }

    /**
     * Generate embedding for text
     * @param {string} text - Input text
     * @param {Object} options - Embedding options
     * @returns {Promise<Array<number>>} - Embedding vector
     */
    async embed(text, options = {}) {
        this._checkCircuitBreaker();

        this.metrics.totalRequests++;
        const startTime = Date.now();

        const timeout = options.timeout || 5000; // 5s default for embeddings

        try {
            const result = await this._executeWithRetry('/api/embed', {
                cmd: 'embed',
                text: text
            }, timeout);

            const latency = Date.now() - startTime;
            this._recordSuccess(latency);

            return result.embedding || result;
        } catch (error) {
            this._recordFailure();
            throw error;
        }
    }

    /**
     * Check if backend is healthy
     * @returns {Promise<boolean>} - True if healthy
     */
    async isHealthy() {
        try {
            const parsedUrl = new URL(this.baseUrl);
            const isHttps = parsedUrl.protocol === 'https:';
            const httpModule = isHttps ? https : http;

            return new Promise((resolve) => {
                const options = {
                    hostname: parsedUrl.hostname,
                    port: parsedUrl.port || (isHttps ? 443 : 80),
                    path: '/health',
                    method: 'GET',
                    timeout: 2000,
                    agent: this.agent
                };

                const req = httpModule.request(options, (res) => {
                    resolve(res.statusCode === 200);
                });

                req.on('error', () => resolve(false));
                req.on('timeout', () => {
                    req.destroy();
                    resolve(false);
                });

                req.end();
            });
        } catch (error) {
            return false;
        }
    }

    /**
     * Get current metrics
     * @returns {Object} - Metrics object
     */
    getMetrics() {
        return {
            ...this.metrics,
            circuitBreakerState: this.circuitState,
            successRate: this.metrics.totalRequests > 0
                ? (this.metrics.successfulRequests / this.metrics.totalRequests * 100).toFixed(2) + '%'
                : 'N/A'
        };
    }

    /**
     * Reset metrics
     */
    resetMetrics() {
        this.metrics = {
            totalRequests: 0,
            successfulRequests: 0,
            failedRequests: 0,
            retriedRequests: 0,
            circuitBreakerTrips: 0,
            averageLatency: 0,
            lastRequestTime: null
        };
    }

    /**
     * Manually reset circuit breaker
     */
    resetCircuitBreaker() {
        console.log('[NS-LLM Client] Manually resetting circuit breaker');
        this.circuitState = CIRCUIT_STATE.CLOSED;
        this.failureCount = 0;
        this.halfOpenSuccesses = 0;
    }

    /**
     * Close connection pool
     */
    close() {
        if (this.agent) {
            this.agent.destroy();
        }
    }
}

// Export singleton instance and class
const defaultClient = new NSLLMClient();

module.exports = defaultClient;
module.exports.NSLLMClient = NSLLMClient;
module.exports.CIRCUIT_STATE = CIRCUIT_STATE;
