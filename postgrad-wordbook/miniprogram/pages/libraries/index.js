function buildLibraryCards({ available = [], installed = [], operations = {} }) {
  const installedById = installed.reduce((result, library) => {
    result[library.libraryId] = library;
    return result;
  }, {});
  return available.map((library) => {
    const local = installedById[library.libraryId];
    const operation = operations[library.libraryId];
    let state = 'not-installed';
    if (local) state = local.version === library.version ? 'installed' : 'update-available';
    if (operation?.state === 'downloading') state = 'downloading';
    if (operation?.state === 'error') state = 'error';
    return {
      ...library,
      installedVersion: local?.version || '',
      state,
      progress: operation?.progress || 0,
      errorMessage: operation?.message || '',
      sizeLabel: `${Math.max(1, Math.ceil((library.bytes || 0) / 1024))} KB`,
    };
  });
}

const pageDefinition = {
  data: {
    loading: true,
    cards: [],
    operations: {},
  },

  async onShow() {
    await this.refresh();
  },

  async refresh() {
    const services = getApp().globalData.services;
    if (!services) return;
    try {
      const [available, installed] = await Promise.all([
        services.libraryService.listAvailableLibraries(),
        services.libraryService.listInstalledLibraries(),
      ]);
      this.available = available;
      this.installed = installed;
      this.setData({
        cards: buildLibraryCards({
          available,
          installed,
          operations: this.data.operations,
        }),
        loading: false,
      });
    } catch (error) {
      console.error('Failed to load libraries', error);
      this.setData({ loading: false });
      wx.showToast({ title: '词库列表加载失败', icon: 'none' });
    }
  },

  updateOperation(libraryId, operation) {
    const operations = { ...this.data.operations, [libraryId]: operation };
    this.setData({
      operations,
      cards: buildLibraryCards({
        available: this.available || [],
        installed: this.installed || [],
        operations,
      }),
    });
  },

  async install(event) {
    const libraryId = event.currentTarget.dataset.id;
    this.updateOperation(libraryId, { state: 'downloading', progress: 10 });
    try {
      await getApp().globalData.services.libraryService.installLibrary(libraryId);
      this.updateOperation(libraryId, null);
      await this.refresh();
      wx.showToast({ title: '词库已安装', icon: 'success' });
    } catch (error) {
      console.error('Library installation failed', error);
      this.updateOperation(libraryId, {
        state: 'error',
        message: error.message || '下载失败',
      });
    }
  },

  remove(event) {
    const libraryId = event.currentTarget.dataset.id;
    wx.showModal({
      title: '删除词库？',
      content: '将删除离线词库文件，但不会删除你的熟悉度标记。',
      success: async ({ confirm }) => {
        if (!confirm) return;
        await getApp().globalData.services.libraryService.removeLibrary(libraryId);
        await this.refresh();
      },
    });
  },
};

if (typeof Page === 'function') Page(pageDefinition);

module.exports = { buildLibraryCards, pageDefinition };
