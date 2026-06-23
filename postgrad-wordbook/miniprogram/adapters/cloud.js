function createWxCloud(wxApi) {
  async function callManifest(data = {}) {
    const result = await wxApi.cloud.callFunction({
      name: 'getLibraryManifest',
      data,
    });
    return result.result;
  }

  return {
    async listManifests() {
      const result = await callManifest();
      return result.libraries || [];
    },

    async getManifest(libraryId) {
      const result = await callManifest({ libraryId });
      if (!result.library) throw new Error(`LIBRARY_NOT_FOUND:${libraryId}`);
      return result.library;
    },

    async download(fileId) {
      const result = await wxApi.cloud.downloadFile({ fileID: fileId });
      return result.tempFilePath;
    },
  };
}

module.exports = { createWxCloud };
