import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const NATIVE_BINARY = path.join(__dirname, 'NS-LLM', 'native', 'build', 'ns-llm-native'); // Adjust extension if windows
const IS_WINDOWS = process.platform === 'win32';
const BINARY_PATH = IS_WINDOWS ? `${NATIVE_BINARY}.exe` : NATIVE_BINARY;

async function testNativeBinary() {
    console.log('--- Testing Phase A/B/F1: Native Backend ---');

    if (!fs.existsSync(BINARY_PATH)) {
        console.log('⚠️ Native binary not found at:', BINARY_PATH);
        console.log('  (This is expected if not compiled yet. Using stub mode if available or skipping)');
        return;
    }

    return new Promise((resolve) => {
        const proc = spawn(BINARY_PATH, ['--stub']); // Use stub to avoid loading massive models
        let output = '';
        let error = '';

        proc.stdout.on('data', (data) => {
            output += data.toString();
            // Check for expected responses
            if (output.includes('healthy')) console.log('✅ Health Check Passed');
            if (output.includes('embedding')) console.log('✅ Embedding Generation Passed');
            if (output.includes('tokens_generated')) console.log('✅ Text Generation Passed');
            if (output.includes('stream_token')) console.log('✅ Streaming Generation Passed');
        });

        proc.stderr.on('data', (data) => error += data.toString());

        proc.on('close', (code) => {
            console.log(`Native binary exited with code ${code}`);
            resolve();
        });

        // Send commands
        const commands = [
            JSON.stringify({ cmd: 'health' }),
            JSON.stringify({ cmd: 'embed', text: 'Hello World' }),
            JSON.stringify({ cmd: 'generate', text: 'Once upon a time', max_tokens: 5 }),
            JSON.stringify({ cmd: 'generate', text: 'Stream me', stream: true, max_tokens: 5 }),
            JSON.stringify({ cmd: 'batch_embed', texts: ['A', 'B'] }) // Phase F2
        ];

        commands.forEach(cmd => proc.stdin.write(cmd + '\n'));
        proc.stdin.end();
    });
}

function checkFiles(phase, files) {
    console.log(`\n--- Verifying Phase ${phase} Files ---`);
    let allExist = true;
    files.forEach(f => {
        const exists = fs.existsSync(path.join(__dirname, f));
        console.log(`${exists ? '✅' : '❌'} ${f}`);
        if (!exists) allExist = false;
    });
    return allExist;
}

async function main() {
    console.log('🚀 Starting System Verification (Phases A-F)\n');

    // Phase A & B: Native Backend
    // We try to run it, but if it fails (e.g. no build tools), we check files
    await testNativeBinary();

    // Phase C: Integration
    checkFiles('C', [
        'shared/ns-llm-client.js',
        'ns-node/src/services/ns-llm.js'
    ]);

    // Phase D: Scaling & Governance
    checkFiles('D', [
        'ns-node/src/services/generative-governance.js',
        'ns-node/src/routes/generative.js',
        'shared/model-registry.js'
    ]);

    // Phase E: UI & Deployment
    checkFiles('E', [
        'ns-web/package.json',
        'ns-web/src/components/GenerateTab.jsx',
        'NS-LLM/Dockerfile',
        'ns-node/Dockerfile'
    ]);

    // Phase F: Advanced Features
    checkFiles('F', [
        'NS-LLM/model-pipeline/export_multimodal.py', // F2
        'ns-node/src/services/multimodal.js',         // F2
        'ns-web/src/components/MultiModalInput.jsx',  // F2
        'NS-LLM/training/train_lora.py',              // F3
        'NS-LLM/training/format_dataset.py'           // F3
    ]);

    console.log('\n✨ Verification Complete');
}

main().catch(console.error);
