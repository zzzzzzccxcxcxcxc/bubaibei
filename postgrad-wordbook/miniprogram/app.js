const { createWxStorage } = require('./adapters/storage');
const { createMigrationService } = require('./services/migration-service');

App({
  async onLaunch() {
    if (wx.cloud) {
      wx.cloud.init({ traceUser: true });
    }
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
