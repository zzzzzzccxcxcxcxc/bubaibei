import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { validateWord } = require('../miniprogram/domain/validate-word');

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const SOURCE_DIR = path.join(ROOT, 'content', 'source');
export const DIST_DIR = path.join(ROOT, 'content', 'dist');

export function stableJson(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

export function sha256(buffer) {
  return createHash('sha256').update(buffer).digest('hex');
}

export function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

export function selectSourceFiles() {
  const hasV1 = fs.existsSync(path.join(SOURCE_DIR, 'words.v1.json'))
    && fs.existsSync(path.join(SOURCE_DIR, 'libraries.v1.json'));
  return {
    wordsPath: path.join(SOURCE_DIR, hasV1 ? 'words.v1.json' : 'words.sample.json'),
    librariesPath: path.join(
      SOURCE_DIR,
      hasV1 ? 'libraries.v1.json' : 'libraries.sample.json'
    ),
  };
}

export function loadAndValidateSources() {
  const { wordsPath, librariesPath } = selectSourceFiles();
  const words = readJson(wordsPath);
  const libraries = readJson(librariesPath);
  const errors = [];
  const ids = new Set();

  words.forEach((word, index) => {
    const result = validateWord(word);
    result.errors.forEach((error) => errors.push(`words[${index}]: ${error}`));
    if (ids.has(word.id)) errors.push(`duplicate word id: ${word.id}`);
    ids.add(word.id);
  });

  libraries.forEach((library, index) => {
    if (!/^[a-z0-9-]+$/.test(library.libraryId || '')) {
      errors.push(`libraries[${index}]: invalid libraryId`);
    }
    if (!/^\d+\.\d+\.\d+$/.test(library.version || '')) {
      errors.push(`libraries[${index}]: invalid version`);
    }
    if (!Number.isInteger(library.formatVersion) || library.formatVersion < 1) {
      errors.push(`libraries[${index}]: invalid formatVersion`);
    }
    if (!library.updatedAt || Number.isNaN(Date.parse(library.updatedAt))) {
      errors.push(`libraries[${index}]: invalid updatedAt`);
    }
    const ordered = library.wordIds || [];
    if (new Set(ordered).size !== ordered.length) {
      errors.push(`libraries[${index}]: duplicate wordIds`);
    }
    ordered.forEach((id) => {
      if (!ids.has(id)) errors.push(`libraries[${index}]: unknown word id ${id}`);
    });
  });

  if (errors.length > 0) {
    throw new Error(errors.join('\n'));
  }
  return { words, libraries };
}
