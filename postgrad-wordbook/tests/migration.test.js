const {
  createMigrationService,
} = require('../miniprogram/services/migration-service');

function createMemoryStorage(initial = {}) {
  const data = new Map(Object.entries(initial));
  return {
    get: async (key, fallback) => (data.has(key) ? structuredClone(data.get(key)) : fallback),
    set: async (key, value) => data.set(key, structuredClone(value)),
    data,
  };
}

test('migrates v0 known flags to v1 familiarity states', async () => {
  const storage = createMemoryStorage({
    'learning:v0': {
      word_abandon: { known: true, updatedAt: 10 },
      word_ability: { known: false, updatedAt: 20 },
    },
    'migration:version': 0,
  });
  const service = createMigrationService(storage);
  await service.migrate();
  expect(storage.data.get('learning:v1')).toEqual({
    words: {
      word_abandon: { familiarity: 'familiar', updatedAt: 10 },
      word_ability: { familiarity: 'unknown', updatedAt: 20 },
    },
    lastQuiz: null,
  });
  expect(storage.data.get('migration:version')).toBe(1);
});

test('does not advance version or overwrite v1 when migration fails', async () => {
  const storage = createMemoryStorage({
    'learning:v0': { word_abandon: null },
    'learning:v1': { words: { keep: true }, lastQuiz: null },
    'migration:version': 0,
  });
  const service = createMigrationService(storage);
  await expect(service.migrate()).rejects.toThrow('INVALID_V0_LEARNING_STATE');
  expect(storage.data.get('learning:v1')).toEqual({
    words: { keep: true },
    lastQuiz: null,
  });
  expect(storage.data.get('migration:version')).toBe(0);
});
