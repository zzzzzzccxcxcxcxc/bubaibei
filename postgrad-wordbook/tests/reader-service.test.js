const {
  createReaderService,
  getWindow,
} = require('../miniprogram/services/reader-service');

test('returns a bounded reader window', () => {
  const ids = Array.from({ length: 1000 }, (_, index) => `word_${index}`);
  expect(getWindow({ orderedIds: ids, start: 490, size: 30 })).toEqual({
    start: 490,
    end: 520,
    ids: ids.slice(490, 520),
  });
});

test('clamps a reader window to list boundaries', () => {
  expect(getWindow({ orderedIds: ['a', 'b'], start: -2, size: 30 })).toEqual({
    start: 0,
    end: 2,
    ids: ['a', 'b'],
  });
});

test('opens installed library order and word shards', async () => {
  const repository = {
    getInstalled: async () => ({
      libraryId: 'core',
      manifest: {
        wordIds: ['word_abandon', 'word_ability'],
        assets: [
          { name: 'words-0001.json' },
          { name: 'search-index.json' },
          { name: 'order.json' },
        ],
      },
    }),
    readAsset: async (_libraryId, name) => ({
      'words-0001.json': [
        { id: 'word_abandon', word: 'abandon' },
        { id: 'word_ability', word: 'ability' },
      ],
      'order.json': ['word_ability', 'word_abandon'],
      'search-index.json': [],
    }[name]),
  };
  const service = createReaderService({ libraryRepository: repository });
  const opened = await service.openLibrary('core');
  expect(opened.wordIds).toEqual(['word_ability', 'word_abandon']);
  expect(opened.words.map((word) => word.word)).toEqual(['ability', 'abandon']);
});
