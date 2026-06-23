function createProgressSaver(repository, delay = 500) {
  let timer = null;
  let pending = null;

  async function flush() {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    if (!pending) return;
    const current = pending;
    pending = null;
    await repository.saveProgress(current.libraryId, current.value);
  }

  return {
    schedule(libraryId, value) {
      pending = { libraryId, value };
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        void flush();
      }, delay);
    },
    flush,
  };
}

module.exports = { createProgressSaver };
