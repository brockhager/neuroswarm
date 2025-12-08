import fs from 'fs';
import path from 'path';

const file = path.join(process.cwd(), 'monitoring', 'prometheus', 'rules', 'sync-alerts.yml');

try {
  const raw = fs.readFileSync(file, 'utf8');

  if (!raw.includes('alert:')) {
    console.error('No alert rules found in', file);
    process.exit(2);
  }

  // Basic checks: ensure each rule has alert, expr, for, labels, annotations
  const rules = raw.split(/- alert:/g).slice(1);
  const missing = [];
  rules.forEach((r, i) => {
    const nameMatch = r.match(/\s*([A-Za-z0-9_-]+)/);
    const heading = nameMatch ? nameMatch[1] : `rule#${i}`;

    const checks = ['expr:', 'for:', 'labels:', 'annotations:'];
    checks.forEach((c) => { if (!r.includes(c)) missing.push({ rule: heading, missing: c }); });
  });

  if (missing.length > 0) {
    console.error('Validation failed — missing fields in rules:');
    missing.forEach(m => console.error(` - ${m.rule}: missing ${m.missing}`));
    process.exit(3);
  }

  console.log('OK — Basic sync-alerts.yml validation passed');
  process.exit(0);
} catch (err) {
  console.error('Error during validation:', err.message);
  process.exit(1);
}
