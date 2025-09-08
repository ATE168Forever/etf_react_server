import React, { useEffect, useState } from 'react';

export default function HomeTab() {
  const [stats, setStats] = useState({ milestones: [], latest: [], tip: '' });

  useEffect(() => {
    let cancelled = false;
    fetch('http://127.0.0.1:8001/site_stats')
      .then(res => res.json())
      .then(data => {
        if (!cancelled) {
          setStats({
            milestones: Array.isArray(data?.milestones) ? data.milestones : [],
            latest: Array.isArray(data?.latest) ? data.latest : [],
            tip: data?.tip || '',
          });
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="container" style={{ maxWidth: 800 }}>
      <section className="mt-4">
        <h2>本站數據概況</h2>
        <div style={{ display: 'flex', justifyContent: 'space-between', textAlign: 'center', marginTop: 16 }}>
          {stats.milestones.map((m, idx) => (
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
          {stats.latest.map((item, idx) => (
            <li key={idx}>{item}</li>
          ))}
        </ul>
      </section>
      <section className="mt-4" style={{ background: '#f5f5f5', padding: 16, borderRadius: 4 }}>
        <h2>ETF 小知識</h2>
        <p style={{ margin: 0 }}>{stats.tip}</p>
      </section>
    </div>
  );
}

