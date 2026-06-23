const WORD_ID_PATTERN = /^word_[a-z0-9-]+$/;
const WORD_PATTERN = /^[A-Za-z][A-Za-z -]*$/;

function validateWord(word) {
  const errors = [];

  if (!WORD_ID_PATTERN.test(word?.id || '')) {
    errors.push('invalid id');
  }
  if (!WORD_PATTERN.test(word?.word || '')) {
    errors.push('invalid word');
  }
  if (!Array.isArray(word?.senses) || word.senses.length === 0) {
    errors.push('senses requires at least one item');
  }

  (word?.examExamples || []).forEach((item, index) => {
    const required = ['translation', 'year', 'questionType', 'sourceId'];
    if (required.some((key) => !item?.[key])) {
      errors.push(
        `examExamples[${index}] requires translation, year, questionType, sourceId`
      );
    }
  });

  for (const accent of ['uk', 'us']) {
    if (!word?.audio?.[accent]) continue;
    const attribution = word?.audioAttribution?.[accent];
    if (
      !attribution?.creator
      || !attribution?.sourceUrl
      || !attribution?.license?.name
      || !attribution?.license?.url
    ) {
      errors.push(
        `audioAttribution.${accent} requires creator, sourceUrl, `
        + 'license.name, license.url'
      );
    }
  }

  if (!Array.isArray(word?.sources) || word.sources.length === 0) {
    errors.push('sources requires at least one item');
  }

  return { ok: errors.length === 0, errors };
}

module.exports = {
  WORD_ID_PATTERN,
  validateWord,
};
