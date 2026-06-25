import type { Familiarity } from '../domain/types';

export function HomePage({ counts, activeLibraryId, wordCount, onNavigate }: {
  counts: Record<Familiarity, number>;
  activeLibraryId: string | null;
  wordCount: number;
  onNavigate: (route: 'libraries' | 'review' | 'quiz' | 'settings' | 'reader') => void;
}) {
  const hasLibrary = activeLibraryId !== null;
  return (
    <>
      <div className="hero">
        <div className="hero__eyebrow">2027 考研英语</div>
        <div className="hero__title">把词书装进手机里</div>
        <div className="hero__subtitle">连续阅读，随手标记，像翻纸质书一样复习单词。</div>
        <button className="btn btn--danger" onClick={() => hasLibrary && onNavigate('reader')}>
          继续阅读
        </button>
      </div>

      <div className="stats">
        <div className="stats__item">
          <div className="stats__num">{counts.familiar}</div>
          <div className="stats__label">熟悉</div>
        </div>
        <div className="stats__item">
          <div className="stats__num">{counts.review}</div>
          <div className="stats__label">待巩固</div>
        </div>
        <div className="stats__item">
          <div className="stats__num">{counts.unknown}</div>
          <div className="stats__label">陌生</div>
        </div>
      </div>

      <div className="menu">
        <div className="menu__item" onClick={() => onNavigate('libraries')}>
          词库中心
          <span className="menu__chevron">{hasLibrary ? wordCount + ' 词 ›' : '下载词库 ›'}</span>
        </div>
        <div className="menu__item" onClick={() => onNavigate('review')}>
          分类复习
          <span className="menu__chevron">按熟悉度筛选 ›</span>
        </div>
        <div className="menu__item" onClick={() => onNavigate('quiz')}>
          单词测试
          <span className="menu__chevron">英选中 / 中选英 ›</span>
        </div>
        <div className="menu__item" onClick={() => onNavigate('settings')}>
          阅读设置
          <span className="menu__chevron">字号与发音 ›</span>
        </div>
      </div>
    </>
  );
}
