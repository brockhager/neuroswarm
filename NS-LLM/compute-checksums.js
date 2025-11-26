const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

async function walk(dir) {
  const files = await fs.promises.readdir(dir);
  let out = [];
  for (const f of files) {
    const full = path.join(dir, f);
    const stat = await fs.promises.stat(full);
    if (stat.isDirectory()) out = out.concat(await walk(full));
    else out.push(full);
  }
  return out;
}

(async function() {
  const modelsDir = path.join(__dirname, 'models');
  const outFile = path.join(modelsDir, 'checksums.txt');
  if (!fs.existsSync(modelsDir)) {
    console.error('models dir not found');
    process.exit(2);
  }
  const files = (await walk(modelsDir)).filter(f => f !== outFile);
  const out = [];
  for (const f of files) {
    const buf = await fs.promises.readFile(f);
    const hash = crypto.createHash('sha256').update(buf).digest('hex');
    out.push(`${hash}  ${path.relative(modelsDir, f).replace(/\\/g,'/')}`);
  }
  await fs.promises.writeFile(outFile, out.join('\n') + '\n');
  console.log('wrote', outFile);
})();
