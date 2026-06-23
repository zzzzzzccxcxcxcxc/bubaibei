import fs from 'node:fs';
import path from 'node:path';
import { parse } from 'csv-parse';
import { ROOT, stableJson } from './content-lib.mjs';

const TARGET_COUNT = 800;
const inputPath = process.argv[2];

if (!inputPath) {
  throw new Error(
    'Usage: npm run content:import:ecdict -- <path-to-ecdict.csv>'
  );
}

const resolvedInput = path.resolve(inputPath);
if (!fs.existsSync(resolvedInput)) {
  throw new Error(`ECDICT_SOURCE_NOT_FOUND:${resolvedInput}`);
}

const POS_MAP = {
  a: 'adj.',
  adj: 'adj.',
  ad: 'adv.',
  adv: 'adv.',
  art: 'art.',
  aux: 'aux.',
  conj: 'conj.',
  int: 'int.',
  n: 'n.',
  num: 'num.',
  prep: 'prep.',
  pron: 'pron.',
  v: 'v.',
  vi: 'vi.',
  vt: 'vt.',
};

const EXCHANGE_MAP = {
  p: '过去式',
  d: '过去分词',
  i: '现在分词',
  3: '第三人称单数',
  r: '比较级',
  t: '最高级',
  s: '复数',
  0: '原形',
  1: '原形变体',
};

function cleanPhonetic(value) {
  return String(value || '')
    .replaceAll('ә', 'ə')
    .replaceAll('ɒ:', 'ɒː')
    .replaceAll('ɔ:', 'ɔː')
    .replaceAll('ə:', 'əː')
    .replaceAll('i:', 'iː')
    .replaceAll('u:', 'uː')
    .trim();
}

function parseSenses(translation) {
  const groups = [];
  for (const rawLine of String(translation || '').split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;
    const match = line.match(
      /^(n|v|vi|vt|a|adj|ad|adv|art|aux|conj|int|num|prep|pron)\.\s*(.+)$/i
    );
    const partOfSpeech = match ? POS_MAP[match[1].toLowerCase()] : '';
    const definitionText = (match ? match[2] : line)
      .replace(/\s+/g, ' ')
      .trim();
    const definitions = definitionText
      .split(/[,，；;]/)
      .map((item) => item.trim())
      .filter(Boolean);
    if (definitions.length === 0) continue;
    const previous = groups.at(-1);
    if (previous && previous.partOfSpeech === partOfSpeech) {
      previous.definitions.push(...definitions);
    } else {
      groups.push({ partOfSpeech, definitions });
    }
  }
  return groups;
}

function parseExchange(exchange) {
  return String(exchange || '')
    .split('/')
    .map((item) => item.split(':'))
    .filter(([code, value]) => EXCHANGE_MAP[code] && value)
    .map(([code, value]) => `${EXCHANGE_MAP[code]}：${value}`);
}

function frequency(row) {
  const values = [row.frq, row.bnc]
    .map(Number)
    .filter((value) => Number.isFinite(value) && value > 0);
  return values.length ? Math.min(...values) : Number.MAX_SAFE_INTEGER;
}

function importance(row) {
  const score = frequency(row);
  if (score <= 5000 || Number(row.collins) >= 3 || row.oxford === '1') {
    return 'core';
  }
  return 'high-frequency';
}

function stableId(word) {
  return `word_${word.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`
    .replace(/-+$/g, '');
}

function toWord(row) {
  const phonetic = cleanPhonetic(row.phonetic);
  return {
    id: stableId(row.word),
    word: row.word.toLowerCase(),
    importance: importance(row),
    phonetics: {
      uk: phonetic ? `/${phonetic.replace(/^\/|\/$/g, '')}/` : '',
      us: '',
    },
    audio: { uk: '', us: '' },
    senses: parseSenses(row.translation),
    collocations: [],
    morphology: parseExchange(row.exchange),
    memoryTips: [],
    synonyms: [],
    antonyms: [],
    confusables: [],
    examExamples: [],
    sources: [
      {
        sourceId: 'ecdict-bc015ed2',
        fields: [
          'word',
          'phonetics.uk',
          'senses',
          'morphology',
          'importance',
        ],
      },
    ],
    metadata: {
      ecdictTags: String(row.tag || '').split(/\s+/).filter(Boolean),
      bncRank: Number(row.bnc) || null,
      contemporaryRank: Number(row.frq) || null,
    },
  };
}

const candidates = [];
const parser = fs.createReadStream(resolvedInput).pipe(parse({
  bom: true,
  columns: true,
  relax_column_count: true,
  skip_empty_lines: true,
}));

for await (const row of parser) {
  const tags = String(row.tag || '').split(/\s+/);
  if (!tags.includes('ky')) continue;
  if (!/^[A-Za-z][A-Za-z-]*$/.test(row.word || '')) continue;
  if (!row.translation || !row.phonetic) continue;
  const word = toWord(row);
  if (word.senses.length === 0) continue;
  candidates.push({ row, word, frequency: frequency(row) });
}

candidates.sort((left, right) => (
  left.frequency - right.frequency
  || left.word.word.localeCompare(right.word.word, 'en')
));

const selected = candidates
  .slice(0, TARGET_COUNT)
  .map(({ word }) => word)
  .sort((left, right) => left.word.localeCompare(right.word, 'en'));

if (selected.length !== TARGET_COUNT) {
  throw new Error(`INSUFFICIENT_ECDICT_WORDS:${selected.length}`);
}
if (new Set(selected.map((word) => word.id)).size !== selected.length) {
  throw new Error('DUPLICATE_STABLE_WORD_IDS');
}

const highFrequencyIds = candidates
  .slice(0, 400)
  .map(({ word }) => word.id);
const allIds = selected.map((word) => word.id);
const sourceDir = path.join(ROOT, 'content', 'source');
const updatedAt = '2026-06-23T00:00:00.000Z';
const libraries = [
  {
    libraryId: 'core-2027-prep',
    title: '2027 备考核心词汇（800词）',
    description:
      '基于 ECDICT 的考研（ky）标签与公开语料词频筛选，'
      + '用于 2027 考研英语备考；不是尚未发布的 2027 官方大纲。',
    version: '1.0.0',
    formatVersion: 1,
    updatedAt,
    wordIds: allIds,
  },
  {
    libraryId: 'high-frequency-2027-prep',
    title: '2027 备考高频核心（400词）',
    description:
      '从同一 ECDICT 考研标签词集中按 BNC 与当代语料频次精选。',
    version: '1.0.0',
    formatVersion: 1,
    updatedAt,
    wordIds: highFrequencyIds,
  },
];

fs.writeFileSync(
  path.join(sourceDir, 'words.v1.json'),
  stableJson(selected)
);
fs.writeFileSync(
  path.join(sourceDir, 'libraries.v1.json'),
  stableJson(libraries)
);
console.log(
  `Imported ${selected.length} words into ${libraries.length} libraries.`
);
