const BUNDLED_LIBRARIES = [
  {
    libraryId: 'core-2027-prep',
    bundleRoot: 'bundled-core/',
    subpackageName: 'core',
  },
  {
    libraryId: 'high-frequency-2027-prep',
    bundleRoot: 'bundled-hf/',
    subpackageName: 'hf',
  },
];

function createBundledProvider(wxApi) {
  const fs = wxApi.getFileSystemManager();
  const root = wxApi.env.USER_DATA_PATH;
  const loadedSubpackages = new Set();

  function loadSubpackage(name) {
    if (loadedSubpackages.has(name)) return Promise.resolve();
    return new Promise((resolve, reject) => {
      if (!wxApi.loadSubpackage) {
        loadedSubpackages.add(name);
        return resolve();
      }
      wxApi.loadSubpackage({
        name,
        success: () => {
          loadedSubpackages.add(name);
          resolve();
        },
        fail: reject,
      });
    });
  }

  function readPackageJson(relativePath) {
    return new Promise((resolve, reject) => {
      fs.readFile({
        filePath: relativePath,
        encoding: 'utf8',
        success: (res) => {
          try { resolve(JSON.parse(res.data)); } catch (e) { reject(e); }
        },
        fail: reject,
      });
    });
  }

  function copyFromPackage(packagePath, destPath) {
    return new Promise((resolve, reject) => {
      const destFull = root + '/' + destPath;
      const parent = destFull.split('/').slice(0, -1).join('/');
      fs.mkdir({
        dirPath: parent,
        recursive: true,
        success: () => {
          fs.copyFile({
            srcPath: packagePath,
            destPath: destFull,
            success: resolve,
            fail: reject,
          });
        },
        fail: reject,
      });
    });
  }

  return {
    getBundledLibraryIds() {
      return BUNDLED_LIBRARIES.map(function (b) { return b.libraryId; });
    },

    isBundled(libraryId) {
      return BUNDLED_LIBRARIES.some(function (b) { return b.libraryId === libraryId; });
    },

    async getBundledManifest(libraryId) {
      var bundle = BUNDLED_LIBRARIES.find(function (b) { return b.libraryId === libraryId; });
      if (!bundle) throw new Error('Not a bundled library: ' + libraryId);
      await loadSubpackage(bundle.subpackageName);
      return readPackageJson(bundle.bundleRoot + 'library-manifest.json');
    },

    async listBundledManifests() {
      var manifests = [];
      for (var i = 0; i < BUNDLED_LIBRARIES.length; i++) {
        var bundle = BUNDLED_LIBRARIES[i];
        await loadSubpackage(bundle.subpackageName);
        var manifest = await readPackageJson(bundle.bundleRoot + 'library-manifest.json');
        manifests.push({
          libraryId: manifest.libraryId,
          title: manifest.title,
          description: manifest.description,
          version: manifest.version,
          updatedAt: manifest.updatedAt,
          bytes: manifest.bytes,
          wordCount: manifest.wordCount,
          wordIds: manifest.wordIds,
        });
      }
      return manifests;
    },

    async stageLibrary(libraryId, stageDir) {
      var bundle = BUNDLED_LIBRARIES.find(function (b) { return b.libraryId === libraryId; });
      if (!bundle) throw new Error('Not a bundled library: ' + libraryId);
      await loadSubpackage(bundle.subpackageName);
      var manifest = await readPackageJson(bundle.bundleRoot + 'library-manifest.json');

      for (var i = 0; i < manifest.assets.length; i++) {
        var asset = manifest.assets[i];
        var packagePath = bundle.bundleRoot + asset.name;
        var destPath = stageDir + '/' + asset.name;
        await copyFromPackage(packagePath, destPath);
      }

      return manifest;
    },
  };
}

module.exports = { createBundledProvider, BUNDLED_LIBRARIES };
