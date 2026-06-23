const { QUIZ_TYPE } = require('../../domain/constants');
const { buildSession } = require('../../domain/quiz');

const QUESTION_COUNTS = [10, 20, 30, 50];

const pageDefinition = {
  data: {
    loading: true,
    libraries: [],
    libraryIds: [],
    familiarity: [],
    type: QUIZ_TYPE.EN_TO_ZH,
    questionCounts: QUESTION_COUNTS,
    countIndex: 1,
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
    this.setData({ familiarity: event.detail.value });
  },

  onTypeChange(event) {
    this.setData({ type: event.detail.value });
  },

  onCountChange(event) {
    this.setData({ countIndex: Number(event.detail.value) });
  },

  async startQuiz() {
    if (this.data.libraryIds.length === 0) {
      wx.showToast({ title: '请先选择已下载词库', icon: 'none' });
      return;
    }
    const services = getApp().globalData.services;
    const words = await services.readerService.queryWords({
      libraryIds: this.data.libraryIds,
      familiarity: this.data.familiarity,
    });
    if (words.length < 2) {
      wx.showToast({ title: '当前范围单词不足，至少需要 2 个', icon: 'none' });
      return;
    }
    const count = QUESTION_COUNTS[this.data.countIndex];
    const session = buildSession({
      type: this.data.type,
      words,
      count,
    });
    const wordsById = words.reduce((result, word) => {
      result[word.id] = word;
      return result;
    }, {});
    getApp().globalData.currentQuiz = {
      session,
      wordsById,
    };
    wx.navigateTo({ url: '/pages/quiz-session/index' });
  },
};

if (typeof Page === 'function') Page(pageDefinition);

module.exports = {
  QUESTION_COUNTS,
  pageDefinition,
};
