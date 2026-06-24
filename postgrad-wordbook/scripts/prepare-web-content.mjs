import fs from 'node:fs';
import path from 'node:path';
import { DIST_DIR, ROOT } from './content-lib.mjs';

const manifestPath = path.join(DIST_DIR, 'manifest.json');
if (!fs.existsSync(manifestPath)) {
  throw new Error('Run npm run content:build before web:content');
}

const publicContentDir = path.join(ROOT, 'web', 'public', 'content');
fs.rmSync(publicContentDir, { recursive: true, force: true });
fs.mkdirSync(path.dirname(publicContentDir), { recursive: true });
fs.cpSync(DIST_DIR, publicContentDir, { recursive: true });

console.log(`Prepared PWA content at ${path.relative(ROOT, publicContentDir)}.`);
