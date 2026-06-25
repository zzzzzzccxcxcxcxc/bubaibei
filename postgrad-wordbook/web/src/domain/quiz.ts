import type { WordEntry } from './types';

export type QuizType = 'en-to-zh' | 'zh-to-en';

export function primaryDefinition(word: Pick<WordEntry, 'senses'>) {
  return word.senses[0]?.definitions[0] ?? '';
}

export function buildQuestion(input: {
  type: QuizType;
  target: WordEntry;
  pool: WordEntry[];
  random: () => number;
}) {
  const correctText = input.type === 'en-to-zh' ? primaryDefinition(input.target) : input.target.word;
  const distractors = input.pool
    .filter((word) => word.id !== input.target.id)
    .map((word) => input.type === 'en-to-zh' ? primaryDefinition(word) : word.word)
    .filter((text, index, array) => text && text !== correctText && array.indexOf(text) === index)
    .slice(0, 3);
  const options = [{ text: correctText, correct: true }, ...distractors.map((text) => ({ text, correct: false }))];
  return {
    wordId: input.target.id,
    prompt: input.type === 'en-to-zh' ? input.target.word : primaryDefinition(input.target),
    options: options.sort(() => input.random() - 0.5),
  };
}

export function scoreSession(answers: Array<{ wordId: string; correct: boolean }>) {
  const correct = answers.filter((answer) => answer.correct).length;
  return {
    total: answers.length,
    correct,
    accuracy: answers.length === 0 ? 0 : Math.round((correct / answers.length) * 100),
    wrongWordIds: [...new Set(answers.filter((answer) => !answer.correct).map((answer) => answer.wordId))],
  };
}
