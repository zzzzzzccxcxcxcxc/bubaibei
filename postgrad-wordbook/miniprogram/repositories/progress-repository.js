const PROGRESS_KEY = 'progress:v1';

function createProgressRepository(storage) {
  async function read() {
    return storage.get(PROGRESS_KEY, {});
  }

  return {
    async getProgress(libraryId) {
      const progress = await read();
      return progress[libraryId] || null;
    },

    async getAllProgress() {
      return read();
    },

    async saveProgress(libraryId, value) {
      const progress = await read();
      progress[libraryId] = value;
      await storage.set(PROGRESS_KEY, progress);
      return value;
    },
  };
}

module.exports = {
  PROGRESS_KEY,
  createProgressRepository,
};
