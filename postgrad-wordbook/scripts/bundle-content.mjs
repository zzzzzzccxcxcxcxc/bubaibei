import fs from 'node:fs';
import path from 'node:path';
import { DIST_DIR, ROOT } from './content-lib.mjs';

const BUNDLES = [
  {
    libraryId: 'core-2027-prep',
    dir: path.join(ROOT, 'miniprogram', 'bundled-core'),
    filter: (name) => /^(words-\d+\.json|order\.json|search-index\.json)$/.test(name),
  },
  {
    libraryId: 'high-frequency-2027-prep',
    dir: path.join(ROOT, 'miniprogram', 'bundled-hf'),
    filter: (name) => /^(words-\d+\.json|order\.json|search-index\.json)$/.test(name),
  },
];

const manifestPath = path.join(DIST_DIR, 'manifest.json');
if (!fs.existsSync(manifestPath)) {
  throw new Error('Run npm run content:build before npm run content:bundle');
}

const topLevel = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

for (const bundle of BUNDLES) {
  const libMeta = topLevel.libraries.find((l) => l.libraryId === bundle.libraryId);
  if (!libMeta) throw new Error(`Library not found in manifest: ${bundle.libraryId}`);

  const versionDir = path.join(DIST_DIR, libMeta.libraryId, libMeta.version);
  const libManifest = JSON.parse(
    fs.readFileSync(path.join(versionDir, 'library-manifest.json'), 'utf8')
  );

  // Clean and recreate bundle directory
  fs.rmSync(bundle.dir, { recursive: true, force: true });
  fs.mkdirSync(bundle.dir, { recursive: true });

  // Copy only word/data files (no audio)
  for (const asset of libManifest.assets) {
    if (!bundle.filter(asset.name)) continue;
    const src = path.join(versionDir, asset.name);
    if (!fs.existsSync(src)) {
      console.warn(`  Skipping missing: ${asset.name}`);
      continue;
    }
    const dest = path.join(bundle.dir, asset.name);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(src, dest);
  }

  // Write a local manifest with empty fileIds
  const localAssets = libManifest.assets
    .filter((a) => bundle.filter(a.name) && fs.existsSync(path.join(versionDir, a.name)))
    .map((a) => ({ ...a, fileId: '' }));

  const manifest = {
    ...libMeta,
    assets: localAssets,
    wordIds: libMeta.wordIds,
  };

  fs.writeFileSync(
    path.join(bundle.dir, 'library-manifest.json'),
    JSON.stringify(manifest, null, 2)
  );

  const totalBytes = localAssets.reduce((sum, a) => sum + a.bytes, 0);
  console.log(`Bundled ${bundle.libraryId}: ${localAssets.length} files, ${(totalBytes / 1024).toFixed(0)} KB`);
}
