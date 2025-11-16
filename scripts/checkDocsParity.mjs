#!/usr/bin/env node
import fs from 'fs';
import path from 'path';

function listMdFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  const items = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const it of items) {
    if (it.isDirectory()) {
      const sub = listMdFiles(path.join(dir, it.name));
      for (const s of sub) files.push(path.join(it.name, s));
    } else if (it.isFile() && it.name.endsWith('.md')) {
      files.push(it.name);
    }
  }
  return files;
}

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = { docs: 'neuroswarm/docs', wiki: 'neuroswarm/wiki', ci: false };
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--docs') opts.docs = args[++i];
    else if (a === '--wiki') opts.wiki = args[++i];
    else if (a === '--ci') opts.ci = true;
  }
  return opts;
}

function basenameNoExt(p) {
  return path.basename(p, path.extname(p));
}

function readfileSafe(file) {
  try { return fs.readFileSync(file, 'utf8'); } catch(e) { return null; }
}

async function main() {
  const opts = parseArgs();
  const docsRoot = path.resolve(opts.docs);
  const wikiRoot = path.resolve(opts.wiki);

  const docs = listMdFiles(docsRoot).map(f => ({ name: f, path: path.join(docsRoot, f) }));
  const wiki = listMdFiles(wikiRoot).map(f => ({ name: f, path: path.join(wikiRoot, f) }));

  const docsMap = new Map(docs.map(d => [basenameNoExt(d.name), d.path]));
  const wikiMap = new Map(wiki.map(w => [basenameNoExt(w.name), w.path]));

  const missingInWiki = [];
  const missingInDocs = [];
  const diffed = [];

  for (const [k, v] of docsMap) {
    if (!wikiMap.has(k)) missingInWiki.push({ name: k, docsPath: v });
    else {
      const d1 = readfileSafe(v) || '';
      const d2 = readfileSafe(wikiMap.get(k)) || '';
      if (d1.trim() !== d2.trim()) diffed.push({ name: k, docsPath: v, wikiPath: wikiMap.get(k) });
    }
  }
  for (const [k, v] of wikiMap) {
    if (!docsMap.has(k)) missingInDocs.push({ name: k, wikiPath: v });
  }

  const out = { missingInWiki, missingInDocs, diffed };
  console.log(JSON.stringify(out, null, 2));

  if (opts.ci) {
    if (missingInDocs.length || missingInWiki.length || diffed.length) {
      console.error('Docs parity issues detected (see details above).');
      process.exit(1);
    }
  }
}

main().catch(e => { console.error('checkDocsParity failed', e); process.exit(2); });
