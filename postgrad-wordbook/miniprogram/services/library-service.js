const { validateManifest } = require('../domain/validate-manifest');

function createLibraryService({
  cloud,
  files,
  repository,
  onActivated = () => {},
  onRemoved = () => {},
}) {
  return {
    async listAvailableLibraries() {
      return cloud.listManifests();
    },

    async listInstalledLibraries() {
      return repository.listInstalled();
    },

    async installLibrary(libraryId) {
      const manifest = await cloud.getManifest(libraryId);
      const validation = validateManifest(manifest);
      if (!validation.ok) {
        throw new Error(`INVALID_MANIFEST:${validation.errors.join('|')}`);
      }

      const stageDir = `libraries/${libraryId}/stage-${manifest.version}`;
      await files.removeTree(stageDir);
      await files.mkdir(stageDir);
      try {
        for (const asset of manifest.assets) {
          const tempPath = await cloud.download(asset.fileId);
          await files.copyVerified(
            tempPath,
            `${stageDir}/${asset.name}`,
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
