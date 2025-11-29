#!/usr/bin/env node
// Deprecated wrapper for publishUpdate — use the canonical ESM script in neuroswarm/scripts/publishUpdate.js
console.error('publishUpdate.js (deprecated) — use neuroswarm/scripts/publishUpdate.js (ESM)');
process.exit(1);
#!/usr/bin/env node
"use strict";
// publishUpdate.js (CommonJS)
const fs = require('fs');
const path = require('path');
const child_process = require('child_process');

function usageAndExit() {
  console.error('Usage: node publishUpdate.js --title "Title" --body "Body text" [--author "Author"] [--push]');
  process.exit(1);
}

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--title') opts.title = args[++i];
    else if (args[i] === '--body') opts.body = args[++i];
    else if (args[i] === '--author') opts.author = args[++i];
    else if (args[i] === '--push') opts.push = true;
    else usageAndExit();
  }
  if (!opts.title || !opts.body) usageAndExit();
  return opts;
}

async function postDiscord(webhook, payload) {
  if (!webhook) return null;
  try {
    const res = await fetch(webhook, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    const text = await res.text();
    return { ok: res.ok, status: res.status, body: text };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

async function main() {
  const opts = parseArgs();
  const author = opts.author || process.env.USER || process.env.GITHUB_ACTOR || 'unknown';
  const now = new Date().toISOString();
  // Resolve path relative to script directory
  const updatesFile = path.join(__dirname, '..', 'wiki', 'Updates.md');
  const entry = `\n## ${opts.title} - ${now} - by ${author}\n\n${opts.body}\n\n---\n`;
  fs.appendFileSync(updatesFile, entry, 'utf8');
  console.log('Appended update to', updatesFile);
  
  if (opts.push) {
    try {
      child_process.execSync('git add ' + updatesFile, { stdio: 'inherit' });
      const msg = `Update: ${opts.title}`;
      child_process.execSync('git commit -m ' + JSON.stringify(msg), { stdio: 'inherit' });
      child_process.execSync('git push', { stdio: 'inherit' });
      console.log('Pushed update commit to remote.');
    } catch (e) {
      console.error('Failed to push update commit:', e.message);
    }
  }

  const webhook = process.env.DISCORD_WEBHOOK;
  if (webhook) {
    const payload = { content: `**${opts.title}**\n${opts.body}\n_by ${author} at ${now}_` };
    const resp = await postDiscord(webhook, payload);
    console.log('Discord post result:', resp);
  } else {
    console.log('No DISCORD_WEBHOOK set; skipped posting to Discord.');
  }
}

main().catch(e => { console.error('publishUpdate failed:', e); process.exit(1); });
#!/usr/bin/env node
"use strict";
/*
  publishUpdate.js (CommonJS)
*/
const fs = require('fs');
const path = require('path');
const child_process = require('child_process');

function usageAndExit() {
  console.error('Usage: node publishUpdate.js --title "Title" --body "Body text" [--author "Author"] [--push]');
  process.exit(1);
}

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--title') opts.title = args[++i];
    else if (args[i] === '--body') opts.body = args[++i];
    else if (args[i] === '--author') opts.author = args[++i];
    else if (args[i] === '--push') opts.push = true;
    else usageAndExit();
  }
  if (!opts.title || !opts.body) usageAndExit();
  return opts;
}

async function postDiscord(webhook, payload) {
  if (!webhook) return null;
  try {
    const res = await fetch(webhook, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    const text = await res.text();
    return { ok: res.ok, status: res.status, body: text };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

async function main() {
  const opts = parseArgs();
  const author = opts.author || process.env.USER || process.env.GITHUB_ACTOR || 'unknown';
  const now = new Date().toISOString();
  // Resolve path relative to this script (neuroswarm/scripts) so it works regardless of CWD
  const updatesFile = path.join(__dirname, '..', 'wiki', 'Updates.md');
  const entry = `\n## ${opts.title} - ${now} - by ${author}\n\n${opts.body}\n\n---\n`;
  fs.appendFileSync(updatesFile, entry, 'utf8');
  console.log('Appended update to', updatesFile);
  
  if (opts.push) {
    try {
      child_process.execSync('git add ' + updatesFile, { stdio: 'inherit' });
      const msg = `Update: ${opts.title}`;
      child_process.execSync('git commit -m ' + JSON.stringify(msg), { stdio: 'inherit' });
      child_process.execSync('git push', { stdio: 'inherit' });
      console.log('Pushed update commit to remote.');
    } catch (e) {
      console.error('Failed to push update commit:', e.message);
    }
  }

  const webhook = process.env.DISCORD_WEBHOOK;
  if (webhook) {
    const payload = { content: `**${opts.title}**\n${opts.body}\n_by ${author} at ${now}_` };
    const resp = await postDiscord(webhook, payload);
    console.log('Discord post result:', resp);
  } else {
    console.log('No DISCORD_WEBHOOK set; skipped posting to Discord.');
  }
}

main().catch(e => { console.error('publishUpdate failed:', e); process.exit(1); });
#!/usr/bin/env node
/*
  publishUpdate.js
  Usage:
    NODE_OPTIONS=... node publishUpdate.js --title "Title" --body "Body text" --author "Author" --push
  Environment:
    DISCORD_WEBHOOK - Discord webhook url (optional)
    GITHUB_TOKEN - token to push commit to repo when push flag used (if running under GitHub Actions checkout will use this)
*/
import fs from 'fs';
import path from 'path';
import child_process from 'child_process';

function usageAndExit() {
  console.error('Usage: node publishUpdate.js --title "Title" --body "Body text" [--author "Author"] [--push]');
  process.exit(1);
}

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--title') opts.title = args[++i];
    else if (args[i] === '--body') opts.body = args[++i];
    else if (args[i] === '--author') opts.author = args[++i];
    else if (args[i] === '--push') opts.push = true;
    else usageAndExit();
  }
  if (!opts.title || !opts.body) usageAndExit();
  return opts;
}

async function postDiscord(webhook, payload) {
  if (!webhook) return null;
  try {
    const res = await fetch(webhook, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    const json = await res.text();
    return { ok: res.ok, status: res.status, body: json };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

async function main() {
  const opts = parseArgs();
  const author = opts.author || process.env.USER || process.env.GITHUB_ACTOR || 'unknown';
  const now = new Date().toISOString();
  const updatesFile = path.join(process.cwd(), 'neuroswarm', 'wiki', 'Updates.md');
  const entry = `\n## ${opts.title} - ${now} - by ${author}\n\n${opts.body}\n\n---\n`;
  fs.appendFileSync(updatesFile, entry, 'utf8');
  console.log('Appended update to', updatesFile);
  
  if (opts.push) {
    try {
      child_process.execSync('git add ' + updatesFile, { stdio: 'inherit' });
      const msg = `Update: ${opts.title}`;
      child_process.execSync('git commit -m ' + JSON.stringify(msg), { stdio: 'inherit' });
      // use token if present by adjusting git remote url; if in GH Actions checkout with GITHUB_TOKEN already set
      child_process.execSync('git push', { stdio: 'inherit' });
      console.log('Pushed update commit to remote.');
    } catch (e) {
      console.error('Failed to push update commit:', e.message);
    }
  }

  const webhook = process.env.DISCORD_WEBHOOK;
  if (webhook) {
    const payload = { content: `**${opts.title}**\n${opts.body}\n_by ${author} at ${now}_` };
    const resp = await postDiscord(webhook, payload);
    console.log('Discord post result:', resp);
  } else {
    console.log('No DISCORD_WEBHOOK set; skipped posting to Discord.');
  }
}

main().catch(e => { console.error('publishUpdate failed:', e); process.exit(1); });
