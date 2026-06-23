const {
  createProgressRepository,
} = require('../miniprogram/repositories/progress-repository');

test('stores progress independently per library', async () => {
  const data = new Map();
  const storage = {
    get: async (key, fallback) => (data.has(key) ? data.get(key) : fallback),
    set: async (key, value) => data.set(key, structuredClone(value)),
  };
  const repo = createProgressRepository(storage);
  await repo.saveProgress('core', {
    anchorWordId: 'word_abandon',
    offsetTop: 16,
    updatedAt: 1000,
  });
  await repo.saveProgress('outline', {
    anchorWordId: 'word_ability',
    offsetTop: 8,
    updatedAt: 2000,
  });
  expect(await repo.getProgress('core')).toEqual({
    anchorWordId: 'word_abandon',
    offsetTop: 16,
    updatedAt: 1000,
  });
});
