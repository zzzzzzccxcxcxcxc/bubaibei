const validWord = {
  id: 'word_abandon',
  word: 'abandon',
  importance: 'core',
  phonetics: {
    uk: '/əˈbændən/',
    us: '/əˈbændən/',
  },
  audio: {
    uk: 'cloud://audio/abandon-uk.mp3',
    us: 'cloud://audio/abandon-us.mp3',
  },
  audioAttribution: {
    uk: {
      creator: 'Example UK speaker',
      sourceUrl: 'https://commons.wikimedia.org/wiki/File:Example-uk.ogg',
      license: {
        name: 'CC BY-SA 4.0',
        url: 'https://creativecommons.org/licenses/by-sa/4.0/',
      },
    },
    us: {
      creator: 'Example US speaker',
      sourceUrl: 'https://commons.wikimedia.org/wiki/File:Example-us.ogg',
      license: {
        name: 'CC BY-SA 4.0',
        url: 'https://creativecommons.org/licenses/by-sa/4.0/',
      },
    },
  },
  senses: [
    {
      partOfSpeech: 'v.',
      definitions: ['放弃；抛弃'],
    },
  ],
  collocations: ['abandon a plan'],
  morphology: ['a-（加强）+ bandon（控制）'],
  memoryTips: ['不再受控制，即放弃'],
  synonyms: ['desert'],
  antonyms: ['retain'],
  confusables: ['abundant'],
  examExamples: [
    {
      text: 'They abandon the old assumption.',
      translation: '他们放弃了旧有假设。',
      year: 2020,
      questionType: '阅读理解',
      sourceId: 'exam-2020-en1-reading-a',
    },
  ],
  sources: [
    {
      sourceId: 'open-dictionary-1',
      fields: ['phonetics', 'senses'],
    },
  ],
};

module.exports = { validWord };
