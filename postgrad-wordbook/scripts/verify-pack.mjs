import fs from 'node:fs';
import path from 'node:path';
import { DIST_DIR, readJson, sha256 } from './content-lib.mjs';

const manifestPath = path.join(DIST_DIR, 'manifest.json');
if (!fs.existsSync(manifestPath)) {
  throw new Error('MISSING_DIST_MANIFEST');
}

const manifest = readJson(manifestPath);
for (const library of manifest.libraries || []) {
  const digests = [];
  let bytes = 0;
  for (const asset of library.assets || []) {
    const filePath = path.join(
      DIST_DIR,
      library.libraryId,
      library.version,
      asset.name
    );
    const content = fs.readFileSync(filePath);
    const digest = sha256(content);
    if (digest !== asset.sha256) throw new Error(`CHECKSUM_MISMATCH:${asset.name}`);
    if (content.byteLength !== asset.bytes) throw new Error(`BYTE_COUNT_MISMATCH:${asset.name}`);
    digests.push(digest);
    bytes += content.byteLength;
  }
  if (bytes !== library.bytes) throw new Error(`LIBRARY_BYTES_MISMATCH:${library.libraryId}`);
  const packageDigest = sha256(Buffer.from(digests.join('')));
  if (packageDigest !== library.sha256) {
    throw new Error(`LIBRARY_CHECKSUM_MISMATCH:${library.libraryId}`);
  }
}

console.log(`Verified ${manifest.libraries.length} library pack(s).`);
