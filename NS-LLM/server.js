import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import NativeShim from './native-shim.js';

const app = express();
const PORT = process.env.PORT || 3015;

app.use(cors());
app.use(bodyParser.json());

// Initialize NativeShim
// In Docker, binary is at /usr/local/bin/ns-llm-native
// Locally, it might be in build/
const shim = new NativeShim({
    binaryPath: process.env.NS_LLM_BINARY_PATH || '/usr/local/bin/ns-llm-native'
});

console.log(`[NS-LLM Server] Initializing with binary: ${shim.baseBinaryPath}`);

// Health check
app.get('/health', async (req, res) => {
    try {
        const result = await shim.health();
        res.json(result);
    } catch (err) {
        res.status(503).json({ status: 'unhealthy', error: err.message });
    }
});

// Embed endpoint
app.post('/api/embed', async (req, res) => {
    try {
        const result = await shim.embed(req.body.text, { model: req.body.model });
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Generate endpoint
app.post('/api/generate', async (req, res) => {
    const { text, max_tokens, stream } = req.body;

    if (!text) {
        return res.status(400).json({ error: 'missing text' });
    }

    if (stream) {
        // Server-Sent Events setup
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        try {
            // If native shim is available, use it
            if (!shim.fallback) {
                await shim.generateStream(text, { maxTokens: max_tokens }, (tokenData) => {
                    // Each tokenData is a JSON object such as { token: 'text', idx: 1, done?: false }
                    res.write(`data: ${JSON.stringify(tokenData)}\n\n`);
                });

                // Ensure client receives a final done event (shim should have sent done:true)
                res.write('event: done\ndata: [DONE]\n\n');
                res.end();
                return;
            }

            // Fallback path (native binary not available) — synthesize a token stream
            // Basic whitespace tokenizer so the API still works in CI / dev
            const tokens = (text || '').split(/\s+/).filter(Boolean);
            // Send initial meta
            res.write(`event: meta\ndata: ${JSON.stringify({ model: 'ns-llm-fallback', received: (text || '').length })}\n\n`);

            for (let i = 0; i < tokens.length; i++) {
                await new Promise(r => setTimeout(r, 40));
                res.write(`event: token\ndata: ${JSON.stringify({ token: tokens[i], idx: i })}\n\n`);
            }

            res.write(`event: done\ndata: ${JSON.stringify({ done: true, token_count: tokens.length })}\n\n`);
            res.end();
            return;
        } catch (err) {
            console.error('Streaming error:', err);
            res.write(`event: error\ndata: ${JSON.stringify({ error: err.message })}\n\n`);
            res.end();
        }
    } else {
        // Standard generation
        try {
            // Prefer shim.generate which handles native vs fallback internally
            if (!shim.fallback) {
                const result = await shim.callNative({ cmd: 'generate', text, max_tokens });
                return res.json(result);
            }

            // Fallback path for environments without the native binary: simple deterministic generation
            const words = (text || 'Hello from ns-llm fallback').split(/\s+/).filter(Boolean);
            const generated = (words.length ? words : ['hello', 'world']).slice(0, Math.max(1, Math.min(words.length || 2, max_tokens || 64))).join(' ');
            return res.json({ text: generated, tokens_generated: generated.split(/\s+/).length });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    }
});

// compatibility route: some clients call /api/generate/stream directly
app.post('/api/generate/stream', async (req, res) => {
    // ensure we treat this as a streaming request
    req.body = req.body || {};
    req.body.stream = true;
    // delegate to same handler above by calling express stack manually
    // easiest: reuse the same logic by invoking the internal handler
    // but since we've written the handler inline above, call it via a small redirect
    // forward to /api/generate implementation
    return app._router.handle(req, res, () => {});
});

app.listen(PORT, () => {
    console.log(`[NS-LLM Server] Listening on port ${PORT}`);
});

// If run directly, keep process alive (app.listen does this) and print a startup line
if (process.argv[1] && process.argv[1].endsWith('server.js')) {
    console.log('[NS-LLM Server] started as main script');
}
