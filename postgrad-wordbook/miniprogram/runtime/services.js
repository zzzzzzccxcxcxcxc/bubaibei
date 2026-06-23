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
  return {
    cloud,
    files,
    storage,
    learningRepository,
    progressRepository,
    libraryRepository,
    libraryService,
  };
}

module.exports = { createServices };
