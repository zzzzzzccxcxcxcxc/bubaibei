const { execFileSync } = require('node:child_process');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');

function run(script) {
  execFileSync(process.execPath, [script], {
    cwd: ROOT,
    stdio: 'pipe',
  });
}

test('builds a verified manifest and deterministic shards', () => {
  run('scripts/build-library-pack.mjs');
  run('scripts/verify-pack.mjs');
  const manifestPath = path.join(ROOT, 'content/dist/manifest.json');
  const first = fs.readFileSync(manifestPath);
  const manifest = JSON.parse(first);

  expect(manifest.libraries[0].sha256).toMatch(/^[a-f0-9]{64}$/);
  expect(manifest.libraries[0].wordCount).toBeGreaterThan(0);

  run('scripts/build-library-pack.mjs');
  const second = fs.readFileSync(manifestPath);
  expect(crypto.createHash('sha256').update(second).digest('hex'))
    .toBe(crypto.createHash('sha256').update(first).digest('hex'));
});
