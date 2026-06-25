const { createWxAudio } = require('../adapters/audio');
const { createWxCloud } = require('../adapters/cloud');
const { createWxFiles } = require('../adapters/files');
const { createWxStorage } = require('../adapters/storage');
const {
  createLearningRepository,
} = require('../repositories/learning-repository');
const {
  createLibraryRepository,
} = require('../repositories/library-repository');
const {
  createProgressRepository,
} = require('../repositories/progress-repository');
const { createLibraryService } = require('../services/library-service');
const { createReaderService } = require('../services/reader-service');
const {
  createAudioCacheService,
} = require('../services/audio-cache-service');
const {
  createBundledProvider,
} = require('../services/bundled-provider');

function createServices(wxApi) {
  const storage = createWxStorage(wxApi);
  const files = createWxFiles(wxApi);
  const cloud = createWxCloud(wxApi);
  const bundledProvider = createBundledProvider(wxApi);
  const learningRepository = createLearningRepository(storage);
  const progressRepository = createProgressRepository(storage);
  const libraryRepository = createLibraryRepository(storage, files);
  const readerService = createReaderService({
    libraryRepository,
    learningRepository,
  });
  const libraryService = createLibraryService({
    cloud,
    bundledProvider,
    files,
    repository: libraryRepository,
    onActivated: (libraryId) => readerService.clearLibraryCache(libraryId),
    onRemoved: (libraryId) => readerService.clearLibraryCache(libraryId),
  });

  let audioCacheService = null;
  try {
    const player = createWxAudio(wxApi, files);
    const metadata = {
      async getAudioFileId(wordId, accent) {
        const installed = await libraryService.listInstalledLibraries();
        for (const library of installed) {
          if (!library.manifest?.wordIds?.includes(wordId)) continue;
          const opened = await readerService.openLibrary(library.libraryId);
          const audioName = opened.wordsById.get(wordId)?.audio?.[accent];
          if (!audioName) continue;
          if (bundledProvider.isBundled(library.libraryId)) return '';
          const asset = library.manifest.assets?.find(
            (item) => item.name === audioName
          );
          if (asset?.fileId) return asset.fileId;
        }
        return '';
      },
    };
    audioCacheService = createAudioCacheService({
      cloud,
      files,
      metadata,
      player,
      storage,
    });
  } catch (_error) {
    // Audio unavailable - app works fine without it
  }

  return {
    cloud,
    bundledProvider,
    files,
    storage,
    learningRepository,
    progressRepository,
    libraryRepository,
    libraryService,
    readerService,
    audioCacheService,
  };
}

module.exports = { createServices };
