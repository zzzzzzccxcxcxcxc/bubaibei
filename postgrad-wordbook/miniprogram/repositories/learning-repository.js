const { FAMILIARITY } = require('../domain/constants');

const LEARNING_KEY = 'learning:v1';
const VALID_FAMILIARITY = new Set(Object.values(FAMILIARITY));
function createLearningRepository(storage) {
  async function read() {
    return storage.get(LEARNING_KEY, { words: {}, lastQuiz: null });
  }

  async function write(value) {
    await storage.set(LEARNING_KEY, value);
  }

  return {
    async getWordState(wordId) {
      const state = await read();
      return state.words[wordId] || null;
    },

    async setFamiliarity(wordId, familiarity, now = Date.now()) {
      if (!VALID_FAMILIARITY.has(familiarity)) {
        throw new Error(`INVALID_FAMILIARITY:${familiarity}`);
      }
      const state = await read();
      state.words[wordId] = { familiarity, updatedAt: now };
      await write(state);
      return state.words[wordId];
    },

    async getCounts(wordIds) {
      const state = await read();
      const counts = { familiar: 0, review: 0, unknown: 0 };
      wordIds.forEach((wordId) => {
        const familiarity = state.words[wordId]?.familiarity;
        if (Object.hasOwn(counts, familiarity)) {
          counts[familiarity] += 1;
        }
      });
      return counts;
    },

    async getStates(wordIds) {
      const state = await read();
      return Object.fromEntries(
        wordIds
          .filter((wordId) => state.words[wordId])
          .map((wordId) => [wordId, state.words[wordId]])
      );
    },

    async saveLastQuiz(result) {
      const state = await read();
      state.lastQuiz = result;
      await write(state);
    },

    async getLastQuiz() {
      const state = await read();
      return state.lastQuiz;
    },
  };
}

module.exports = {
  LEARNING_KEY,
  createLearningRepository,
};
