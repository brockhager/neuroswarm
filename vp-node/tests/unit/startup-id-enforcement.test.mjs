import assert from 'node:assert';
import { describe, it } from 'node:test';
import { spawn } from 'node:child_process';
import path from 'node:path';

describe('VP startup ID enforcement', () => {
  it('should exit with code 1 when neither VALIDATOR_ID nor PUBLIC_KEY_PEM is provided', async () => {
    const serverPath = path.join(process.cwd(), 'server.js');

    // Spawn a child process with a CLEAN env to simulate a user who didn't set IDs
    const env = { ...process.env };
    delete env.VALIDATOR_ID;
    delete env.PUBLIC_KEY_PEM;

    const child = spawn(process.execPath, [serverPath], { cwd: process.cwd(), env, stdio: ['ignore', 'pipe', 'pipe'] });

    let stderr = '';
    child.stderr.on('data', (c) => stderr += c.toString());

    // Wait for exit
    const exit = await new Promise(resolve => child.on('exit', (code) => resolve(code)));

    assert.strictEqual(exit, 1, `Node should exit with code 1 when no ID provided (got ${exit}) -- stderr: ${stderr}`);
    assert.ok(stderr.includes('No VALIDATOR_ID or PUBLIC_KEY_PEM provided'), 'stderr should include fatal ID message');
  });
});
