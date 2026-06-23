const { validateWord } = require('../miniprogram/domain/validate-word');
const { validateManifest } = require('../miniprogram/domain/validate-manifest');
const { validWord } = require('./fixtures/words');
const { validManifest } = require('./fixtures/manifest');

test('accepts a complete sourced word entry', () => {
  expect(validateWord(validWord)).toEqual({ ok: true, errors: [] });
});

test('rejects an exam quote without year, type, translation, and source', () => {
  const word = structuredClone(validWord);
  word.examExamples[0] = { text: 'A short sentence.' };
  expect(validateWord(word).errors).toContain(
    'examExamples[0] requires translation, year, questionType, sourceId'
  );
});

test('rejects a word without senses or source records', () => {
  const word = { ...validWord, senses: [], sources: [] };
  expect(validateWord(word)).toEqual({
    ok: false,
    errors: [
      'senses requires at least one item',
      'sources requires at least one item',
    ],
  });
});

test('accepts a versioned library manifest', () => {
  expect(validateManifest(validManifest)).toEqual({ ok: true, errors: [] });
});

test('rejects a manifest without sha256 or stable unique word ids', () => {
  const manifest = {
    ...validManifest,
    sha256: '',
    wordIds: ['bad id', 'bad id'],
  };
  const result = validateManifest(manifest);
  expect(result.ok).toBe(false);
  expect(result.errors).toEqual(expect.arrayContaining([
    'invalid sha256',
    'wordIds contains invalid id: bad id',
    'wordIds contains duplicates',
  ]));
});
