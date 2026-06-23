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

function createServices(wxApi) {
  const storage = createWxStorage(wxApi);
  const files = createWxFiles(wxApi);
  const cloud = createWxCloud(wxApi);
  const learningRepository = createLearningRepository(storage);
  const progressRepository = createProgressRepository(storage);
  const libraryRepository = createLibraryRepository(storage, files);
  const libraryService = createLibraryService({
    cloud,
    files,
    repository: libraryRepository,
  });
  const readerService = createReaderService({
    libraryRepository,
    learningRepository,
  });
  const player = createWxAudio(wxApi, files);
  const metadata = {
    async getAudioFileId(wordId, accent) {
      const installed = await libraryService.listInstalledLibraries();
      for (const library of installed) {
        if (!library.manifest?.wordIds?.includes(wordId)) continue;
        const opened = await readerService.openLibrary(library.libraryId);
        const fileId = opened.wordsById.get(wordId)?.audio?.[accent];
        if (fileId) return fileId;
      }
      return '';
    },
  };
  const audioCacheService = createAudioCacheService({
    cloud,
    files,
    metadata,
    player,
    storage,
  });
  return {
    cloud,
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
