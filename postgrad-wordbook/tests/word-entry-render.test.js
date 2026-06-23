/**
 * @jest-environment jsdom
 */

const path = require('node:path');
const simulate = require('miniprogram-simulate');

test('renders a word entry and hides empty optional sections', () => {
  const componentPath = path.resolve(
    __dirname,
    '../miniprogram/components/word-entry/index'
  );
  const id = simulate.load(componentPath);
  const component = simulate.render(id, {
    word: {
      id: 'word_abandon',
      word: 'abandon',
      importance: 'core',
      phonetics: { uk: "/ə'bændən/", us: '' },
      senses: [{ partOfSpeech: 'v.', definitions: ['放弃；抛弃'] }],
      collocations: [],
      morphology: [],
      memoryTips: [],
      synonyms: [],
      antonyms: [],
      confusables: [],
      examExamples: [],
    },
  });
  component.attach(document.body);

  const html = component.dom.innerHTML;
  expect(html).toContain('abandon');
  expect(html).toContain('放弃；抛弃');
  expect(html).not.toContain('常用搭配');
  expect(html).not.toContain('真题短句');
});
