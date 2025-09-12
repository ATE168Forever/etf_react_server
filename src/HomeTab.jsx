import React, { useEffect, useState } from 'react';
import { API_HOST } from './config';
import { fetchWithCache } from './api';
import { useLanguage } from './i18n';

export default function HomeTab() {
  const [stats, setStats] = useState({ milestones: [], latest: [], tip: '' });
  const { t } = useLanguage();

  useEffect(() => {
    let cancelled = false;
    fetchWithCache(`${API_HOST}/site_stats`, 4 * 60 * 60 * 1000)
      .then(({ data }) => {
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
        <h5>{t('site_stats')}</h5>
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
        <h5>{t('latest')}</h5>
        <ul>
          {stats.latest.map((item, idx) => (
            <li key={idx}>{item}</li>
          ))}
        </ul>
      </section>
      <section
        className="mt-4"
        style={{ background: 'var(--color-row-even)', padding: 16, borderRadius: 4 }}
      >
        <h5>{t('etf_tips')}</h5>
        <p style={{ margin: 0 }}>{stats.tip}</p>
      </section>
    </div>
  );
}

