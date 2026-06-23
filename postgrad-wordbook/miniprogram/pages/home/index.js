function buildHomeViewModel({ libraries = [], counts, progress = {} }) {
  const normalizedCounts = {
    familiar: counts?.familiar || 0,
    review: counts?.review || 0,
    unknown: counts?.unknown || 0,
  };
  const installedIds = new Set(libraries.map((library) => library.libraryId));
  const latest = Object.entries(progress)
    .filter(([libraryId]) => installedIds.has(libraryId))
    .sort((a, b) => (b[1]?.updatedAt || 0) - (a[1]?.updatedAt || 0))[0];
  return {
    libraries,
    counts: normalizedCounts,
    totalMarked: Object.values(normalizedCounts).reduce((sum, count) => sum + count, 0),
    continueLibraryId: latest?.[0] || libraries[0]?.libraryId || '',
  };
}

const pageDefinition = {
  data: {
    loading: true,
    libraries: [],
    counts: { familiar: 0, review: 0, unknown: 0 },
    totalMarked: 0,
    continueLibraryId: '',
  },

  async onShow() {
    const services = getApp().globalData.services;
    if (!services) return;
    try {
      const libraries = await services.libraryService.listInstalledLibraries();
      const progress = await services.progressRepository.getAllProgress();
      const wordIds = Array.from(new Set(
        libraries.reduce(
          (result, library) => result.concat(library.manifest?.wordIds || []),
          []
        )
      ));
      const counts = await services.learningRepository.getCounts(wordIds);
      this.setData({
        ...buildHomeViewModel({ libraries, counts, progress }),
        loading: false,
      });
    } catch (error) {
      console.error('Failed to load home page', error);
      this.setData({ loading: false });
      wx.showToast({ title: '首页数据加载失败', icon: 'none' });
    }
  },

  openLibraries() {
    wx.navigateTo({ url: '/pages/libraries/index' });
  },

  continueReading() {
    if (!this.data.continueLibraryId) return;
    wx.navigateTo({
      url: `/pages/reader/index?libraryId=${this.data.continueLibraryId}`,
    });
  },

  openReview() {
    wx.navigateTo({ url: '/pages/review/index' });
  },

  openQuiz() {
    wx.navigateTo({ url: '/pages/quiz-setup/index' });
  },

  openSettings() {
    wx.navigateTo({ url: '/pages/settings/index' });
  },
};

if (typeof Page === 'function') Page(pageDefinition);

module.exports = { buildHomeViewModel, pageDefinition };
