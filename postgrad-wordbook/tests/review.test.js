const {
  buildReviewUrl,
  validateReviewSelection,
} = require('../miniprogram/pages/review/index');
const {
  componentDefinition,
} = require('../miniprogram/components/word-entry/index');

test('review route requires at least one downloaded library', () => {
  expect(validateReviewSelection({
    libraryIds: [],
    familiarity: ['review'],
  })).toEqual({
    ok: false,
    message: '请选择至少一个已下载词库',
  });
});

test('review route requires at least one familiarity state', () => {
  expect(validateReviewSelection({
    libraryIds: ['core'],
    familiarity: [],
  })).toEqual({
    ok: false,
    message: '请选择至少一种熟悉度',
  });
});

test('builds an encoded multi-library review route', () => {
  expect(buildReviewUrl({
    libraryIds: ['core', 'outline'],
    familiarity: ['review', 'unknown'],
  })).toBe(
    '/pages/reader/index?mode=review'
    + '&libraryIds=core%2Coutline&familiarity=review%2Cunknown'
  );
});

test('word entry emits a stable familiarity-change event', () => {
  const triggerEvent = jest.fn();
  componentDefinition.methods.markFamiliarity.call({
    data: { word: { id: 'word_abandon' } },
    triggerEvent,
  }, {
    currentTarget: { dataset: { state: 'review' } },
  });
  expect(triggerEvent).toHaveBeenCalledWith('familiaritychange', {
    wordId: 'word_abandon',
    familiarity: 'review',
  });
});
