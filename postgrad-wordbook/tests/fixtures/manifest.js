const validManifest = {
  libraryId: 'core',
  title: '考研英语核心词汇',
  version: '1.0.0',
  formatVersion: 1,
  updatedAt: '2026-06-23T00:00:00.000Z',
  bytes: 1234,
  sha256: 'a'.repeat(64),
  wordCount: 2,
  wordIds: ['word_abandon', 'word_ability'],
  assets: [
    {
      name: 'words-0001.json',
      fileId: 'cloud://libraries/core/1.0.0/words-0001.json',
      bytes: 900,
      sha256: 'b'.repeat(64),
    },
  ],
};

module.exports = { validManifest };
