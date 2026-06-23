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

function buildPresentation(word = {}) {
  const attribution = word.audioAttribution || {};
  const credits = ['uk', 'us']
    .map((accent) => {
      const item = attribution[accent];
      if (!item?.license?.name) return '';
      return `${accent.toUpperCase()} ${item.creator || 'Commons contributor'}`
        + ` · ${item.license.name}`;
    })
    .filter(Boolean);
  return {
    synonyms: (word.synonyms || []).join(' · '),
    antonyms: (word.antonyms || []).join(' · '),
    confusables: (word.confusables || []).join(' · '),
    hasUkAudio: Boolean(word.audio?.uk),
    hasUsAudio: Boolean(word.audio?.us),
    audioCredit: credits.length
      ? `发音：${[...new Set(credits)].join(' / ')}`
      : '',
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
          presentation: buildPresentation(value),
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
      hasUkAudio: false,
      hasUsAudio: false,
      audioCredit: '',
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

module.exports = {
  buildPresentation,
  componentDefinition,
  visibleSections,
};
