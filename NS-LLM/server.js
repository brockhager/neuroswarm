import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import NativeShim from './native-shim.js';

const app = express();
const PORT = 8080;

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
            await shim.callNative({
                cmd: 'generate',
                text,
                max_tokens,
                stream: true
            }, (tokenData) => {
                // Send SSE event
                res.write(`data: ${JSON.stringify(tokenData)}\n\n`);
            });

            // NativeShim resolves when done: true is received
            // We can close the stream here if not already closed by done:true logic in shim?
            // Actually shim calls callback for done:true too if it has stream_token
            // My C++ change sends done:true WITH stream_token=""

            // Send final [DONE] event if standard practice, or just end
            res.write('event: done\ndata: [DONE]\n\n');
            res.end();
        } catch (err) {
            console.error('Streaming error:', err);
            res.write(`event: error\ndata: ${JSON.stringify({ error: err.message })}\n\n`);
            res.end();
        }
    } else {
        // Standard generation
        try {
            const result = await shim.callNative({
                cmd: 'generate',
                text,
                max_tokens
            });
            res.json(result);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    }
});

app.listen(PORT, () => {
    console.log(`[NS-LLM Server] Listening on port ${PORT}`);
});

// If run directly, keep process alive (app.listen does this) and print a startup line
if (process.argv[1] && process.argv[1].endsWith('server.js')) {
    console.log('[NS-LLM Server] started as main script');
}
