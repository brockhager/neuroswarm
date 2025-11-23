#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import AdmZip from 'adm-zip';

function usage() {
  console.log('Usage: node validate-zip.mjs <zipPath> [expectedFile1 expectedFile2 ...]');
  process.exit(2);
}

const args = process.argv.slice(2);
if (args.length < 1) usage();
const zipPath = path.resolve(args[0]);
const expected = args.slice(1);
if (!fs.existsSync(zipPath)) {
  console.error('ERROR: zip file not found:', zipPath);
  process.exit(1);
}

try {
  const zip = new AdmZip(zipPath);
  const entries = zip.getEntries().map(e => e.entryName.replace(/\\\\/g, '/'));
  // Basic integrity check: attempt to extract entries to memory
  for (const e of zip.getEntries()) {
    // call getData to ensure entry is readable
    e.getData();
  }
  // Validate expected entries
  let missing = [];
  for (const ex of expected) {
    if (ex.includes('node_modules/')) {
      // match any entry that starts with the expected path
      const prefix = ex.replace(/\\\/$/, '');
      if (!entries.some(e => e.startsWith(prefix))) missing.push(ex);
      continue;
    }
    // exact match for simple files
    if (!entries.includes(ex)) missing.push(ex);
  }
  if (missing.length > 0) {
    console.error('ERROR: missing expected entries in zip:', missing.join(', '));
    process.exit(1);
  }
  console.log('OK: ZIP is valid and contains expected files.');
  process.exit(0);
} catch (e) {
  console.error('ERROR: ZIP validation failed:', e.message);
  process.exit(1);
}
