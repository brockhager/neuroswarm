import fs from 'fs';
import path from 'path';

describe('migration runners', () => {
  const migrationsDir = path.join(__dirname, '..', 'migrations');

  test('bash runner exists (run-migrations.sh)', () => {
    const file = path.join(migrationsDir, 'run-migrations.sh');
    expect(fs.existsSync(file)).toBe(true);
    const content = fs.readFileSync(file, 'utf8');
    // sancheck for psql usage
    expect(content.toLowerCase()).toMatch('psql');
  });

  test('powershell runner exists (run-migrations.ps1)', () => {
    const file = path.join(migrationsDir, 'run-migrations.ps1');
    expect(fs.existsSync(file)).toBe(true);
    const content = fs.readFileSync(file, 'utf8');
    // sanity-check: ensure it checks for env vars
    expect(content.toLowerCase()).toMatch('pghost');
    expect(content.toLowerCase()).toMatch('pguser');
  });

  test('there is at least one sql migration file', () => {
    const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql'));
    expect(files.length).toBeGreaterThan(0);
  });
});
