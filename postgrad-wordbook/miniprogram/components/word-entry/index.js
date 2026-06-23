function hasItems(value) {
  return Array.isArray(value) && value.length > 0;
}

function visibleSections(word = {}) {
  return {
    senses: hasItems(word.senses),
    collocations: hasItems(word.collocations),
    morphology: hasItems(word.morphology) || hasItems(word.memoryTips),
    relations: hasItems(word.synonyms)
      || hasItems(word.antonyms)
      || hasItems(word.confusables),
    examExamples: hasItems(word.examExamples),
  };
}

const componentDefinition = {
  properties: {
    word: {
      type: Object,
      value: {},
      observer(value) {
        this.setData({
          sections: visibleSections(value),
          presentation: {
            synonyms: (value.synonyms || []).join(' · '),
            antonyms: (value.antonyms || []).join(' · '),
            confusables: (value.confusables || []).join(' · '),
          },
        });
      },
    },
    familiarity: {
      type: String,
      value: '',
    },
    fontSize: {
      type: String,
      value: 'standard',
    },
  },

  data: {
    sections: {
      senses: false,
      collocations: false,
      morphology: false,
      relations: false,
      examExamples: false,
    },
    presentation: {
      synonyms: '',
      antonyms: '',
      confusables: '',
    },
  },

  methods: {
    markFamiliarity(event) {
      this.triggerEvent('familiaritychange', {
        wordId: this.data.word.id,
        familiarity: event.currentTarget.dataset.state,
      });
    },

    playAudio(event) {
      this.triggerEvent('audioplay', {
        wordId: this.data.word.id,
        accent: event.currentTarget.dataset.accent,
      });
    },
  },
};

if (typeof Component === 'function') Component(componentDefinition);

module.exports = { componentDefinition, visibleSections };
