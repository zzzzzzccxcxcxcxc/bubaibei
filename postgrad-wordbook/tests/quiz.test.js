const {
  buildQuestion,
  buildSession,
  scoreSession,
} = require('../miniprogram/domain/quiz');
const { QUIZ_TYPE } = require('../miniprogram/domain/constants');

const words = {
  abandon: {
    id: 'word_abandon',
    word: 'abandon',
    importance: 'core',
    senses: [{ partOfSpeech: 'v.', definitions: ['放弃；抛弃'] }],
  },
  retain: {
    id: 'word_retain',
    word: 'retain',
    importance: 'core',
    senses: [{ partOfSpeech: 'v.', definitions: ['保留；保持'] }],
  },
  establish: {
    id: 'word_establish',
    word: 'establish',
    importance: 'core',
    senses: [{ partOfSpeech: 'v.', definitions: ['建立；确立'] }],
  },
  basic: {
    id: 'word_basic',
    word: 'basic',
    importance: 'core',
    senses: [{ partOfSpeech: 'adj.', definitions: ['基本的'] }],
  },
  capacity: {
    id: 'word_capacity',
    word: 'capacity',
    importance: 'core',
    senses: [{ partOfSpeech: 'n.', definitions: ['容量；能力'] }],
  },
};

test('builds an EN_TO_ZH question with one correct option', () => {
  const question = buildQuestion({
    type: QUIZ_TYPE.EN_TO_ZH,
    target: words.abandon,
    pool: Object.values(words),
    random: () => 0.2,
  });

  expect(question.prompt).toBe('abandon');
  expect(question.options).toHaveLength(4);
  expect(question.options.filter((option) => option.correct)).toHaveLength(1);
  expect(question.options.find((option) => option.correct).label)
    .toBe('放弃；抛弃');
});

test('builds a ZH_TO_EN question', () => {
  const question = buildQuestion({
    type: QUIZ_TYPE.ZH_TO_EN,
    target: words.abandon,
    pool: Object.values(words),
    random: () => 0.7,
  });

  expect(question.prompt).toBe('放弃；抛弃');
  expect(question.options.find((option) => option.correct).label).toBe('abandon');
});

test('prefers same part-of-speech distractors before fallback candidates', () => {
  const question = buildQuestion({
    type: QUIZ_TYPE.EN_TO_ZH,
    target: words.abandon,
    pool: Object.values(words),
    random: () => 0,
  });
  const distractors = question.options.filter((option) => !option.correct);
  expect(distractors.slice(0, 2).every(
    (option) => option.partOfSpeech === 'v.'
  )).toBe(true);
});

test('uses fewer options when the unique candidate pool is small', () => {
  const question = buildQuestion({
    type: QUIZ_TYPE.EN_TO_ZH,
    target: words.abandon,
    pool: [words.abandon, words.retain],
    random: () => 0,
  });
  expect(question.options).toHaveLength(2);
  expect(new Set(question.options.map((option) => option.label)).size).toBe(2);
});

test('builds a session without repeating targets', () => {
  const session = buildSession({
    type: QUIZ_TYPE.EN_TO_ZH,
    words: Object.values(words),
    count: 3,
    random: () => 0.4,
  });
  expect(session.questions).toHaveLength(3);
  expect(new Set(session.questions.map((question) => question.wordId)).size)
    .toBe(3);
});

test('scores answers and returns unique wrong word ids', () => {
  expect(scoreSession([
    { wordId: 'word_abandon', correct: false },
    { wordId: 'word_abandon', correct: false },
    { wordId: 'word_retain', correct: true },
  ])).toEqual({
    total: 3,
    correct: 1,
    accuracy: 33,
    wrongWordIds: ['word_abandon'],
  });
});
