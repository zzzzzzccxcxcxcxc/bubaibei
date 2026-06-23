const { sha256 } = require('../miniprogram/domain/sha256');
const {
  createLearningRepository,
} = require('../miniprogram/repositories/learning-repository');
const {
  createLibraryRepository,
} = require('../miniprogram/repositories/library-repository');
const {
  createProgressRepository,
} = require('../miniprogram/repositories/progress-repository');
const {
  createLibraryService,
} = require('../miniprogram/services/library-service');
const {
  createReaderService,
} = require('../miniprogram/services/reader-service');

function jsonBuffer(value) {
  return Buffer.from(`${JSON.stringify(value, null, 2)}\n`);
}

function createPack(version, definition) {
  const words = [
    {
      id: 'word_abandon',
      word: 'abandon',
      importance: 'core',
      phonetics: { uk: "/ə'bændən/", us: '' },
      audio: { uk: '', us: '' },
      senses: [{ partOfSpeech: 'v.', definitions: [definition] }],
      collocations: [],
      morphology: [],
      memoryTips: [],
      synonyms: [],
      antonyms: [],
      confusables: [],
      examExamples: [],
      sources: [{ sourceId: 'test', fields: ['senses'] }],
    },
    {
      id: 'word_ability',
      word: 'ability',
      importance: 'core',
      phonetics: { uk: "/ə'bɪləti/", us: '' },
      audio: { uk: '', us: '' },
      senses: [{ partOfSpeech: 'n.', definitions: ['能力'] }],
      collocations: [],
      morphology: [],
      memoryTips: [],
      synonyms: [],
      antonyms: [],
      confusables: [],
      examExamples: [],
      sources: [{ sourceId: 'test', fields: ['senses'] }],
    },
  ];
  const assets = {
    'words-0001.json': jsonBuffer(words),
    'order.json': jsonBuffer(words.map((word) => word.id)),
    'search-index.json': jsonBuffer(words.map((word) => ({
      id: word.id,
      word: word.word,
      initial: word.word[0].toUpperCase(),
      senseKeywords: word.senses[0].definitions,
      partOfSpeech: word.senses[0].partOfSpeech,
      importance: word.importance,
    }))),
  };
  const assetManifest = Object.entries(assets).map(([name, content]) => ({
    name,
    fileId: `cloud://${version}/${name}`,
    bytes: content.length,
    sha256: sha256(content),
  }));
  return {
    assets,
    manifest: {
      libraryId: 'core',
      title: '核心词汇',
      version,
      formatVersion: 1,
      updatedAt: '2026-06-23T00:00:00.000Z',
      bytes: assetManifest.reduce((sum, asset) => sum + asset.bytes, 0),
      sha256: 'a'.repeat(64),
      wordCount: words.length,
      wordIds: words.map((word) => word.id),
      assets: assetManifest,
    },
  };
}

function createMemoryStorage() {
  const values = new Map();
  return {
    get: async (key, fallback) =>
      values.has(key) ? structuredClone(values.get(key)) : fallback,
    set: async (key, value) => values.set(key, structuredClone(value)),
    remove: async (key) => values.delete(key),
  };
}

function createMemoryFiles(remote) {
  const values = new Map();
  return {
    async mkdir() {},
    async removeTree(prefix) {
      for (const key of [...values.keys()]) {
        if (key === prefix || key.startsWith(`${prefix}/`)) values.delete(key);
      }
    },
    async copyVerified(tempPath, destination, expectedHash) {
      const content = remote.get(tempPath);
      if (!content || sha256(content) !== expectedHash) {
        throw new Error('CHECKSUM_MISMATCH');
      }
      values.set(destination, Buffer.from(content));
    },
    async move(fromPrefix, toPrefix) {
      for (const [key, value] of [...values.entries()]) {
        if (key === fromPrefix || key.startsWith(`${fromPrefix}/`)) {
          const suffix = key.slice(fromPrefix.length);
          values.set(`${toPrefix}${suffix}`, value);
          values.delete(key);
        }
      }
    },
    async writeJson(path, value) {
      values.set(path, jsonBuffer(value));
    },
    async readJson(path, fallback) {
      const content = values.get(path);
      return content ? JSON.parse(content.toString('utf8')) : fallback;
    },
  };
}

test('install -> read -> mark -> update preserves learning and refreshes content', async () => {
  const v1 = createPack('1.0.0', '放弃');
  const v2 = createPack('2.0.0', '放弃；抛弃');
  const packs = { '1.0.0': v1, '2.0.0': v2 };
  let currentVersion = '1.0.0';
  const remote = new Map();
  for (const [version, pack] of Object.entries(packs)) {
    for (const [name, content] of Object.entries(pack.assets)) {
      remote.set(`temp://${version}/${name}`, content);
    }
  }

  const storage = createMemoryStorage();
  const files = createMemoryFiles(remote);
  const learning = createLearningRepository(storage);
  const progress = createProgressRepository(storage);
  const repository = createLibraryRepository(storage, files);
  const reader = createReaderService({
    libraryRepository: repository,
    learningRepository: learning,
  });
  const cloud = {
    getManifest: async () => packs[currentVersion].manifest,
    listManifests: async () => [packs[currentVersion].manifest],
    download: async (fileId) => fileId.replace('cloud://', 'temp://'),
  };
  const libraries = createLibraryService({
    cloud,
    files,
    repository,
    onActivated: (libraryId) => reader.clearLibraryCache(libraryId),
  });

  await libraries.installLibrary('core');
  const first = await reader.openLibrary('core');
  expect(first.wordsById.get('word_abandon').senses[0].definitions[0])
    .toBe('放弃');

  await learning.setFamiliarity('word_abandon', 'unknown', 1000);
  await progress.saveProgress('core', {
    anchorWordId: 'word_ability',
    offsetTop: 16,
    updatedAt: 1000,
  });

  currentVersion = '2.0.0';
  await libraries.installLibrary('core');
  const updated = await reader.openLibrary('core');

  expect(updated.wordsById.get('word_abandon').senses[0].definitions[0])
    .toBe('放弃；抛弃');
  expect((await learning.getWordState('word_abandon')).familiarity)
    .toBe('unknown');
  expect((await progress.getProgress('core')).anchorWordId)
    .toBe('word_ability');
});
