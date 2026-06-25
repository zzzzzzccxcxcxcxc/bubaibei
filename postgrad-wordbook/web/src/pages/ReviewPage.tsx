import { useState, useMemo } from 'react';
import type { Familiarity, WordEntry, WordState } from '../domain/types';

export function ReviewPage({ words, states, onMark, activeLibraryId }: {
  words: WordEntry[];
  states: Map<string, WordState>;
  onMark: (wordId: string, f: Familiarity) => void;
  activeLibraryId: string | null;
}) {
  const [selectedFam, setSelectedFam] = useState<Set<Familiarity>>(new Set(['review', 'unknown']));
  const [reading, setReading] = useState(false);

  const toggleFam = (f: Familiarity) => {
    setSelectedFam((prev) => {
      const next = new Set(prev);
      if (next.has(f)) next.delete(f); else next.add(f);
      return next;
    });
  };

  const filteredWords = useMemo(() => {
    if (selectedFam.size === 0) return [];
    return words.filter((w) => {
      const st = states.get(w.id);
      return st?.familiarity && selectedFam.has(st.familiarity);
    });
  }, [words, states, selectedFam]);

  if (!activeLibraryId) return <div className="review-empty"><p>请先到词库中心下载词库。</p></div>;

  if (reading) {
    return (
      <>
        <button className="btn btn--outline" style={{ marginBottom: 12 }} onClick={() => setReading(false)}>‹ 返回筛选</button>
        {filteredWords.length === 0 ? (
          <div className="review-empty"><p>没有符合条件的单词。</p></div>
        ) : (
          filteredWords.map((w) => (
            <WordEntryCard key={w.id} word={w} state={states.get(w.id) ?? { wordId: w.id, updatedAt: 0 }} onMark={onMark} />
          ))
        )}
      </>
    );
  }

  return (
    <>
      <div className="review-section">
        <div className="review-section__title">选择词库</div>
        <div className="review-option">
          <span>{activeLibraryId}</span>
          <span className="review-option__meta">{words.length} 词</span>
        </div>
      </div>

      <div className="review-section">
        <div className="review-section__title">选择熟悉度</div>
        {(['familiar', 'review', 'unknown'] as Familiarity[]).map((f) => {
          const label = f === 'familiar' ? '熟悉' : f === 'review' ? '待巩固' : '陌生';
          const count = words.filter((w) => states.get(w.id)?.familiarity === f).length;
          return (
            <div key={f} className="review-option" onClick={() => toggleFam(f)}>
              <input type="checkbox" checked={selectedFam.has(f)} onChange={() => {}} />
              <span>{label}</span>
              <span className="review-option__meta">{count} 词</span>
            </div>
          );
        })}
      </div>

      <button className="btn btn--primary" onClick={() => setReading(true)} disabled={selectedFam.size === 0}>
        开始连续复习
      </button>
    </>
  );
}

/* Inline WordEntry for review (simpler version) */
function WordEntryCard({ word, state, onMark }: {
  word: WordEntry; state: WordState; onMark: (wordId: string, f: Familiarity) => void;
}) {
  return (
    <div className="word-entry">
      <div className="word-entry__head">
        <span className="word-entry__word">{word.word}</span>
        <div className="word-entry__tags">
          <span className="word-entry__state">
            {state.familiarity === 'familiar' ? '熟悉' : state.familiarity === 'review' ? '待巩固' : '陌生'}
          </span>
        </div>
      </div>
      {word.phonetics?.uk && (
        <div className="word-entry__phonetics">
          <span className="word-entry__phonetic-btn">英 {word.phonetics.uk}</span>
          {word.phonetics.us && <span className="word-entry__phonetic-btn">美 {word.phonetics.us}</span>}
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
      {word.collocations && word.collocations.length > 0 && (
        <div className="word-entry__section">
          <div className="word-entry__section-title">常用搭配</div>
          <div className="word-entry__chips">
            {word.collocations.map((c, i) => <span key={i} className="word-entry__chip">{c}</span>)}
          </div>
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
