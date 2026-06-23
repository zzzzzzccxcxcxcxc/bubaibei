const { createWxStorage } = require('./adapters/storage');
const { createServices } = require('./runtime/services');
const { createMigrationService } = require('./services/migration-service');

App({
  globalData: {
    services: null,
  },

  async onLaunch() {
    if (wx.cloud) {
      wx.cloud.init({ traceUser: true });
    }
    this.globalData.services = createServices(wx);
    const storage = createWxStorage(wx);
    try {
      await createMigrationService(storage).migrate();
    } catch (error) {
      console.error('Local data migration failed', error);
      wx.showToast({
        title: '本地数据升级失败，请稍后重试',
        icon: 'none',
      });
    }
  },
});
