const { validateManifest } = require('../domain/validate-manifest');

const NOOP_BUNDLED_PROVIDER = {
  isBundled: () => false,
  getBundledManifest: () => { throw new Error('NOT_BUNDLED'); },
  listBundledManifests: async () => [],
  stageLibrary: () => { throw new Error('NOT_BUNDLED'); },
};

function createLibraryService({
  cloud,
  bundledProvider = NOOP_BUNDLED_PROVIDER,
  files,
  repository,
  onActivated = () => {},
  onRemoved = () => {},
}) {
  async function listCloudManifests() {
    try {
      return cloud.listManifests();
    } catch (_error) {
      return [];
    }
  }

  return {
    async listAvailableLibraries() {
      const bundled = await bundledProvider.listBundledManifests();
      const cloudLibs = await listCloudManifests();
      const bundledIds = new Set(bundled.map((b) => b.libraryId));
      const remoteOnly = cloudLibs.filter((c) => !bundledIds.has(c.libraryId));
      return [...bundled, ...remoteOnly];
    },

    async listInstalledLibraries() {
      return repository.listInstalled();
    },

    async installLibrary(libraryId) {
      if (bundledProvider.isBundled(libraryId)) {
        const manifest = await bundledProvider.getBundledManifest(libraryId);
        const validation = validateManifest(manifest);
        if (!validation.ok) {
          throw new Error('INVALID_MANIFEST:' + validation.errors.join('|'));
        }
        const stageDir = 'libraries/' + libraryId + '/stage-' + manifest.version;
        await files.removeTree(stageDir);
        await files.mkdir(stageDir);
        try {
          await bundledProvider.stageLibrary(libraryId, stageDir);
          const installed = await repository.activate(libraryId, manifest, stageDir);
          await onActivated(libraryId, installed);
          return installed;
        } catch (error) {
          await files.removeTree(stageDir);
          throw error;
        }
      }

      const manifest = await cloud.getManifest(libraryId);
      const validation = validateManifest(manifest);
      if (!validation.ok) {
        throw new Error('INVALID_MANIFEST:' + validation.errors.join('|'));
      }

      const stageDir = 'libraries/' + libraryId + '/stage-' + manifest.version;
      await files.removeTree(stageDir);
      await files.mkdir(stageDir);
      try {
        for (const asset of manifest.assets) {
          const tempPath = await cloud.download(asset.fileId);
          await files.copyVerified(
            tempPath,
            stageDir + '/' + asset.name,
            asset.sha256
          );
        }
        const installed = await repository.activate(libraryId, manifest, stageDir);
        await onActivated(libraryId, installed);
        return installed;
      } catch (error) {
        await files.removeTree(stageDir);
        throw error;
      }
    },

    async removeLibrary(libraryId) {
      await repository.remove(libraryId);
      await onRemoved(libraryId);
    },
  };
}

module.exports = { createLibraryService };
