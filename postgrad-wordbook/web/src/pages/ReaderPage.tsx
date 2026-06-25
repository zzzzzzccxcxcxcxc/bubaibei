import { useState, useMemo, useRef } from 'react';
import type { Familiarity, WordEntry as WordEntryType, WordState } from '../domain/types';
import { searchIndex, filterOrderedIds } from '../domain/search';

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

export function ReaderPage({ words, states, onMark }: {
  words: WordEntryType[];
  states: Map<string, WordState>;
  onMark: (wordId: string, f: Familiarity) => void;
}) {
  const [query, setQuery] = useState('');
  const [letter, setLetter] = useState('');
  const [familiarityFilter, setFamiliarityFilter] = useState<Familiarity[]>([]);
  const listRef = useRef<HTMLDivElement>(null);

  const indexById = useMemo(() => new Map(words.map((w) => ({
    id: w.id, word: w.word, initial: w.initial || w.word.charAt(0).toUpperCase(),
    senseKeywords: w.senses.flatMap((s) => s.definitions),
    partOfSpeech: w.senses.map((s) => s.partOfSpeech),
  })).map((e) => [e.id, e])), [words]);

  const orderedIds = useMemo(() => words.map((w) => w.id), [words]);

  const filteredIds = useMemo(() => filterOrderedIds({
    orderedIds, indexById, stateById: states,
    letter: letter || undefined,
    familiarity: familiarityFilter.length > 0 ? familiarityFilter : undefined,
    query: query || undefined,
  }), [orderedIds, indexById, states, letter, familiarityFilter, query]);

  const filteredWords = useMemo(() =>
    filteredIds.map((id) => words.find((w) => w.id === id)!).filter(Boolean),
    [filteredIds, words]);

  const toggleFam = (f: Familiarity) => {
    setFamiliarityFilter((prev) => prev.includes(f) ? prev.filter((x) => x !== f) : [...prev, f]);
  };

  return (
    <div>
      <div className="reader-toolbar">
        <span>{filteredIds.length} / {words.length} 词</span>
      </div>

      <div className="reader-filters">
        <div className="reader-filters__search">
          <input className="reader-filters__input" type="search" placeholder="搜索单词或释义"
            value={query} onChange={(e) => { setQuery(e.target.value); setLetter(''); }} />
          {query && <button className="btn btn--small btn--outline" onClick={() => setQuery('')}>清空</button>}
        </div>
        <div className="reader-filters__letters">
          {LETTERS.map((l) => (
            <button key={l} className={'reader-filters__letter' + (letter === l ? ' reader-filters__letter--active' : '')}
              onClick={() => setLetter(letter === l ? '' : l)}>{l}</button>
          ))}
        </div>
        <div className="reader-filters__fam">
          {(['familiar', 'review', 'unknown'] as Familiarity[]).map((f) => (
            <label key={f} onClick={() => toggleFam(f)}>
              <input type="checkbox" checked={familiarityFilter.includes(f)} onChange={() => {}} />
              {f === 'familiar' ? '熟悉' : f === 'review' ? '待巩固' : '陌生'}
            </label>
          ))}
        </div>
      </div>

      <div ref={listRef}>
        {filteredWords.length === 0 ? (
          <div className="review-empty"><p>没有符合条件的单词</p></div>
        ) : (
          <>
            {filteredWords.map((word) => (
              <WordEntryCard key={word.id} word={word}
                state={states.get(word.id) ?? { wordId: word.id, updatedAt: 0 }} onMark={onMark} />
            ))}
            <div className="review-empty"><p>已阅读到底</p></div>
          </>
        )}
      </div>
    </div>
  );
}

function WordEntryCard({ word, state, onMark }: {
  word: WordEntryType; state: WordState; onMark: (wordId: string, f: Familiarity) => void;
}) {
  const hasCollocations = word.collocations && word.collocations.length > 0;
  const hasMorphology = word.morphology && word.morphology.length > 0;
  const hasRelations = word.relations && (word.relations.synonyms?.length || word.relations.antonyms?.length || word.relations.confusables?.length);
  const hasExamples = word.examExamples && word.examExamples.length > 0;

  return (
    <div className="word-entry">
      <div className="word-entry__head">
        <span className="word-entry__word">{word.word}</span>
        <div className="word-entry__tags">
          <span className="word-entry__tag">考研</span>
          <span className="word-entry__state">
            {state.familiarity === 'familiar' ? '熟悉' : state.familiarity === 'review' ? '待巩固' : '陌生'}
          </span>
        </div>
      </div>

      {(word.phonetics?.uk || word.phonetics?.us) && (
        <div className="word-entry__phonetics">
          {word.phonetics?.uk && <span className="word-entry__phonetic-btn">英 {word.phonetics.uk}</span>}
          {word.phonetics?.us && <span className="word-entry__phonetic-btn">美 {word.phonetics.us}</span>}
          {!word.phonetics?.uk && !word.phonetics?.us && <span className="word-entry__phonetic-btn">暂无音标</span>}
        </div>
      )}

      <div className="word-entry__section">
        {word.senses.map((s) => (
          <div key={s.partOfSpeech} className="word-entry__sense">
            <span className="word-entry__pos">{s.partOfSpeech}</span>
            <span className="word-entry__defs">{s.definitions.join('；')}</span>
          </div>
        ))}
      </div>

      {hasCollocations && (
        <div className="word-entry__section">
          <div className="word-entry__section-title">常用搭配</div>
          <div className="word-entry__chips">
            {word.collocations!.map((c, i) => <span key={i} className="word-entry__chip">{c}</span>)}
          </div>
        </div>
      )}

      {hasMorphology && (
        <div className="word-entry__section">
          <div className="word-entry__section-title">词形变化</div>
          <p style={{ fontSize: 13 }}>{word.morphology!.join('；')}</p>
        </div>
      )}

      {hasRelations && (
        <div className="word-entry__section">
          <div className="word-entry__relations">
            {word.relations!.synonyms?.length ? <p>近义：{word.relations!.synonyms.join('、')}</p> : null}
            {word.relations!.antonyms?.length ? <p>反义：{word.relations!.antonyms.join('、')}</p> : null}
            {word.relations!.confusables?.length ? <p>易混：{word.relations!.confusables.join('、')}</p> : null}
          </div>
        </div>
      )}

      {hasExamples && (
        <div className="word-entry__section">
          <div className="word-entry__section-title">真题短句</div>
          {word.examExamples!.map((ex, i) => (
            <div key={i} className="word-entry__example">
              <div className="word-entry__example-en">{ex.text}</div>
              <div className="word-entry__example-zh">{ex.translation}</div>
              {ex.year && <div className="word-entry__example-src">{ex.year} · {ex.questionType || ''}</div>}
            </div>
          ))}
        </div>
      )}

      <div className="word-entry__actions">
        {(['familiar', 'review', 'unknown'] as Familiarity[]).map((f) => {
          const label = f === 'familiar' ? '熟悉' : f === 'review' ? '待巩固' : '陌生';
          return (
            <button key={f}
              className={'word-entry__action-btn' + (state.familiarity === f ? ' word-entry__action-btn--active' : '')}
              onClick={() => onMark(word.id, f)}>{label}</button>
          );
        })}
      </div>
    </div>
  );
}
