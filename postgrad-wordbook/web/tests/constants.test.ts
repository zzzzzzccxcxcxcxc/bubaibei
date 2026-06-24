import { describe, expect, it } from 'vitest';
import { FAMILIARITY, QUIZ_TYPE } from '../src/domain/constants';

describe('browser domain constants', () => {
  it('exports the stable familiarity and quiz constants', () => {
    expect(FAMILIARITY).toEqual({
      FAMILIAR: 'familiar',
      REVIEW: 'review',
      UNKNOWN: 'unknown',
    });
    expect(QUIZ_TYPE).toEqual({
      EN_TO_ZH: 'en-to-zh',
      ZH_TO_EN: 'zh-to-en',
    });
  });
});
