const INSTALLED_LIBRARIES_KEY = 'libraries:installed:v1';

function createLibraryRepository(storage, files) {
  async function readInstalledMap() {
    return storage.get(INSTALLED_LIBRARIES_KEY, {});
  }

  return {
    async listInstalled() {
      return Object.values(await readInstalledMap());
    },

    async getInstalled(libraryId) {
      const installed = await readInstalledMap();
      return installed[libraryId] || null;
    },

    async activate(libraryId, manifest, stageDir) {
      const installed = await readInstalledMap();
      const previous = installed[libraryId] || null;
      const targetDir = `libraries/${libraryId}/${manifest.version}`;
      await files.removeTree(targetDir);
      await files.move(stageDir, targetDir);
      if (previous) {
        await files.writeJson(`libraries/${libraryId}/previous.json`, previous);
      }
      const current = {
        libraryId,
        title: manifest.title,
        version: manifest.version,
        updatedAt: manifest.updatedAt,
        wordCount: manifest.wordCount,
        bytes: manifest.bytes,
        path: targetDir,
        manifest,
      };
      await files.writeJson(`libraries/${libraryId}/current.json`, current);
      installed[libraryId] = current;
      await storage.set(INSTALLED_LIBRARIES_KEY, installed);
      if (previous?.path && previous.path !== targetDir) {
        await files.removeTree(previous.path);
      }
      return current;
    },

    async remove(libraryId) {
      const installed = await readInstalledMap();
      delete installed[libraryId];
      await files.removeTree(`libraries/${libraryId}`);
      await storage.set(INSTALLED_LIBRARIES_KEY, installed);
    },

    async readAsset(libraryId, assetName, fallback = null) {
      const current = await this.getInstalled(libraryId);
      if (!current) return fallback;
      return files.readJson(`${current.path}/${assetName}`, fallback);
    },
  };
}

module.exports = {
  INSTALLED_LIBRARIES_KEY,
  createLibraryRepository,
};
