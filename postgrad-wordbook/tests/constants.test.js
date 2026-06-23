const {
  FAMILIARITY,
  QUIZ_TYPE,
  DATA_VERSION,
} = require('../miniprogram/domain/constants');

test('exports stable v1 domain constants', () => {
  expect(FAMILIARITY).toEqual({
    FAMILIAR: 'familiar',
    REVIEW: 'review',
    UNKNOWN: 'unknown',
  });
  expect(QUIZ_TYPE).toEqual({
    EN_TO_ZH: 'en-to-zh',
    ZH_TO_EN: 'zh-to-en',
  });
  expect(DATA_VERSION).toBe(1);
});
