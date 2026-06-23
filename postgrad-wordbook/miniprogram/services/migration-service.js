const { DATA_VERSION, FAMILIARITY } = require('../domain/constants');
const { LEARNING_KEY } = require('../repositories/learning-repository');

const MIGRATION_VERSION_KEY = 'migration:version';

function migrateLearningV0(value) {
  const words = {};
  for (const [wordId, state] of Object.entries(value || {})) {
    if (!state || typeof state.known !== 'boolean') {
      throw new Error('INVALID_V0_LEARNING_STATE');
    }
    words[wordId] = {
      familiarity: state.known ? FAMILIARITY.FAMILIAR : FAMILIARITY.UNKNOWN,
      updatedAt: state.updatedAt || 0,
    };
  }
  return { words, lastQuiz: null };
}

function createMigrationService(storage) {
  return {
    async migrate() {
      const version = await storage.get(MIGRATION_VERSION_KEY, DATA_VERSION);
      if (version === DATA_VERSION) {
        return { migrated: false, version };
      }
      if (version !== 0) {
        throw new Error(`UNSUPPORTED_DATA_VERSION:${version}`);
      }

      const oldLearning = await storage.get('learning:v0', {});
      const nextLearning = migrateLearningV0(oldLearning);
      await storage.set(LEARNING_KEY, nextLearning);
      await storage.set(MIGRATION_VERSION_KEY, DATA_VERSION);
      return { migrated: true, version: DATA_VERSION };
    },
  };
}

module.exports = {
  MIGRATION_VERSION_KEY,
  createMigrationService,
  migrateLearningV0,
};
