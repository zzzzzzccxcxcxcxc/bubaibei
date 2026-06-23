const { scoreSession } = require('../../domain/quiz');

function presentQuestion(question, selectedId = '') {
  return {
    ...question,
    options: question.options.map((option) => ({
      ...option,
      selected: option.id === selectedId,
      state: selectedId
        ? (option.correct ? 'correct' : (option.id === selectedId ? 'wrong' : ''))
        : '',
    })),
  };
}

const pageDefinition = {
  data: {
    index: 0,
    total: 0,
    progressText: '',
    question: null,
    answered: false,
    selectedId: '',
  },

  onLoad() {
    const currentQuiz = getApp().globalData.currentQuiz;
    if (!currentQuiz?.session?.questions?.length) {
      wx.showToast({ title: '测试已失效，请重新开始', icon: 'none' });
      wx.navigateBack();
      return;
    }
    this.session = currentQuiz.session;
    this.answers = [];
    this.showQuestion(0);
  },

  showQuestion(index) {
    const question = this.session.questions[index];
    this.setData({
      index,
      total: this.session.questions.length,
      progressText: `${index + 1} / ${this.session.questions.length}`,
      question: presentQuestion(question),
      answered: false,
      selectedId: '',
    });
  },

  selectOption(event) {
    if (this.data.answered) return;
    const selectedId = event.currentTarget.dataset.id;
    const question = this.session.questions[this.data.index];
    const option = question.options.find((item) => item.id === selectedId);
    this.answers.push({
      wordId: question.wordId,
      selectedId,
      correct: Boolean(option?.correct),
    });
    this.setData({
      question: presentQuestion(question, selectedId),
      answered: true,
      selectedId,
    });
  },

  async nextQuestion() {
    if (!this.data.answered) {
      wx.showToast({ title: '请先选择答案', icon: 'none' });
      return;
    }
    const nextIndex = this.data.index + 1;
    if (nextIndex < this.session.questions.length) {
      this.showQuestion(nextIndex);
      return;
    }
    const result = {
      ...scoreSession(this.answers),
      answers: this.answers,
      finishedAt: Date.now(),
    };
    await getApp().globalData.services.learningRepository.saveLastQuiz(result);
    getApp().globalData.quizResult = result;
    wx.redirectTo({ url: '/pages/quiz-result/index' });
  },
};

if (typeof Page === 'function') Page(pageDefinition);

module.exports = {
  pageDefinition,
  presentQuestion,
};
