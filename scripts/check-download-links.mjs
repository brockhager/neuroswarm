#!/usr/bin/env node
/*
 * check-download-links.mjs
 * Validates that only the canonical Download.md file contains direct release download links.
 * Fails if any other wiki file under `neuroswarm/wiki` or `neuroswarm/docs/wiki` contains direct release links.
 * Also ensures `neuroswarm/wiki/Download.md` exists and is non-empty.
 */

import fs from 'fs';
import path from 'path';

function findFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const e of entries) {
    if (e.isDirectory()) {
      files.push(...findFiles(path.join(dir, e.name)));
    } else if (e.isFile() && e.name.endsWith('.md')) {
      files.push(path.join(dir, e.name));
    }
  }
  return files;
}

function hasDownloadLink(content) {
  const patterns = [
    /https:\/\/github\.com\/(?:[^\/]+)\/(?:[^\/]+)\/releases\/latest\/download\//i,
    /https:\/\/github\.com\/(?:[^\/]+)\/(?:[^\/]+)\/releases\/download\//i,
    /releases\/latest\/download\//i
  ];
  return patterns.some(p => p.test(content));
}

function check() {
  const wikiDir = path.join(process.cwd(), 'neuroswarm', 'wiki');
  const docsWikiDir = path.join(process.cwd(), 'neuroswarm', 'docs', 'wiki');
  const errors = [];

  // Ensure Download.md exists and is non-empty
  const dlPath = path.join(wikiDir, 'Download.md');
  if (!fs.existsSync(dlPath)) {
    errors.push(`ERROR: ${dlPath} missing`);
  } else {
    const dlContent = fs.readFileSync(dlPath, 'utf8').trim();
    if (dlContent.length === 0) errors.push(`ERROR: ${dlPath} is empty`);
  }

  // Scan wiki files
  const wikiFiles = findFiles(wikiDir).concat(findFiles(docsWikiDir));
  for (const f of wikiFiles) {
    const basename = path.basename(f);
    if (basename.toLowerCase() === 'download.md') continue; // allowed
    const content = fs.readFileSync(f, 'utf8');
    if (hasDownloadLink(content)) {
      errors.push(`Direct download link found in ${f}`);
    }
  }

  if (errors.length > 0) {
    for (const e of errors) console.error(e);
    process.exit(1);
  }
  console.log('OK: No direct download links outside Download.md and Download.md is non-empty');
}

check();
