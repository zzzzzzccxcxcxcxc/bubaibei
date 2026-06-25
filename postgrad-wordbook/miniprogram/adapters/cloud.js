function createWxCloud(wxApi) {
  return {
    async listManifests() {
      try {
        var result = await wxApi.cloud.callFunction({
          name: 'getLibraryManifest',
          data: {},
        });
        return (result.result && result.result.libraries) ? result.result.libraries : [];
      } catch (_e) {
        return [];
      }
    },

    async getManifest(libraryId) {
      var result = await wxApi.cloud.callFunction({
        name: 'getLibraryManifest',
        data: { libraryId: libraryId },
      });
      if (result.result && result.result.library) return result.result.library;
      throw new Error('LIBRARY_NOT_FOUND:' + libraryId);
    },

    async download(fileId) {
      var result = await wxApi.cloud.downloadFile({ fileID: fileId });
      return result.tempFilePath;
    },
  };
}

module.exports = { createWxCloud };
