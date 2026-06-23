const { QUIZ_TYPE } = require('./constants');

function primarySense(word) {
  const sense = word?.senses?.[0] || {};
  return {
    definition: sense.definitions?.[0] || '',
    partOfSpeech: sense.partOfSpeech || '',
  };
}

function optionFor(word, type, correct) {
  const sense = primarySense(word);
  return {
    id: word.id,
    label: type === QUIZ_TYPE.EN_TO_ZH ? sense.definition : word.word,
    partOfSpeech: sense.partOfSpeech,
    correct,
  };
}

function rotate(values, random) {
  if (values.length < 2) return values;
  const offset = Math.floor(random() * values.length) % values.length;
  return values.slice(offset).concat(values.slice(0, offset));
}

function uniqueCandidates(words, type, target) {
  const seenLabels = new Set([
    optionFor(target, type, true).label.toLocaleLowerCase('en-US'),
  ]);
  return words.filter((word) => {
    if (word.id === target.id) return false;
    const label = optionFor(word, type, false).label;
    if (!label) return false;
    const key = label.toLocaleLowerCase('en-US');
    if (seenLabels.has(key)) return false;
    seenLabels.add(key);
    return true;
  });
}

function buildQuestion({
  type,
  target,
  pool,
  random = Math.random,
  optionCount = 4,
}) {
  if (!Object.values(QUIZ_TYPE).includes(type)) {
    throw new Error(`INVALID_QUIZ_TYPE:${type}`);
  }
  const targetSense = primarySense(target);
  const candidates = uniqueCandidates(pool, type, target)
    .map((word, position) => {
      const sense = primarySense(word);
      return {
        word,
        position,
        samePartOfSpeech: sense.partOfSpeech === targetSense.partOfSpeech,
        sameImportance: word.importance === target.importance,
      };
    })
    .sort((left, right) => (
      Number(right.samePartOfSpeech) - Number(left.samePartOfSpeech)
      || Number(right.sameImportance) - Number(left.sameImportance)
      || left.position - right.position
    ))
    .slice(0, Math.max(1, optionCount - 1))
    .map(({ word }) => optionFor(word, type, false));

  const correctOption = optionFor(target, type, true);
  const options = rotate([correctOption, ...candidates], random);

  return {
    wordId: target.id,
    type,
    prompt: type === QUIZ_TYPE.EN_TO_ZH
      ? target.word
      : targetSense.definition,
    options,
  };
}

function shuffledCopy(values, random) {
  const result = values.slice();
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }
  return result;
}

function buildSession({
  type,
  words,
  count,
  random = Math.random,
}) {
  const targets = shuffledCopy(words, random).slice(
    0,
    Math.min(Math.max(0, count), words.length)
  );
  return {
    type,
    questions: targets.map((target) => buildQuestion({
      type,
      target,
      pool: words,
      random,
    })),
  };
}

function scoreSession(answers) {
  const correct = answers.filter((answer) => answer.correct).length;
  const wrongWordIds = Array.from(new Set(
    answers.filter((answer) => !answer.correct).map((answer) => answer.wordId)
  ));
  return {
    total: answers.length,
    correct,
    accuracy: answers.length === 0
      ? 0
      : Math.round((correct / answers.length) * 100),
    wrongWordIds,
  };
}

module.exports = {
  buildQuestion,
  buildSession,
  primarySense,
  scoreSession,
};
