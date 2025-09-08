import React, { useMemo } from 'react';

const milestones = [
  { value: '80+', label: '已收錄台灣 ETF' },
  { value: '20,000+', label: '累積配息紀錄' },
  { value: '10+ 年', label: '歷史資料涵蓋' }
];

const latest = [
  '✅ 已更新 2025 年 9 月最新配息數據',
  '📊 新增 ETF：00943 台新永續高息'
];

const tips = [
  '你知道嗎？ETF 的配息頻率通常有「月配、季配、半年配、年配」四種。',
  '高股息 ETF 不代表報酬率高，還需要考慮殖利率與價格變化。'
];

export default function HomeTab() {
  const tip = useMemo(() => tips[Math.floor(Math.random() * tips.length)], []);
  return (
    <div className="container" style={{ maxWidth: 800 }}>
      <section className="mt-4">
        <h2>本站數據概況</h2>
        <div style={{ display: 'flex', justifyContent: 'space-between', textAlign: 'center', marginTop: 16 }}>
          {milestones.map((m, idx) => (
            <div key={idx} style={{ flex: 1 }}>
              <div style={{ fontSize: 32, fontWeight: 'bold' }}>{m.value}</div>
              <div>{m.label}</div>
            </div>
          ))}
        </div>
      </section>
      <section className="mt-4">
        <h2>最新收錄</h2>
        <ul>
          {latest.map((item, idx) => (
            <li key={idx}>{item}</li>
          ))}
        </ul>
      </section>
      <section className="mt-4" style={{ background: '#f5f5f5', padding: 16, borderRadius: 4 }}>
        <h2>ETF 小知識</h2>
        <p style={{ margin: 0 }}>{tip}</p>
      </section>
    </div>
  );
}
