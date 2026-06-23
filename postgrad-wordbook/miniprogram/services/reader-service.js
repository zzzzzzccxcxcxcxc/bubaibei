function getWindow({ orderedIds, start, size }) {
  const safeStart = Math.max(0, Math.min(start, orderedIds.length));
  const end = Math.min(orderedIds.length, safeStart + Math.max(0, size));
  return {
    start: safeStart,
    end,
    ids: orderedIds.slice(safeStart, end),
  };
}

function createReaderService({ libraryRepository }) {
  const cache = new Map();

  async function openLibrary(libraryId) {
    if (cache.has(libraryId)) return cache.get(libraryId);
    const installed = await libraryRepository.getInstalled(libraryId);
    if (!installed) throw new Error(`LIBRARY_NOT_INSTALLED:${libraryId}`);
    const assetNames = installed.manifest.assets.map((asset) => asset.name);
    const shardNames = assetNames.filter((name) => /^words-\d+\.json$/.test(name));
    const [order, searchIndex, ...shards] = await Promise.all([
      libraryRepository.readAsset(libraryId, 'order.json', installed.manifest.wordIds),
      libraryRepository.readAsset(libraryId, 'search-index.json', []),
      ...shardNames.map((name) => libraryRepository.readAsset(libraryId, name, [])),
    ]);
    const wordsById = new Map(shards.flat().map((word) => [word.id, word]));
    const opened = {
      libraryId,
      installed,
      wordIds: order,
      searchIndex,
      wordsById,
      words: order.map((id) => wordsById.get(id)).filter(Boolean),
    };
    cache.set(libraryId, opened);
    return opened;
  }

  return {
    openLibrary,
    getWindow,

    clearLibraryCache(libraryId) {
      cache.delete(libraryId);
    },

    async queryWords({ libraryIds }) {
      const opened = await Promise.all(libraryIds.map(openLibrary));
      return opened.flatMap((library) => library.words);
    },
  };
}

module.exports = {
  createReaderService,
  getWindow,
};
