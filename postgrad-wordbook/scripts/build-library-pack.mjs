import fs from 'node:fs';
import path from 'node:path';
import {
  DIST_DIR,
  loadAndValidateSources,
  sha256,
  stableJson,
} from './content-lib.mjs';

const SHARD_SIZE = 200;
const { words, libraries } = loadAndValidateSources();
const wordsById = new Map(words.map((word) => [word.id, word]));
const stageDir = `${DIST_DIR}.stage`;

fs.rmSync(stageDir, { recursive: true, force: true });
fs.mkdirSync(stageDir, { recursive: true });

function writeAsset(libraryDir, libraryId, version, name, value) {
  const content = Buffer.from(stableJson(value));
  fs.writeFileSync(path.join(libraryDir, name), content);
  return {
    name,
    fileId: `cloud://libraries/${libraryId}/${version}/${name}`,
    bytes: content.byteLength,
    sha256: sha256(content),
  };
}

const outputLibraries = libraries.map((library) => {
  const libraryDir = path.join(stageDir, library.libraryId, library.version);
  fs.mkdirSync(libraryDir, { recursive: true });
  const assets = [];
  const orderedWords = library.wordIds.map((id) => wordsById.get(id));

  for (let start = 0; start < orderedWords.length; start += SHARD_SIZE) {
    const number = String(start / SHARD_SIZE + 1).padStart(4, '0');
    assets.push(writeAsset(
      libraryDir,
      library.libraryId,
      library.version,
      `words-${number}.json`,
      orderedWords.slice(start, start + SHARD_SIZE)
    ));
  }

  assets.push(writeAsset(
    libraryDir,
    library.libraryId,
    library.version,
    'search-index.json',
    orderedWords.map((word) => ({
      id: word.id,
      word: word.word,
      initial: word.word[0].toUpperCase(),
      senseKeywords: [
        ...word.senses.flatMap((sense) => sense.definitions),
        ...(word.synonyms || []),
        ...(word.antonyms || []),
        ...(word.confusables || []),
      ],
      partOfSpeech: word.senses[0]?.partOfSpeech || '',
      importance: word.importance || '',
    }))
  ));
  assets.push(writeAsset(
    libraryDir,
    library.libraryId,
    library.version,
    'order.json',
    library.wordIds
  ));

  const bytes = assets.reduce((sum, asset) => sum + asset.bytes, 0);
  const packageDigest = sha256(Buffer.from(assets.map((asset) => asset.sha256).join('')));
  const manifest = {
    libraryId: library.libraryId,
    title: library.title,
    description: library.description || '',
    version: library.version,
    formatVersion: library.formatVersion,
    updatedAt: library.updatedAt,
    bytes,
    sha256: packageDigest,
    wordCount: library.wordIds.length,
    wordIds: library.wordIds,
    assets,
  };
  fs.writeFileSync(path.join(libraryDir, 'library-manifest.json'), stableJson(manifest));
  return manifest;
});

fs.writeFileSync(
  path.join(stageDir, 'manifest.json'),
  stableJson({ formatVersion: 1, libraries: outputLibraries })
);
fs.rmSync(DIST_DIR, { recursive: true, force: true });
fs.renameSync(stageDir, DIST_DIR);
console.log(`Built ${outputLibraries.length} library pack(s).`);
