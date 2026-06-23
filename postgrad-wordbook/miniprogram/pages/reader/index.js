const { getWindow } = require('../../services/reader-service');

const INITIAL_SIZE = 30;
const APPEND_SIZE = 20;
const MAX_WINDOW_SIZE = 70;

function wordsForWindow(opened, window) {
  return window.ids
    .map((id) => opened.wordsById.get(id))
    .filter(Boolean);
}

const pageDefinition = {
  data: {
    loading: true,
    libraryId: '',
    words: [],
    start: 0,
    end: 0,
    total: 0,
    fontSize: 'standard',
    stateById: {},
    scrollIntoView: '',
  },

  async onLoad(options) {
    this.libraryId = options.libraryId;
    await this.loadLibrary();
  },

  async loadLibrary() {
    const services = getApp().globalData.services;
    try {
      this.opened = await services.readerService.openLibrary(this.libraryId);
      const window = getWindow({
        orderedIds: this.opened.wordIds,
        start: 0,
        size: INITIAL_SIZE,
      });
      const stateById = await services.learningRepository.getStates(window.ids);
      const settings = await services.storage.get('settings:v1', {
        fontSize: 'standard',
      });
      this.setData({
        loading: false,
        libraryId: this.libraryId,
        words: wordsForWindow(this.opened, window),
        start: window.start,
        end: window.end,
        total: this.opened.wordIds.length,
        stateById,
        fontSize: settings.fontSize,
      });
    } catch (error) {
      console.error('Failed to open library', error);
      this.setData({ loading: false });
      wx.showToast({ title: '词库打开失败', icon: 'none' });
    }
  },

  async loadMore() {
    if (!this.opened || this.data.end >= this.opened.wordIds.length) return;
    const nextEnd = Math.min(this.opened.wordIds.length, this.data.end + APPEND_SIZE);
    const nextStart = Math.max(0, nextEnd - MAX_WINDOW_SIZE);
    const window = getWindow({
      orderedIds: this.opened.wordIds,
      start: nextStart,
      size: nextEnd - nextStart,
    });
    const stateById = await getApp().globalData.services.learningRepository
      .getStates(window.ids);
    this.setData({
      words: wordsForWindow(this.opened, window),
      start: window.start,
      end: window.end,
      stateById,
    });
  },
};

if (typeof Page === 'function') Page(pageDefinition);

module.exports = {
  APPEND_SIZE,
  INITIAL_SIZE,
  MAX_WINDOW_SIZE,
  pageDefinition,
  wordsForWindow,
};
