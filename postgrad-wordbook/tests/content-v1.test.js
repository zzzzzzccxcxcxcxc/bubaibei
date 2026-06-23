const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const wordsPath = path.join(ROOT, 'content/source/words.v1.json');
const librariesPath = path.join(ROOT, 'content/source/libraries.v1.json');

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

test('v1 content contains 500-1000 unique sourced words', () => {
  const words = readJson(wordsPath);
  expect(words.length).toBeGreaterThanOrEqual(500);
  expect(words.length).toBeLessThanOrEqual(1000);
  expect(new Set(words.map((word) => word.id)).size).toBe(words.length);
  expect(words.every((word) => word.sources.length > 0)).toBe(true);
});

test('v1 words have readable definitions, phonetics, and stable ids', () => {
  const words = readJson(wordsPath);
  expect(words.every((word) => /^word_[a-z0-9-]+$/.test(word.id))).toBe(true);
  expect(words.every((word) => word.senses.length > 0)).toBe(true);
  expect(words.every((word) =>
    word.senses.every((sense) => sense.definitions.length > 0)
  )).toBe(true);
  expect(words.every((word) =>
    word.phonetics.uk || word.phonetics.us
  )).toBe(true);
});

test('every exam excerpt has an auditable source record', () => {
  const words = readJson(wordsPath);
  const excerpts = words.flatMap((word) => word.examExamples || []);
  expect(excerpts.every((excerpt) =>
    excerpt.year
    && excerpt.questionType
    && excerpt.sourceId
    && excerpt.translation
  )).toBe(true);
});

test('libraries disclose their non-official source basis and order every word', () => {
  const words = readJson(wordsPath);
  const libraries = readJson(librariesPath);
  const library = libraries.find((item) => item.libraryId === 'core-2027-prep');
  expect(library.title).toContain('2027 备考');
  expect(library.title).not.toContain('2027 官方大纲');
  expect(library.description).toContain('ECDICT');
  expect(library.wordIds).toHaveLength(words.length);
  expect(new Set(library.wordIds).size).toBe(words.length);
});

test('v1 content includes auditable open UK and US pronunciation coverage', () => {
  const words = readJson(wordsPath);
  const uk = words.filter((word) => word.audio.uk);
  const us = words.filter((word) => word.audio.us);
  const both = words.filter((word) => word.audio.uk && word.audio.us);

  expect(uk.length).toBeGreaterThanOrEqual(20);
  expect(us.length).toBeGreaterThanOrEqual(100);
  expect(both.length).toBeGreaterThanOrEqual(10);
  expect([...uk, ...us].every((word) =>
    word.sources.some((source) =>
      source.sourceId === 'free-dictionary-api-2026-06-23'
    )
  )).toBe(true);
});

test('every packaged pronunciation has creator and license attribution', () => {
  const words = readJson(wordsPath);
  const attributions = readJson(path.join(
    ROOT,
    'content/source/audio-attribution.json'
  ));
  const audioEntries = words.flatMap((word) =>
    ['uk', 'us']
      .filter((accent) => word.audio[accent])
      .map((accent) => ({
        key: `${word.id}:${accent}`,
        attribution: word.audioAttribution[accent],
      }))
  );

  expect(attributions).toHaveLength(audioEntries.length);
  expect(audioEntries.every(({ attribution }) =>
    attribution.creator
    && attribution.sourceUrl
    && attribution.license?.name
    && attribution.license?.url
  )).toBe(true);
});

test('public-domain and CC0 pronunciation labels use matching legal URLs', () => {
  const attributions = readJson(path.join(
    ROOT,
    'content/source/audio-attribution.json'
  ));
  const publicDomain = attributions.filter(
    (item) => item.license.name === 'Public domain'
  );
  const cc0 = attributions.filter((item) => item.license.name === 'CC0');

  expect(publicDomain.length).toBeGreaterThan(0);
  expect(publicDomain.every((item) =>
    item.license.url === 'https://commons.wikimedia.org/wiki/Commons:Public_domain'
  )).toBe(true);
  expect(cc0.length).toBeGreaterThan(0);
  expect(cc0.every((item) =>
    item.license.url.startsWith(
      'https://creativecommons.org/publicdomain/zero/1.0/'
    )
  )).toBe(true);
});
