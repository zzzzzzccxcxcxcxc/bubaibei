const {
  buildLibraryCards,
} = require('../miniprogram/pages/libraries/index');

const available = [
  { libraryId: 'core', version: '2.0.0', title: '核心词汇', bytes: 100 },
  { libraryId: 'outline', version: '1.0.0', title: '大纲词汇', bytes: 200 },
];

test('builds not-installed, installed and update-available states', () => {
  const cards = buildLibraryCards({
    available,
    installed: [
      { libraryId: 'core', version: '1.0.0' },
      { libraryId: 'outline', version: '1.0.0' },
    ],
    operations: {},
  });
  expect(cards.map((card) => card.state)).toEqual([
    'update-available',
    'installed',
  ]);
});

test('operation state overrides installed state', () => {
  const cards = buildLibraryCards({
    available,
    installed: [],
    operations: {
      core: { state: 'downloading', progress: 40 },
      outline: { state: 'error', message: '网络失败' },
    },
  });
  expect(cards[0]).toEqual(expect.objectContaining({
    state: 'downloading',
    progress: 40,
  }));
  expect(cards[1]).toEqual(expect.objectContaining({
    state: 'error',
    errorMessage: '网络失败',
  }));
});
