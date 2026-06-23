import fs from 'node:fs';
import path from 'node:path';
import { DIST_DIR, ROOT, readJson, stableJson } from './content-lib.mjs';

const prefix = String(process.env.CLOUD_FILE_PREFIX || '').replace(/\/+$/, '');
if (!/^cloud:\/\/[^/]+$/.test(prefix)) {
  throw new Error(
    'CLOUD_FILE_PREFIX must look like cloud://environment.bucket'
  );
}

const manifestPath = path.join(DIST_DIR, 'manifest.json');
if (!fs.existsSync(manifestPath)) {
  throw new Error('Run npm run content:build before cloud:prepare');
}

const deploymentDir = path.join(ROOT, 'deployment');
const cloudStorageDir = path.join(deploymentDir, 'cloud-storage');
fs.rmSync(deploymentDir, { recursive: true, force: true });
fs.mkdirSync(cloudStorageDir, { recursive: true });

const sourceManifest = readJson(manifestPath);
const libraries = sourceManifest.libraries.map((library) => ({
  ...library,
  assets: library.assets.map((asset) => {
    const cloudPath = [
      'libraries',
      library.libraryId,
      library.version,
      asset.name,
    ].join('/');
    const source = path.join(
      DIST_DIR,
      library.libraryId,
      library.version,
      asset.name
    );
    const destination = path.join(cloudStorageDir, cloudPath);
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.copyFileSync(source, destination);
    return {
      ...asset,
      cloudPath,
      fileId: `${prefix}/${cloudPath}`,
    };
  }),
}));

fs.writeFileSync(
  path.join(deploymentDir, 'public_config.library_manifest.json'),
  stableJson({
    _id: 'library_manifest',
    formatVersion: sourceManifest.formatVersion,
    libraries,
  })
);
fs.writeFileSync(
  path.join(deploymentDir, 'README.txt'),
  [
    '1. Upload everything below cloud-storage/ to the same cloud storage path.',
    '2. Import public_config.library_manifest.json into collection public_config.',
    '3. Deploy cloudfunctions/getLibraryManifest with cloud dependencies.',
    '',
  ].join('\n')
);

console.log(`Prepared ${libraries.length} libraries for ${prefix}.`);
