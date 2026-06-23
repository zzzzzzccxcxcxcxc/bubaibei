const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');

test('library pack includes every referenced local pronunciation asset', () => {
  execFileSync(process.execPath, ['scripts/build-library-pack.mjs'], {
    cwd: ROOT,
  });
  const manifest = JSON.parse(fs.readFileSync(
    path.join(ROOT, 'content/dist/manifest.json'),
    'utf8'
  ));
  const core = manifest.libraries.find(
    (library) => library.libraryId === 'core-2027-prep'
  );
  const audioAssets = core.assets.filter(
    (asset) => asset.name.startsWith('audio/')
  );
  expect(audioAssets.length).toBeGreaterThanOrEqual(100);
  for (const asset of audioAssets) {
    expect(fs.existsSync(path.join(
      ROOT,
      'content/dist',
      core.libraryId,
      core.version,
      asset.name
    ))).toBe(true);
  }
});
