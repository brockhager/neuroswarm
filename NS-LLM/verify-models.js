import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

(async function(){
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const modelsDir = path.join(__dirname, 'models');
  const checksFile = path.join(modelsDir, 'checksums.txt');
  if (!fs.existsSync(checksFile)) {
    console.error('checksums.txt not found in models/ — run compute-checksums.js first or add model artifacts');
    process.exit(2);
  }
  const lines = (await fs.promises.readFile(checksFile, 'utf8')).split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  let bad = 0;
  for (const line of lines) {
    const [expected, rel] = line.split(/\s+/);
    const full = path.join(modelsDir, rel);
    if (!fs.existsSync(full)) { console.error('MISSING', rel); bad++; continue; }
    const buf = await fs.promises.readFile(full);
    const hash = crypto.createHash('sha256').update(buf).digest('hex');
    if (hash !== expected) { console.error('MISMATCH', rel, hash, '!=', expected); bad++; }
    else console.log('OK', rel);
  }
  if (bad>0) {
    console.error('model verification failed', bad, 'file(s)');
    process.exit(3);
  }
  console.log('all models verified');
  process.exit(0);
})();
