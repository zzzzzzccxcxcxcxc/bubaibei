import type { Familiarity, SearchIndexEntry, WordState } from './types';

export const normalize = (value: unknown) =>
  String(value ?? '').trim().toLocaleLowerCase('en-US');

export function searchIndex(index: SearchIndexEntry[], query: string): SearchIndexEntry[] {
  const normalized = normalize(query);
  if (!normalized) return index;

  return index
    .map((entry) => {
      const word = normalize(entry.word);
      const keywords = entry.senseKeywords.map(normalize);
      let score = 0;
      if (word === normalized) score = 100;
      else if (word.startsWith(normalized)) score = 80;
      else if (word.includes(normalized)) score = 60;
      else if (keywords.some((keyword) => keyword.includes(normalized))) score = 40;
      return { entry, score };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || a.entry.word.localeCompare(b.entry.word))
    .map((item) => item.entry);
}

export function filterOrderedIds(input: {
  orderedIds: string[];
  indexById: Map<string, SearchIndexEntry>;
  stateById: Map<string, WordState>;
  letter?: string;
  familiarity?: Familiarity[];
  query?: string;
}) {
  const letter = normalize(input.letter);
  const familiarity = new Set(input.familiarity ?? []);
  const queryMatches = new Set(
    input.query ? searchIndex([...input.indexById.values()], input.query).map((entry) => entry.id) : input.orderedIds,
  );

  return input.orderedIds.filter((wordId) => {
    const indexEntry = input.indexById.get(wordId);
    if (!indexEntry) return false;
    if (letter && normalize(indexEntry.initial) !== letter) return false;
    if (!queryMatches.has(wordId)) return false;
    if (familiarity.size > 0) {
      const state = input.stateById.get(wordId);
      if (!state?.familiarity || !familiarity.has(state.familiarity)) return false;
    }
    return true;
  });
}
