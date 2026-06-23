import fs from 'node:fs';
import path from 'node:path';
import {
  ROOT,
  readJson,
  stableJson,
} from './content-lib.mjs';

const SOURCE_ID = 'free-dictionary-api-2026-06-23';
const API_BASE = 'https://api.dictionaryapi.dev/api/v2/entries/en/';
const wordsPath = path.join(ROOT, 'content', 'source', 'words.v1.json');
const cachePath = path.join(
  ROOT,
  'content',
  'source',
  'free-dictionary-audio-cache.json'
);
const audioDir = path.join(ROOT, 'content', 'audio');
const concurrency = 8;

fs.mkdirSync(audioDir, { recursive: true });
const words = readJson(wordsPath);
const cache = fs.existsSync(cachePath) ? readJson(cachePath) : {};

function sleep(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function fetchWithRetry(url, options = {}, attempts = 2) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'User-Agent': 'postgrad-wordbook/0.1 (educational vocabulary app)',
          ...(options.headers || {}),
        },
        signal: AbortSignal.timeout(15000),
      });
      if (response.status === 404) return response;
      if (!response.ok) throw new Error(`HTTP_${response.status}`);
      return response;
    } catch (error) {
      lastError = error;
      if (attempt < attempts) await sleep(attempt * 500);
    }
  }
  throw lastError;
}

function normalizeAudioUrl(url) {
  if (!url) return '';
  return url.startsWith('//') ? `https:${url}` : url;
}

function detectAccent(url) {
  if (/-uk(?:[-.])/i.test(url)) return 'uk';
  if (/-us(?:[-.])/i.test(url)) return 'us';
  return '';
}

function collectMetadata(payload) {
  const candidates = [];
  const synonyms = new Set();
  const antonyms = new Set();
  const sourceUrls = new Set();
  let license = null;

  for (const entry of payload) {
    if (entry.license) license = license || entry.license;
    for (const sourceUrl of entry.sourceUrls || []) sourceUrls.add(sourceUrl);
    for (const phonetic of entry.phonetics || []) {
      const url = normalizeAudioUrl(phonetic.audio);
      const accent = detectAccent(url);
      if (!url || !accent) continue;
      candidates.push({
        accent,
        url,
        text: phonetic.text || '',
        sourceUrl: phonetic.sourceUrl || '',
        license: phonetic.license || entry.license || null,
      });
    }
    for (const meaning of entry.meanings || []) {
      for (const value of meaning.synonyms || []) synonyms.add(value);
      for (const value of meaning.antonyms || []) antonyms.add(value);
      for (const definition of meaning.definitions || []) {
        for (const value of definition.synonyms || []) synonyms.add(value);
        for (const value of definition.antonyms || []) antonyms.add(value);
      }
    }
  }

  const audio = {};
  for (const accent of ['uk', 'us']) {
    const candidate = candidates.find((item) => item.accent === accent);
    if (candidate) audio[accent] = candidate;
  }
  return {
    audio,
    antonyms: [...antonyms].slice(0, 8),
    license,
    sourceUrls: [...sourceUrls],
    synonyms: [...synonyms].slice(0, 8),
  };
}

async function queryWord(word) {
  const response = await fetchWithRetry(`${API_BASE}${encodeURIComponent(word)}`);
  if (response.status === 404) {
    return { status: 'not-found', audio: {}, synonyms: [], antonyms: [] };
  }
  const payload = await response.json();
  return { status: 'ok', ...collectMetadata(payload) };
}

async function downloadAudio(wordId, accent, candidate) {
  const extension = path.extname(new URL(candidate.url).pathname) || '.mp3';
  const relativePath = `audio/${wordId}-${accent}${extension.toLowerCase()}`;
  const destination = path.join(ROOT, 'content', relativePath);
  if (!fs.existsSync(destination)) {
    const response = await fetchWithRetry(candidate.url);
    const contentType = response.headers.get('content-type') || '';
    const bytes = Buffer.from(await response.arrayBuffer());
    if (bytes.length < 100 || !/audio|octet-stream/i.test(contentType)) {
      throw new Error(`INVALID_AUDIO:${wordId}:${accent}:${contentType}`);
    }
    fs.writeFileSync(destination, bytes);
  }
  return relativePath.replaceAll('\\', '/');
}

function saveCache() {
  fs.writeFileSync(cachePath, stableJson(cache));
}

let cursor = 0;
let completed = 0;
async function worker() {
  while (cursor < words.length) {
    const index = cursor;
    cursor += 1;
    const word = words[index];
    try {
      if (!cache[word.word] || process.env.REFRESH_AUDIO_METADATA === '1') {
        cache[word.word] = await queryWord(word.word);
        saveCache();
      }
      completed += 1;
      if (completed % 50 === 0) {
        console.log(`Fetched metadata for ${completed}/${words.length} words.`);
      }
    } catch (error) {
      cache[word.word] = {
        status: 'error',
        error: String(error?.message || error),
        audio: {},
        synonyms: [],
        antonyms: [],
      };
      saveCache();
    }
  }
}

await Promise.all(Array.from({ length: concurrency }, () => worker()));

let downloaded = 0;
const audioJobs = [];
for (const word of words) {
  const metadata = cache[word.word] || {};
  word.audio = { uk: '', us: '' };
  word.audioAttribution = {};
  word.sources = (word.sources || []).filter(
    (source) => source.sourceId !== SOURCE_ID
  );

  for (const accent of ['uk', 'us']) {
    const candidate = metadata.audio?.[accent];
    if (!candidate) continue;
    audioJobs.push({ word, accent, candidate, metadata });
  }

  if (metadata.synonyms?.length) {
    word.synonyms = metadata.synonyms;
  }
  if (metadata.antonyms?.length) {
    word.antonyms = metadata.antonyms;
  }
}

let audioCursor = 0;
async function audioWorker() {
  while (audioCursor < audioJobs.length) {
    const index = audioCursor;
    audioCursor += 1;
    const { word, accent, candidate, metadata } = audioJobs[index];
    try {
      word.audio[accent] = await downloadAudio(word.id, accent, candidate);
      word.audioAttribution[accent] = {
        sourceUrl: candidate.sourceUrl || candidate.url,
        downloadUrl: candidate.url,
        license: candidate.license || metadata.license || null,
      };
      if (candidate.text) word.phonetics[accent] = candidate.text;
      downloaded += 1;
    } catch (error) {
      console.warn(`Skipped ${word.word} ${accent}: ${error.message}`);
    }
  }
}

await Promise.all(Array.from({ length: 12 }, () => audioWorker()));

for (const word of words) {
  const metadata = cache[word.word] || {};
  if (word.audio.uk || word.audio.us || word.synonyms.length || word.antonyms.length) {
    word.sources.push({
      sourceId: SOURCE_ID,
      fields: [
        ...(word.audio.uk ? ['audio.uk', 'phonetics.uk'] : []),
        ...(word.audio.us ? ['audio.us', 'phonetics.us'] : []),
        ...(word.synonyms.length ? ['synonyms'] : []),
        ...(word.antonyms.length ? ['antonyms'] : []),
      ],
      sourceUrls: metadata.sourceUrls || [],
      license: metadata.license || null,
    });
  }
}

fs.writeFileSync(wordsPath, stableJson(words));
saveCache();

const coverage = {
  uk: words.filter((word) => word.audio.uk).length,
  us: words.filter((word) => word.audio.us).length,
  both: words.filter((word) => word.audio.uk && word.audio.us).length,
  downloaded,
};
console.log(`Audio enrichment complete: ${JSON.stringify(coverage)}.`);
