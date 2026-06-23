const { visibleSections } = require('./index');

test('word entry hides empty optional sections', () => {
  const sections = visibleSections({
    senses: [{ partOfSpeech: 'v.', definitions: ['放弃'] }],
    collocations: [],
    morphology: [],
    memoryTips: [],
    synonyms: [],
    antonyms: [],
    confusables: [],
    examExamples: [],
  });
  expect(sections).toEqual({
    senses: true,
    collocations: false,
    morphology: false,
    relations: false,
    examExamples: false,
  });
});

test('word entry exposes relation and morphology sections when populated', () => {
  const sections = visibleSections({
    senses: [],
    collocations: [],
    morphology: ['a + bandon'],
    memoryTips: [],
    synonyms: ['desert'],
    antonyms: [],
    confusables: [],
    examExamples: [],
  });
  expect(sections.morphology).toBe(true);
  expect(sections.relations).toBe(true);
});
