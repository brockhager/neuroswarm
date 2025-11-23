#!/usr/bin/env node
import fs from 'fs';
import path from 'path';

function timestamp() { return new Date().toISOString(); }
function wikiLog(level, ...args) { console.log(`[WIKI][${timestamp()}] ${level}:`, ...args); }

const docPath = path.join(process.cwd(), 'neuroswarm', 'docs', 'wiki', 'Home.md');
const wikiPath = path.join(process.cwd(), 'neuroswarm', 'wiki', 'Home.md');

function check(file) {
  try {
    if (!fs.existsSync(file)) return false;
    const stat = fs.statSync(file);
    if (stat.size < 200) { // small threshold for non-empty
      wikiLog('WARN', `${file} exists but is small (${stat.size} bytes)`);
      return false;
    }
    const content = fs.readFileSync(file, 'utf8').trim();
    if (!content || content.length === 0) return false;
    return true;
  } catch (e) {
    wikiLog('ERROR', `Failed to check ${file}: ${e.message}`);
    return false;
  }
}

if (check(docPath) || check(wikiPath)) {
  console.log('Home.md verified');
  process.exit(0);
} else {
  console.error('Home.md missing or empty! Ensure neuroswarm/docs/wiki/Home.md or neuroswarm/wiki/Home.md exists with content.');
  process.exit(1);
}
