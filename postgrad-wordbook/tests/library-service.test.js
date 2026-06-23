const {
  createLibraryService,
} = require('../miniprogram/services/library-service');

function createHarness({ corrupt = false } = {}) {
  const events = [];
  let installed = {
    core: {
      libraryId: 'core',
      version: '1.0.0',
      path: 'libraries/core/1.0.0',
    },
  };
  const manifest = {
    libraryId: 'core',
    title: '核心词汇',
    version: '2.0.0',
    formatVersion: 1,
    updatedAt: '2026-06-23T00:00:00.000Z',
    bytes: 10,
    sha256: 'a'.repeat(64),
    wordCount: 1,
    wordIds: ['word_abandon'],
    assets: [
      {
        name: 'words-0001.json',
        fileId: 'cloud://words-0001.json',
        bytes: 10,
        sha256: 'b'.repeat(64),
      },
    ],
  };
  const files = {
    removeTree: jest.fn(async (path) => events.push(['removeTree', path])),
    mkdir: jest.fn(async (path) => events.push(['mkdir', path])),
    copyVerified: jest.fn(async (source, destination) => {
      events.push(['copyVerified', source, destination]);
      if (corrupt) throw new Error('CHECKSUM_MISMATCH');
    }),
  };
  const cloud = {
    getManifest: jest.fn(async () => manifest),
    download: jest.fn(async () => '/tmp/asset'),
  };
  const repository = {
    listInstalled: jest.fn(async () => Object.values(installed)),
    activate: jest.fn(async (libraryId, nextManifest, stageDir) => {
      installed = {
        ...installed,
        [libraryId]: {
          libraryId,
          version: nextManifest.version,
          path: stageDir,
        },
      };
    }),
    remove: jest.fn(async (libraryId) => {
      delete installed[libraryId];
    }),
  };
  return {
    service: createLibraryService({ cloud, files, repository }),
    cloud,
    events,
    files,
    manifest,
    repository,
  };
}

test('keeps installed v1 when v2 checksum fails', async () => {
  const { service, repository } = createHarness({ corrupt: true });
  await expect(service.installLibrary('core')).rejects.toThrow('CHECKSUM_MISMATCH');
  expect(repository.activate).not.toHaveBeenCalled();
  expect(await service.listInstalledLibraries()).toEqual([
    expect.objectContaining({ version: '1.0.0' }),
  ]);
});

test('downloads every asset before activating a library', async () => {
  const { service, repository, files, manifest } = createHarness();
  await service.installLibrary('core');
  expect(files.copyVerified).toHaveBeenCalledWith(
    '/tmp/asset',
    'libraries/core/stage-2.0.0/words-0001.json',
    manifest.assets[0].sha256
  );
  expect(repository.activate).toHaveBeenCalledWith(
    'core',
    manifest,
    'libraries/core/stage-2.0.0'
  );
});

test('removes installed files without touching learning storage', async () => {
  const { service, repository } = createHarness();
  await service.removeLibrary('core');
  expect(repository.remove).toHaveBeenCalledWith('core');
  expect(await service.listInstalledLibraries()).toEqual([]);
});

test('lists public manifests through the cloud adapter', async () => {
  const { service, cloud, manifest } = createHarness();
  cloud.listManifests = jest.fn(async () => [manifest]);
  await expect(service.listAvailableLibraries()).resolves.toEqual([manifest]);
});
