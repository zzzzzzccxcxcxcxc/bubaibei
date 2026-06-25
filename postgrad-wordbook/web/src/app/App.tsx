import { useCallback, useState } from 'react';
import type { Route } from './routes';
import { HomePage } from '../pages/HomePage';
import { LibraryPage } from '../pages/LibraryPage';
import { ReaderPage } from '../pages/ReaderPage';
import { ReviewPage } from '../pages/ReviewPage';
import { QuizPage } from '../pages/QuizPage';
import { SettingsPage } from '../pages/SettingsPage';
import type { Familiarity, WordEntry, WordState } from '../domain/types';
import { createContentService } from '../services/contentService';

type AppState = {
  words: WordEntry[];
  states: Map<string, WordState>;
  activeLibraryId: string | null;
  message: string | null;
};

type AppProps = {
  fetchJson?: (url: string) => Promise<unknown>;
  learningRepo?: {
    setFamiliarity: (wordId: string, familiarity: Familiarity, now: number) => Promise<void>;
    getAll: () => Promise<Record<string, WordState>>;
  };
};

export function App({ fetchJson, learningRepo }: AppProps = {}) {
  const [route, setRoute] = useState<Route>('home');
  const [routeStack, setRouteStack] = useState<Route[]>([]);
  const [appState, setAppState] = useState<AppState>(() => {
    try {
      const raw = localStorage.getItem('pwa-app-state');
      if (raw) {
        const saved = JSON.parse(raw);
        return {
          words: saved.words || [],
          states: new Map(Object.entries(saved.states || {})),
          activeLibraryId: saved.activeLibraryId || null,
          message: null,
        };
      }
    } catch (_) {}
    return { words: [], states: new Map(), activeLibraryId: null, message: null };
  });
  // Quiz state
  const [quizSetup, setQuizSetup] = useState<{ type: 'en-to-zh' | 'zh-to-en'; count: number } | null>(null);
  const [quizResult, setQuizResult] = useState<{ total: number; correct: number; accuracy: number; wrongWordIds: string[] } | null>(null);

  const navigate = useCallback((r: Route) => {
    setRouteStack((s) => [...s, route]);
    setRoute(r);
  }, [route]);

  const goBack = useCallback(() => {
    setRouteStack((s) => {
      if (s.length === 0) return s;
      const prev = s[s.length - 1];
      setRoute(prev);
      return s.slice(0, -1);
    });
  }, []);

  const contentService = createContentService({
    baseUrl: import.meta.env.BASE_URL + 'content',
    fetchJson: fetchJson ?? ((url: string) => fetch(url).then((r) => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })),
    repository: {
      beginImport: async (libraryId: string) => { setAppState((s) => ({ ...s, message: '正在载入 ' + libraryId + '...' })); },
      commitImport: async (_libraryId: string, payload: unknown) => {
        const data = payload as { shardData: Array<Array<WordEntry>> };
        setAppState((s) => ({ ...s, words: data.shardData.flat(), activeLibraryId: _libraryId, message: null }));
      },
    },
  });

  const handleImport = useCallback(async (libraryId: string) => {
    try { await contentService.importLibrary(libraryId); }
    catch (err) { setAppState((s) => ({ ...s, message: '载入失败: ' + (err as Error).message })); }
  }, []);

  const markWord = useCallback(async (wordId: string, familiarity: Familiarity) => {
    const now = Date.now();
    setAppState((s) => {
      const next = new Map(s.states);
      next.set(wordId, { wordId, familiarity, updatedAt: now });
      return { ...s, states: next };
    });
    if (learningRepo) await learningRepo.setFamiliarity(wordId, familiarity, now);
  }, [learningRepo]);

  const counts = (() => {
    const result = { familiar: 0, review: 0, unknown: 0 };
    for (const [, state] of appState.states) {
      if (state.familiarity) result[state.familiarity] += 1;
    }
    return result;
  })();

  const handleQuizStart = (type: 'en-to-zh' | 'zh-to-en', count: number) => {
    setQuizSetup({ type, count });
    navigate('quiz-session');
  };

  const handleQuizDone = (result: { total: number; correct: number; accuracy: number; wrongWordIds: string[] }) => {
    setQuizResult(result);
    setQuizSetup(null);
    setRoute('quiz-result');
  };

  const title = (() => {
    switch (route) {
      case 'home': return '考研英语词书';
      case 'libraries': return '词库中心';
      case 'reader': return '词书阅读';
      case 'review': return '分类复习';
      case 'quiz': return '单词测试';
      case 'quiz-session': return '答题';
      case 'quiz-result': return '测试结果';
      case 'settings': return '阅读设置';
    }
  })();

  return (
    <div className="app-shell">
      <header className="app-nav">
        {route !== 'home' && route !== 'quiz-session' ? (
          <button className="app-nav__back" onClick={goBack}>‹ 返回</button>
        ) : <div className="app-nav__spacer" />}
        <h1 className="app-nav__title">{title}</h1>
        <div className="app-nav__spacer" />
      </header>

      {appState.message && <div className="app-message">{appState.message}</div>}

      <main className="page">
        {route === 'home' && (
          <HomePage counts={counts} activeLibraryId={appState.activeLibraryId} wordCount={appState.words.length}
            onNavigate={navigate} />
        )}
        {route === 'libraries' && (
          <LibraryPage onImport={handleImport} activeLibraryId={appState.activeLibraryId} />
        )}
        {route === 'reader' && appState.words.length > 0 && (
          <ReaderPage words={appState.words} states={appState.states} onMark={markWord} />
        )}
        {route === 'reader' && appState.words.length === 0 && (
          <div className="review-empty"><p>请先载入词库。</p></div>
        )}
        {route === 'review' && (
          <ReviewPage words={appState.words} states={appState.states} onMark={markWord} activeLibraryId={appState.activeLibraryId} />
        )}
        {route === 'quiz' && (
          <QuizPage words={appState.words} activeLibraryId={appState.activeLibraryId} onStart={handleQuizStart} />
        )}
        {route === 'quiz-session' && quizSetup && (
          <QuizSessionPage words={appState.words} setup={quizSetup} onDone={handleQuizDone} onBack={goBack} />
        )}
        {route === 'quiz-result' && quizResult && (
          <QuizResultPage result={quizResult} words={appState.words} onMark={markWord} onRetry={() => setRoute('quiz')} onHome={() => setRoute('home')} />
        )}
        {route === 'settings' && <SettingsPage />}
      </main>
    </div>
  );
}

/* Inline sub-pages */
function QuizSessionPage({ words, setup, onDone, onBack }: {
  words: WordEntry[]; setup: { type: 'en-to-zh' | 'zh-to-en'; count: number };
  onDone: (r: { total: number; correct: number; accuracy: number; wrongWordIds: string[] }) => void;
  onBack: () => void;
}) {
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<Array<{ wordId: string; correct: boolean }>>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);

  // Build questions once
  const [questions] = useState(() => {
    const { buildQuestion } = require('../domain/quiz');
    const pool = [...words].sort(() => Math.random() - 0.5).slice(0, setup.count);
    return pool.map((w) => buildQuestion({ type: setup.type, target: w, pool: words, random: Math.random }));
  });

  const q = questions[idx];
  if (!q) {
    const { scoreSession } = require('../domain/quiz');
    onDone(scoreSession(answers));
    return null;
  }

  const select = (optIdx: number) => {
    if (revealed) return;
    setSelected(optIdx);
    setRevealed(true);
    setAnswers((a) => [...a, { wordId: q.wordId, correct: q.options[optIdx].correct }]);
  };

  const next = () => {
    if (idx + 1 >= questions.length) {
      const { scoreSession } = require('../domain/quiz');
      onDone(scoreSession([...answers]));
    } else {
      setIdx(idx + 1);
      setSelected(null);
      setRevealed(false);
    }
  };

  return (
    <div className="quiz-session">
      <div className="quiz-session__progress">{idx + 1} / {questions.length}</div>
      <div className="quiz-session__prompt">{q.prompt}</div>
      <div className="quiz-session__options">
        {q.options.map((opt: {text: string, correct: boolean}, i: number) => {
          let cls = 'quiz-session__option';
          if (revealed && opt.correct) cls += ' quiz-session__option--correct';
          if (revealed && i === selected && !opt.correct) cls += ' quiz-session__option--wrong';
          return <button key={i} className={cls} onClick={() => select(i)}>{opt.text}</button>;
        })}
      </div>
      {revealed && (
        <div className="quiz-session__next">
          <button className="btn btn--primary" onClick={next}>
            {idx + 1 >= questions.length ? '查看结果' : '下一题'}
          </button>
        </div>
      )}
    </div>
  );
}

function QuizResultPage({ result, words, onMark, onRetry, onHome }: {
  result: { total: number; correct: number; accuracy: number; wrongWordIds: string[] };
  words: WordEntry[];
  onMark: (wordId: string, f: Familiarity) => void;
  onRetry: () => void; onHome: () => void;
}) {
  const wrongWords = words.filter((w) => result.wrongWordIds.includes(w.id));
  return (
    <>
      <div className="result-score">
        <div className="result-score__pct">{result.accuracy}%</div>
        <div className="result-score__detail">{result.correct} / {result.total} 题正确</div>
      </div>
      {wrongWords.length > 0 ? (
        <div className="card result-wrong">
          <div className="review-section__title">错词 {wrongWords.length}</div>
          {wrongWords.map((w) => (
            <div key={w.id} className="result-wrong__item">
              <span className="result-wrong__word">{w.word}</span>
              <span className="result-wrong__def">{w.senses[0]?.definitions.join('；')}</span>
            </div>
          ))}
          <div className="result-wrong__actions">
            <button className="btn btn--small btn--outline" onClick={() => wrongWords.forEach((w) => onMark(w.id, 'review'))}>全部标为待巩固</button>
            <button className="btn btn--small btn--outline" onClick={() => wrongWords.forEach((w) => onMark(w.id, 'unknown'))}>全部标为陌生</button>
          </div>
        </div>
      ) : (
        <div className="card result-empty">本轮没有错词 🎉</div>
      )}
      <div className="result-actions">
        <button className="btn btn--danger" onClick={onRetry}>再测一组</button>
        <button className="btn btn--outline" onClick={onHome}>返回首页</button>
      </div>
    </>
  );
}
