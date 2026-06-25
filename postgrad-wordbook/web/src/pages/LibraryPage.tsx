import { useState, useEffect } from 'react';

type LibraryMeta = {
  libraryId: string;
  title: string;
  description: string;
  version: string;
  wordCount: number;
  bytes: number;
};

export function LibraryPage({ onImport, activeLibraryId }: {
  onImport: (libraryId: string) => void;
  activeLibraryId: string | null;
}) {
  const [libraries, setLibraries] = useState<LibraryMeta[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(import.meta.env.BASE_URL + 'content/manifest.json')
      .then((r) => r.json())
      .then((data) => {
        setLibraries(data.libraries || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="review-empty"><p>加载词库列表…</p></div>;
  }

  return (
    <>
      <p style={{ color: 'var(--secondary-text)', fontSize: 14, padding: '4px 0 12px', lineHeight: 1.7 }}>
        三个词库不重复，按频次分层。建议按顺序学习：基础 → 核心 → 高频。学习记录保存在本机。
      </p>
      {libraries.map((lib) => (
        <div className="lib-card" key={lib.libraryId}>
          <div className="lib-card__header">
            <span className="lib-card__title">{lib.title}</span>
            {activeLibraryId === lib.libraryId && <span className="lib-card__badge">已安装</span>}
          </div>
          <div className="lib-card__meta">{lib.wordCount} 词 · {Math.round(lib.bytes / 1024 / 1024 * 10) / 10} MB</div>
          <div className="lib-card__desc">{lib.description}</div>
          <div className="lib-card__actions">
            {activeLibraryId !== lib.libraryId ? (
              <button className="btn btn--primary btn--small" onClick={() => onImport(lib.libraryId)}>下载</button>
            ) : (
              <button className="btn btn--primary btn--small" onClick={() => onImport(lib.libraryId)}>重新下载</button>
            )}
          </div>
        </div>
      ))}
    </>
  );
}
