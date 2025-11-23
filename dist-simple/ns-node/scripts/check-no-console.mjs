#!/usr/bin/env node
import { execSync } from 'child_process';

try {
  // Ensure this is a git repository; otherwise, skip this check
  try {
    const inside = execSync('git rev-parse --is-inside-work-tree', { encoding: 'utf8' }).trim();
    if (inside !== 'true') {
      console.warn('Not a git repo; skipping check-no-console');
      process.exit(0);
    }
  } catch (e) {
    console.warn('Not a git repo (git rev-parse failed); skipping check-no-console');
    process.exit(0);
  }
  const out = execSync('git grep -n -- "console\\.\\(log\\|warn\\|error\\)" -- neuroswarm/*-node || true', { encoding: 'utf8' });
  if (!out || out.trim().length === 0) {
    console.log('No console.* occurrences found in neuroswarm/*-node');
    process.exit(0);
  }
  const filtered = out.split('\n').filter(line => {
    if (!line || !line.trim()) return false;
    // Allow the wrapper's internal console.log lines and exclude public assets
    if (/function log|\/public\/|start-windows.bat|\[GW\]|\[NS\]|\[VP\]/.test(line)) return false;
    return true;
  });
  if (filtered.length > 0) {
    console.error('Found console.* occurrences in neuroswarm runtime sources:');
    console.error(filtered.join('\n'));
    process.exit(1);
  }
  console.log('No unauthorized console.* occurrences in runtime node sources');
  process.exit(0);
} catch (e) {
  console.error('Failed to run check-no-console:', e);
  process.exit(1);
}
