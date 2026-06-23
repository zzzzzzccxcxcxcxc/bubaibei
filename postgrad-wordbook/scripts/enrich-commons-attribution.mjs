import fs from 'node:fs';
import path from 'node:path';
import {
  ROOT,
  readJson,
  stableJson,
} from './content-lib.mjs';

const wordsPath = path.join(ROOT, 'content', 'source', 'words.v1.json');
const outputPath = path.join(
  ROOT,
  'content',
  'source',
  'audio-attribution.json'
);
const words = readJson(wordsPath);

function pageIdFromUrl(url) {
  return String(url || '').match(/[?&]curid=(\d+)/)?.[1] || '';
}

function stripHtml(value) {
  return String(value || '')
    .replace(/<[^>]+>/g, '')
    .replaceAll('&amp;', '&')
    .replaceAll('&quot;', '"')
    .replaceAll('&#039;', "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeLicenseUrl(name, url) {
  const normalizedName = String(name || '').trim().toLowerCase();
  if (normalizedName === 'public domain') {
    return 'https://commons.wikimedia.org/wiki/Commons:Public_domain';
  }
  if (normalizedName === 'cc0') {
    return 'https://creativecommons.org/publicdomain/zero/1.0/';
  }
  return String(url || '').replace(/^http:/, 'https:');
}

async function fetchMetadata(pageIds) {
  const url = new URL('https://commons.wikimedia.org/w/api.php');
  url.search = new URLSearchParams({
    action: 'query',
    format: 'json',
    origin: '*',
    prop: 'imageinfo',
    pageids: pageIds.join('|'),
    iiprop: 'url|extmetadata',
  });
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'postgrad-wordbook/0.1 (educational vocabulary app)',
    },
    signal: AbortSignal.timeout(30000),
  });
  if (!response.ok) throw new Error(`COMMONS_HTTP_${response.status}`);
  return response.json();
}

const references = [];
for (const word of words) {
  for (const accent of ['uk', 'us']) {
    const attribution = word.audioAttribution?.[accent];
    if (!word.audio?.[accent] || !attribution) continue;
    const pageId = String(
      attribution.commonsPageId || pageIdFromUrl(attribution.sourceUrl)
    );
    if (!pageId) throw new Error(`MISSING_COMMONS_PAGE_ID:${word.word}:${accent}`);
    references.push({ word, accent, attribution, pageId });
  }
}

const metadataByPageId = {};
for (let start = 0; start < references.length; start += 50) {
  const ids = [...new Set(
    references.slice(start, start + 50).map((item) => item.pageId)
  )];
  let payload;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      payload = await fetchMetadata(ids);
      break;
    } catch (error) {
      if (attempt === 3) throw error;
      await new Promise((resolve) => setTimeout(resolve, attempt * 1000));
    }
  }
  Object.assign(metadataByPageId, payload.query?.pages || {});
  console.log(
    `Fetched Commons attribution ${Math.min(start + 50, references.length)}`
    + `/${references.length}.`
  );
}

const catalog = [];
for (const reference of references) {
  const page = metadataByPageId[reference.pageId];
  const info = page?.imageinfo?.[0];
  const metadata = info?.extmetadata || {};
  const creator = stripHtml(metadata.Artist?.value)
    || stripHtml(metadata.Credit?.value)
    || 'Wikimedia Commons contributor';
  const licenseName = metadata.LicenseShortName?.value
    || reference.attribution.license?.name;
  const licenseUrl = metadata.LicenseUrl?.value
    || reference.attribution.license?.url;
  if (!info?.descriptionurl || !creator || !licenseName || !licenseUrl) {
    throw new Error(
      `INCOMPLETE_ATTRIBUTION:${reference.word.word}:${reference.accent}`
    );
  }

  reference.word.audioAttribution[reference.accent] = {
    ...reference.attribution,
    creator,
    sourceUrl: info.descriptionurl,
    license: {
      name: licenseName,
      url: normalizeLicenseUrl(licenseName, licenseUrl),
    },
    commonsPageId: Number(reference.pageId),
  };
  catalog.push({
    wordId: reference.word.id,
    word: reference.word.word,
    accent: reference.accent,
    asset: reference.word.audio[reference.accent],
    ...reference.word.audioAttribution[reference.accent],
  });
}

catalog.sort((left, right) => (
  left.word.localeCompare(right.word, 'en')
  || left.accent.localeCompare(right.accent)
));
fs.writeFileSync(wordsPath, stableJson(words));
fs.writeFileSync(outputPath, stableJson(catalog));
console.log(`Wrote ${catalog.length} audio attribution records.`);
