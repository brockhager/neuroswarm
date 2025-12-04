const assert = require('assert');
const { validateAttachment, sanitizeFileName } = require('../src/lib/file_validation');

(async function run() {
  console.log('Running Agent9 artifact validation unit tests...');

  // 1) valid small file and safeName
  const ok = validateAttachment({ name: 'readme.md', size: 1024 });
  assert.ok(ok.valid, 'Small md file should be valid');
  assert.ok(ok.safeName && ok.safeName.endsWith('.md'), 'safeName preserves extension');

  // 2) too large file fails
  const tooLarge = validateAttachment({ name: 'big.mov', size: 10 * 1024 * 1024 }, { maxBytes: 1024 * 1024 });
  assert.ok(!tooLarge.valid && tooLarge.reason === 'size_exceeds_limit', 'Large file should be rejected for size');

  // 3) disallowed extension
  const exeBad = validateAttachment({ name: 'malware.exe', size: 1024 });
  assert.ok(!exeBad.valid && exeBad.reason === 'invalid_extension', 'exe should be rejected by default allowed types');

  // 4) sanitize name test
  const weird = validateAttachment({ name: 'a<>b?weird name.pdf', size: 1024 });
  assert.ok(weird.valid, 'pdf allowed');
  assert.ok(weird.safeName.indexOf(' ') === -1 && weird.safeName.indexOf('<') === -1, 'safeName should remove spaces and special chars');

  console.log('\nALL ARTIFACT VALIDATION TESTS PASSED');
  process.exit(0);
})();
