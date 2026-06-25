import { useState } from 'react';

export function QuizPage({ words, activeLibraryId, onStart }: {
  words: any[];
  activeLibraryId: string | null;
  onStart: (type: 'en-to-zh' | 'zh-to-en', count: number) => void;
}) {
  const [type, setType] = useState<'en-to-zh' | 'zh-to-en'>('en-to-zh');
  const [count, setCount] = useState(10);

  if (!activeLibraryId) return <div className="review-empty"><p>请先到词库中心下载词库。</p></div>;

  return (
    <>
      <div className="quiz-section">
        <div className="quiz-section__title">测试方式</div>
        <div className="quiz-option" onClick={() => setType('en-to-zh')}>
          <input type="radio" checked={type === 'en-to-zh'} onChange={() => {}} />
          <span>看英文选中文</span>
        </div>
        <div className="quiz-option" onClick={() => setType('zh-to-en')}>
          <input type="radio" checked={type === 'zh-to-en'} onChange={() => {}} />
          <span>看中文选英文</span>
        </div>
      </div>

      <div className="quiz-section">
        <div className="quiz-section__title">词库范围</div>
        <div className="quiz-option">
          <input type="checkbox" checked readOnly />
          <span>{activeLibraryId}</span>
          <span className="review-option__meta" style={{ fontSize: 12, color: 'var(--tertiary-text)' }}>{words.length} 词</span>
        </div>
      </div>

      <div className="quiz-section">
        <div className="quiz-section__title">题量</div>
        <div className="quiz-picker" onClick={() => setCount(count === 10 ? 20 : count === 20 ? 30 : 10)}>
          {count} 题 ›
        </div>
      </div>

      <button className="btn btn--primary" onClick={() => onStart(type, Math.min(count, words.length))}>
        开始测试
      </button>
    </>
  );
}
