var createWxStorage = require('./adapters/storage').createWxStorage;
var createServices = require('./runtime/services').createServices;
var createMigrationService = require('./services/migration-service').createMigrationService;

App({
  globalData: {
    services: null,
    currentQuiz: null,
    quizResult: null,
  },

  async onLaunch() {
    this.globalData.services = createServices(wx);
    var storage = createWxStorage(wx);
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

  onHide() {
    this.globalData.services && this.globalData.services.audioCacheService && this.globalData.services.audioCacheService.stop();
  },
});
