import fs from 'node:fs';
import path from 'node:path';
import { DIST_DIR, ROOT } from './content-lib.mjs';

const manifestPath = path.join(DIST_DIR, 'manifest.json');
if (!fs.existsSync(manifestPath)) {
  throw new Error('Run npm run content:build before web:content');
}

const publicContentDir = path.join(ROOT, 'web', 'public', 'content');
const stageDir = path.join(ROOT, 'web', 'public', '.content-stage');
const oldDir = path.join(ROOT, 'web', 'public', '.content-old');
fs.rmSync(stageDir, { recursive: true, force: true });
fs.rmSync(oldDir, { recursive: true, force: true });
fs.mkdirSync(path.dirname(publicContentDir), { recursive: true });
fs.cpSync(DIST_DIR, stageDir, { recursive: true });
if (fs.existsSync(publicContentDir)) {
  fs.renameSync(publicContentDir, oldDir);
}
fs.renameSync(stageDir, publicContentDir);
fs.rmSync(oldDir, { recursive: true, force: true });

console.log(`Prepared PWA content at ${path.relative(ROOT, publicContentDir)}.`);
