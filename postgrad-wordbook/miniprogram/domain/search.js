function normalize(value) {
  return String(value || '').trim().toLocaleLowerCase('en-US');
}

function searchIndex(index, query) {
  const normalizedQuery = normalize(query);
  if (!normalizedQuery) return index.slice();

  return index
    .map((item, position) => {
      const word = normalize(item.word);
      const keywords = (item.senseKeywords || []).map(normalize);
      let rank = Number.POSITIVE_INFINITY;
      if (word === normalizedQuery) rank = 0;
      else if (word.startsWith(normalizedQuery)) rank = 1;
      else if (word.includes(normalizedQuery)) rank = 2;
      else if (keywords.some((keyword) => keyword.includes(normalizedQuery))) rank = 3;
      return { item, position, rank };
    })
    .filter(({ rank }) => Number.isFinite(rank))
    .sort((left, right) => left.rank - right.rank || left.position - right.position)
    .map(({ item }) => item);
}

function filterOrderedIds({
  orderedIds,
  indexById,
  stateById = {},
  letter = '',
  familiarity = [],
  matchedIds,
}) {
  const normalizedLetter = String(letter || '').toUpperCase();
  const familiaritySet = new Set(familiarity || []);
  return orderedIds.filter((id) => {
    const item = indexById[id];
    if (!item) return false;
    if (normalizedLetter && item.initial !== normalizedLetter) return false;
    if (familiaritySet.size > 0) {
      const state = stateById[id]?.familiarity;
      if (!familiaritySet.has(state)) return false;
    }
    if (matchedIds && !matchedIds.has(id)) return false;
    return true;
  });
}

module.exports = {
  filterOrderedIds,
  normalize,
  searchIndex,
};
