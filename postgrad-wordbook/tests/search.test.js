const {
  filterOrderedIds,
  searchIndex,
} = require('../miniprogram/domain/search');

const index = [
  {
    id: 'word_abandon',
    word: 'abandon',
    initial: 'A',
    senseKeywords: ['放弃；抛弃'],
    partOfSpeech: 'v.',
  },
  {
    id: 'word_abandoned',
    word: 'abandoned',
    initial: 'A',
    senseKeywords: ['被遗弃的'],
    partOfSpeech: 'adj.',
  },
  {
    id: 'word_desert',
    word: 'desert',
    initial: 'D',
    senseKeywords: ['放弃；离弃', 'abandon'],
    partOfSpeech: 'v.',
  },
];

test('ranks exact word before prefix and definition matches', () => {
  expect(searchIndex(index, 'abandon').map((item) => item.id)).toEqual([
    'word_abandon',
    'word_abandoned',
    'word_desert',
  ]);
});

test('normalizes case and whitespace for English search', () => {
  expect(searchIndex(index, '  ABANDON ').map((item) => item.id)).toEqual([
    'word_abandon',
    'word_abandoned',
    'word_desert',
  ]);
});

test('combines library order, initial, familiarity and query ids', () => {
  const indexById = Object.fromEntries(index.map((item) => [item.id, item]));
  const stateById = {
    word_abandon: { familiarity: 'review' },
    word_abandoned: { familiarity: 'familiar' },
  };
  expect(filterOrderedIds({
    orderedIds: ['word_abandoned', 'word_abandon', 'word_desert'],
    indexById,
    stateById,
    letter: 'A',
    familiarity: ['review'],
    matchedIds: new Set(['word_abandon', 'word_desert']),
  })).toEqual(['word_abandon']);
});

test('treats empty filters as preserving the original order', () => {
  const orderedIds = ['word_desert', 'word_abandon'];
  expect(filterOrderedIds({
    orderedIds,
    indexById: Object.fromEntries(index.map((item) => [item.id, item])),
    stateById: {},
  })).toEqual(orderedIds);
});
