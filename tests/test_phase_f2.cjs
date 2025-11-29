const http = require('http');

async function testEndpoint(path, method = 'GET', body = null) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: 3009,
            path: path,
            method: method,
            headers: {
                'Content-Type': 'application/json'
            }
        };

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try {
                    resolve({ status: res.statusCode, body: JSON.parse(data) });
                } catch (e) {
                    resolve({ status: res.statusCode, body: data });
                }
            });
        });

        req.on('error', reject);
        if (body) req.write(JSON.stringify(body));
        req.end();
    });
}

async function runTests() {
    console.log('--- Phase F2 Verification ---');

    // 1. Check GPU Status (Capability Detection)
    try {
        console.log('\n1. Testing /api/gpu/status...');
        const gpuRes = await testEndpoint('/api/gpu/status');
        console.log('Status:', gpuRes.status);
        console.log('Capabilities:', JSON.stringify(gpuRes.body.capabilities, null, 2));

        if (gpuRes.body.capabilities) {
            console.log('PASS: Capabilities detected');
        } else {
            console.log('FAIL: No capabilities in response');
        }
    } catch (e) {
        console.log('FAIL: GPU endpoint error', e.message);
    }

    // 2. Check Generation with Context ID (KV Cache)
    try {
        console.log('\n2. Testing /api/generative/generate with context_id...');
        const genRes = await testEndpoint('/api/generative/generate', 'POST', {
            text: "Hello, this is a test of the KV cache.",
            contextId: "test-context-001",
            model: "gpt2"
        });
        console.log('Status:', genRes.status);
        console.log('Response:', genRes.body);

        if (genRes.status === 200 && genRes.body.text) {
            console.log('PASS: Generation successful');
        } else {
            console.log('FAIL: Generation failed');
        }
    } catch (e) {
        console.log('FAIL: Generative endpoint error', e.message);
    }
}

runTests();
