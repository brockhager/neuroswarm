import fs from 'fs';
import path from 'path';

describe('E2E runner integration', () => {
  const root = path.join(__dirname, '..');

  test('bash e2e runner uses standardized migration script', () => {
    const script = path.join(root, 'e2e-test.sh');
    expect(fs.existsSync(script)).toBe(true);
    const content = fs.readFileSync(script, 'utf8');
    expect(content).toMatch(/run-migrations\.sh/);
  });

  test('powershell e2e runner uses standardized migration script', () => {
    const script = path.join(root, 'e2e-test.ps1');
    expect(fs.existsSync(script)).toBe(true);
    const content = fs.readFileSync(script, 'utf8');
    expect(content).toMatch(/run-migrations\.ps1/);
  });
});
