const NativeShim = require('./NS-LLM/native-shim.js');

async function test() {
    console.log('Testing NativeShim...');
    const shim = new NativeShim();
    console.log('Binary Path:', shim.baseBinaryPath);
    console.log('Fallback Mode:', shim.fallback);

    if (shim.fallback) {
        console.error('Shim started in fallback mode immediately.');
    } else {
        console.log('Shim started successfully.');
        try {
            const health = await shim.health();
            console.log('Health:', health);
        } catch (e) {
            console.error('Health check failed:', e);
        }
    }
}

test();
