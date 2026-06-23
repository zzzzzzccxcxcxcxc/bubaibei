const pageDefinition = {
  data: {
    result: null,
    wrongWords: [],
  },

  async onLoad() {
    const app = getApp();
    const result = app.globalData.quizResult
      || await app.globalData.services.learningRepository.getLastQuiz();
    const wordsById = app.globalData.currentQuiz?.wordsById || {};
    this.setData({
      result,
      wrongWords: (result?.wrongWordIds || [])
        .map((id) => wordsById[id])
        .filter(Boolean),
    });
  },

  async markWrongWords(event) {
    const familiarity = event.currentTarget.dataset.state;
    const wordIds = this.data.result?.wrongWordIds || [];
    await Promise.all(wordIds.map((wordId) =>
      getApp().globalData.services.learningRepository
        .setFamiliarity(wordId, familiarity, Date.now())
    ));
    wx.showToast({ title: '错词已标记', icon: 'success' });
  },

  restart() {
    wx.redirectTo({ url: '/pages/quiz-setup/index' });
  },

  goHome() {
    wx.reLaunch({ url: '/pages/home/index' });
  },
};

if (typeof Page === 'function') Page(pageDefinition);

module.exports = { pageDefinition };
