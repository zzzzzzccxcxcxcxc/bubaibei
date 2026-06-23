const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');

test('prepares cloud storage files and a database manifest with real prefix', () => {
  execFileSync(process.execPath, ['scripts/build-library-pack.mjs'], {
    cwd: ROOT,
  });
  execFileSync(process.execPath, ['scripts/prepare-cloud-deploy.mjs'], {
    cwd: ROOT,
    env: {
      ...process.env,
      CLOUD_FILE_PREFIX: 'cloud://test-env.test-bucket',
    },
  });

  const document = JSON.parse(fs.readFileSync(
    path.join(ROOT, 'deployment/public_config.library_manifest.json'),
    'utf8'
  ));
  const firstAsset = document.libraries[0].assets[0];
  expect(firstAsset.fileId).toMatch(
    /^cloud:\/\/test-env\.test-bucket\/libraries\//
  );
  expect(fs.existsSync(path.join(
    ROOT,
    'deployment/cloud-storage',
    firstAsset.cloudPath
  ))).toBe(true);
});
