/**
 * @jest-environment jsdom
 */

const path = require('node:path');
const simulate = require('miniprogram-simulate');
const componentPath = path.resolve(
  __dirname,
  '../miniprogram/components/word-entry/index'
);
const componentId = simulate.load(componentPath);

test('renders a word entry and hides empty optional sections', () => {
  const component = simulate.render(componentId, {
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
  expect(html).not.toContain('data-accent');
});

test('renders only available accent buttons and attribution', () => {
  const component = simulate.render(componentId, {
    word: {
      id: 'word_accept',
      word: 'accept',
      importance: 'core',
      phonetics: { uk: '/əkˈsept/', us: '/əkˈsept/' },
      audio: { uk: 'audio/accept-uk.mp3', us: '' },
      audioAttribution: {
        uk: {
          sourceUrl: 'https://commons.wikimedia.org/example',
          creator: 'Example speaker',
          license: { name: 'BY-SA 3.0' },
        },
      },
      senses: [{ partOfSpeech: 'v.', definitions: ['接受'] }],
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
  expect(html).toContain('英 /əkˈsept/');
  expect(html).toContain('美 /əkˈsept/');
  expect(html.match(/<wx-button/g)).toHaveLength(4);
  expect(html).toContain('发音：UK Example speaker · BY-SA 3.0');
});
