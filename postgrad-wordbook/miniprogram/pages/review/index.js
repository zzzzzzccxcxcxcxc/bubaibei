function validateReviewSelection({ libraryIds = [], familiarity = [] }) {
  if (libraryIds.length === 0) {
    return { ok: false, message: '请选择至少一个已下载词库' };
  }
  if (familiarity.length === 0) {
    return { ok: false, message: '请选择至少一种熟悉度' };
  }
  return { ok: true, message: '' };
}

function buildReviewUrl({ libraryIds, familiarity }) {
  return '/pages/reader/index?mode=review'
    + `&libraryIds=${encodeURIComponent(libraryIds.join(','))}`
    + `&familiarity=${encodeURIComponent(familiarity.join(','))}`;
}

const pageDefinition = {
  data: {
    loading: true,
    libraries: [],
    libraryIds: [],
    familiarity: ['review', 'unknown'],
    familiarityChecks: {
      familiar: false,
      review: true,
      unknown: true,
    },
  },

  async onLoad() {
    const libraries = await getApp().globalData.services.libraryService
      .listInstalledLibraries();
    this.setData({
      loading: false,
      libraries,
      libraryIds: libraries.map((library) => library.libraryId),
    });
  },

  onLibrariesChange(event) {
    this.setData({ libraryIds: event.detail.value });
  },

  onFamiliarityChange(event) {
    const familiarity = event.detail.value;
    this.setData({
      familiarity,
      familiarityChecks: {
        familiar: familiarity.includes('familiar'),
        review: familiarity.includes('review'),
        unknown: familiarity.includes('unknown'),
      },
    });
  },

  startReview() {
    const selection = {
      libraryIds: this.data.libraryIds,
      familiarity: this.data.familiarity,
    };
    const validation = validateReviewSelection(selection);
    if (!validation.ok) {
      wx.showToast({ title: validation.message, icon: 'none' });
      return;
    }
    wx.navigateTo({ url: buildReviewUrl(selection) });
  },
};

if (typeof Page === 'function') Page(pageDefinition);

module.exports = {
  buildReviewUrl,
  pageDefinition,
  validateReviewSelection,
};
