const {
  createLearningRepository,
} = require('../miniprogram/repositories/learning-repository');

function createMemoryStorage(initial = {}) {
  const data = new Map(Object.entries(initial));
  return {
    get: async (key, fallback) => (data.has(key) ? structuredClone(data.get(key)) : fallback),
    set: async (key, value) => data.set(key, structuredClone(value)),
    remove: async (key) => data.delete(key),
    data,
  };
}

test('updates one word without replacing other learning states', async () => {
  const storage = createMemoryStorage();
  const repo = createLearningRepository(storage);
  await repo.setFamiliarity('word_abandon', 'review', 1000);
  await repo.setFamiliarity('word_ability', 'familiar', 2000);
  expect(await repo.getWordState('word_abandon')).toEqual({
    familiarity: 'review',
    updatedAt: 1000,
  });
});

test('marking the same state twice does not inflate counts', async () => {
  const storage = createMemoryStorage();
  const repo = createLearningRepository(storage);
  await repo.setFamiliarity('word_abandon', 'review', 1000);
  await repo.setFamiliarity('word_abandon', 'review', 2000);
  expect(await repo.getCounts(['word_abandon'])).toEqual({
    familiar: 0,
    review: 1,
    unknown: 0,
  });
});

test('saves only the latest quiz result', async () => {
  const storage = createMemoryStorage();
  const repo = createLearningRepository(storage);
  await repo.saveLastQuiz({ total: 2, correct: 1 });
  await repo.saveLastQuiz({ total: 5, correct: 5 });
  expect(await repo.getLastQuiz()).toEqual({ total: 5, correct: 5 });
});
