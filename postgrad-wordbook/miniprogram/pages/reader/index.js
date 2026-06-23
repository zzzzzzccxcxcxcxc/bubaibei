const { getWindow } = require('../../services/reader-service');
const { createProgressSaver } = require('../../services/progress-saver');

const INITIAL_SIZE = 30;
const APPEND_SIZE = 20;
const MAX_WINDOW_SIZE = 70;
const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

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
    query: '',
    letter: '',
    familiarity: [],
    familiarityChecks: {
      familiar: false,
      review: false,
      unknown: false,
    },
    letters: LETTERS,
    empty: false,
  },

  async onLoad(options) {
    this.mode = options.mode || 'library';
    this.libraryIds = options.libraryIds
      ? decodeURIComponent(options.libraryIds).split(',').filter(Boolean)
      : [options.libraryId].filter(Boolean);
    this.libraryId = this.libraryIds[0];
    const initialFamiliarity = options.familiarity
      ? decodeURIComponent(options.familiarity).split(',').filter(Boolean)
      : [];
    this.setData({
      familiarity: initialFamiliarity,
      familiarityChecks: {
        familiar: initialFamiliarity.includes('familiar'),
        review: initialFamiliarity.includes('review'),
        unknown: initialFamiliarity.includes('unknown'),
      },
    });
    this.progressSaver = createProgressSaver(
      getApp().globalData.services.progressRepository,
      500
    );
    await this.loadLibrary();
  },

  async loadLibrary() {
    const services = getApp().globalData.services;
    try {
      if (this.mode === 'review' || this.libraryIds.length > 1) {
        const words = await services.readerService.queryWords({
          libraryIds: this.libraryIds,
          familiarity: this.data.familiarity,
        });
        this.opened = {
          wordIds: words.map((word) => word.id),
          wordsById: new Map(words.map((word) => [word.id, word])),
        };
      } else {
        this.opened = await services.readerService.openLibrary(this.libraryId);
      }
      this.activeIds = this.opened.wordIds.slice();
      const progress = this.mode === 'library'
        ? await services.progressRepository.getProgress(this.libraryId)
        : null;
      const anchorIndex = progress?.anchorWordId
        ? this.activeIds.indexOf(progress.anchorWordId)
        : -1;
      const initialStart = Math.max(0, anchorIndex - 3);
      const window = getWindow({
        orderedIds: this.activeIds,
        start: initialStart,
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
        total: this.activeIds.length,
        stateById,
        fontSize: settings.fontSize,
        scrollIntoView: progress?.anchorWordId
          ? `entry-anchor-${progress.anchorWordId}`
          : '',
      });
    } catch (error) {
      console.error('Failed to open library', error);
      this.setData({ loading: false });
      wx.showToast({ title: '词库打开失败', icon: 'none' });
    }
  },

  async loadMore() {
    if (!this.opened || this.data.end >= this.activeIds.length) return;
    const nextEnd = Math.min(this.activeIds.length, this.data.end + APPEND_SIZE);
    const nextStart = Math.max(0, nextEnd - MAX_WINDOW_SIZE);
    const window = getWindow({
      orderedIds: this.activeIds,
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

  async applyFilters() {
    const words = await getApp().globalData.services.readerService.queryWords({
      libraryIds: this.libraryIds,
      familiarity: this.data.familiarity,
      letter: this.data.letter,
      query: this.data.query,
    });
    words.forEach((word) => this.opened.wordsById.set(word.id, word));
    this.activeIds = words.map((word) => word.id);
    const window = getWindow({
      orderedIds: this.activeIds,
      start: 0,
      size: INITIAL_SIZE,
    });
    const stateById = await getApp().globalData.services.learningRepository
      .getStates(window.ids);
    this.setData({
      words: wordsForWindow(this.opened, window),
      start: window.start,
      end: window.end,
      total: this.activeIds.length,
      stateById,
      empty: this.activeIds.length === 0,
      scrollIntoView: '',
    });
  },

  onSearchInput(event) {
    this.setData({ query: event.detail.value });
    if (this.searchTimer) clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => void this.applyFilters(), 250);
  },

  selectLetter(event) {
    const selected = event.currentTarget.dataset.letter;
    this.setData({ letter: this.data.letter === selected ? '' : selected });
    void this.applyFilters();
  },

  onFamiliarityFilter(event) {
    const familiarity = event.detail.value;
    this.setData({
      familiarity,
      familiarityChecks: {
        familiar: familiarity.includes('familiar'),
        review: familiarity.includes('review'),
        unknown: familiarity.includes('unknown'),
      },
    });
    void this.applyFilters();
  },

  clearFilters() {
    this.setData({
      query: '',
      letter: '',
      familiarity: [],
      familiarityChecks: {
        familiar: false,
        review: false,
        unknown: false,
      },
    });
    void this.applyFilters();
  },

  isDefaultReading() {
    return this.mode === 'library'
      && !this.data.query
      && !this.data.letter
      && this.data.familiarity.length === 0;
  },

  onReaderScroll() {
    if (!this.isDefaultReading()) return;
    if (this.captureTimer) clearTimeout(this.captureTimer);
    this.captureTimer = setTimeout(() => void this.captureProgress(), 300);
  },

  captureProgress() {
    if (!this.isDefaultReading() || !this.progressSaver) return Promise.resolve();
    return new Promise((resolve) => {
      wx.createSelectorQuery()
        .selectAll('.entry-anchor')
        .fields({ id: true, dataset: true, rect: true }, (nodes = []) => {
          const visible = nodes
            .filter((node) => node.bottom > 70)
            .sort((left, right) => left.top - right.top)[0];
          if (visible?.dataset?.wordId) {
            this.progressSaver.schedule(this.libraryId, {
              anchorWordId: visible.dataset.wordId,
              offsetTop: visible.top,
              updatedAt: Date.now(),
            });
          }
          resolve();
        })
        .exec();
    });
  },

  async onHide() {
    if (this.captureTimer) clearTimeout(this.captureTimer);
    await this.captureProgress();
    if (this.progressSaver) await this.progressSaver.flush();
  },

  async onUnload() {
    if (this.searchTimer) clearTimeout(this.searchTimer);
    await this.onHide();
  },

  async onFamiliarityChange(event) {
    const { wordId, familiarity } = event.detail;
    await getApp().globalData.services.learningRepository
      .setFamiliarity(wordId, familiarity, Date.now());
    this.setData({
      [`stateById.${wordId}`]: {
        familiarity,
        updatedAt: Date.now(),
      },
    });
    if (this.mode === 'review' || this.data.familiarity.length > 0) {
      await this.applyFilters();
    }
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
