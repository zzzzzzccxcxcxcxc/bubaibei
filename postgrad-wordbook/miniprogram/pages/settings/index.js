const SETTINGS_KEY = 'settings:v1';

const pageDefinition = {
  data: {
    fontSize: 'standard',
    accent: 'uk',
    cacheLabel: '0 MB',
  },

  async onLoad() {
    const services = getApp().globalData.services;
    const settings = await services.storage.get(SETTINGS_KEY, {
      fontSize: 'standard',
      accent: 'uk',
    });
    this.setData(settings);
  },

  async changeFontSize(event) {
    await this.save({ fontSize: event.detail.value });
  },

  async changeAccent(event) {
    await this.save({ accent: event.detail.value });
  },

  async save(patch) {
    const next = { ...this.data, ...patch };
    this.setData(next);
    await getApp().globalData.services.storage.set(SETTINGS_KEY, {
      fontSize: next.fontSize,
      accent: next.accent,
    });
  },

  async clearAudioCache() {
    const audioCache = getApp().globalData.services.audioCacheService;
    if (audioCache) await audioCache.clearCache();
    this.setData({ cacheLabel: '0 MB' });
    wx.showToast({ title: '音频缓存已清理', icon: 'success' });
  },
};

if (typeof Page === 'function') Page(pageDefinition);

module.exports = { SETTINGS_KEY, pageDefinition };
