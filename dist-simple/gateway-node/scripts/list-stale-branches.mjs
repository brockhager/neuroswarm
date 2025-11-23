#!/usr/bin/env node
import { execSync } from 'child_process';
function listRemoteBranchesExcept(prune = []) {
  const out = execSync('git for-each-ref --format="%(refname:short) %(authordate:iso8601)" refs/remotes/origin', { encoding: 'utf8' });
  const lines = out.split('\n').filter(Boolean);
  const now = Date.now();
  const candidates = [];
  for (const l of lines) {
    const [name, date] = [l.split(' ')[0], l.split(' ').slice(1).join(' ')];
    if (name.endsWith('/HEAD')) continue;
    const short = name.replace('origin/', '');
    if (short === 'main' || short === 'master' || prune.includes(short)) continue;
    // compute age
    const ageDays = Math.floor((now - new Date(date).getTime()) / (1000 * 60 * 60 * 24));
    if (ageDays > 60) candidates.push({ branch: short, lastCommitDate: date, ageDays });
  }
  return candidates;
}

const pruneList = process.argv.slice(2);
const cand = listRemoteBranchesExcept(pruneList);
if (cand.length === 0) {
  console.log('No stale remote branches detected (older than 60 days)');
  process.exit(0);
}
console.log('Stale branches detected (age > 60 days):');
for (const c of cand) console.log(` - ${c.branch} (last commit ${c.lastCommitDate}, ${c.ageDays} days old)`);
console.log('\nTo delete: git push origin --delete <branch>');
