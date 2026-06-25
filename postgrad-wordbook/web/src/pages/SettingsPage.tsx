import { useState } from 'react';

export function SettingsPage() {
  const [fontSize, setFontSize] = useState<'small' | 'standard' | 'large'>('standard');
  const [accent, setAccent] = useState<'uk' | 'us'>('us');

  return (
    <>
      <div className="settings-section">
        <div className="settings-section__label">正文字号</div>
        <div className="settings-radio">
          {(['small', 'standard', 'large'] as const).map((s) => (
            <label key={s} onClick={() => setFontSize(s)}>
              <input type="radio" checked={fontSize === s} onChange={() => {}} />
              {s === 'small' ? '小' : s === 'standard' ? '标准' : '大'}
            </label>
          ))}
        </div>
      </div>

      <div className="settings-section">
        <div className="settings-section__label">默认发音</div>
        <div className="settings-radio">
          {(['uk', 'us'] as const).map((a) => (
            <label key={a} onClick={() => setAccent(a)}>
              <input type="radio" checked={accent === a} onChange={() => {}} />
              {a === 'uk' ? '英音' : '美音'}
            </label>
          ))}
        </div>
      </div>

      <div className="settings-section">
        <div className="settings-section__label">音频缓存</div>
        <p style={{ fontSize: 13, color: 'var(--secondary-text)' }}>音频在首次播放时自动缓存。在浏览器设置中清除网站数据会同时清除缓存和本地学习记录。</p>
      </div>

      <div className="settings-warning">
        学习记录只保存在本机浏览器存储。清除浏览器数据、卸载 PWA 或换设备可能永久丢失记录。如需换手机，建议先在旧设备打开本页截图记录熟悉度。
      </div>
    </>
  );
}
