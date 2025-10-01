import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { API_HOST } from './config';
import { fetchWithCache } from './api';
import { fetchDividendsByYears } from './dividendApi';
import { useLanguage } from './i18n';
import { readTransactionHistory } from './utils/transactionStorage';
import { summarizeInventory } from './utils/inventoryUtils';
import { loadInvestmentGoals } from './utils/investmentGoalsStorage';
import InvestmentGoalCard from './components/InvestmentGoalCard';
import {
  calculateDividendSummary,
  buildDividendGoalViewModel
} from './utils/dividendGoalUtils';
import { featureUpdates } from './featureUpdates';

export default function HomeTab() {
  const [stats, setStats] = useState({ milestones: [], latest: [], tip: '' });
  const [goalSummary, setGoalSummary] = useState(() => {
    const goals = loadInvestmentGoals();
    return {
      goals,
      inventoryList: []
    };
  });
  const [transactionHistory, setTransactionHistory] = useState([]);
  const [dividendData, setDividendData] = useState([]);
  const [showFeatureUpdates, setShowFeatureUpdates] = useState(false);
  const { t, lang } = useLanguage();

  useEffect(() => {
    let cancelled = false;
    fetchWithCache(`${API_HOST}/site_stats?en=${lang === 'en'}`, 4 * 60 * 60 * 1000)
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
  }, [lang]);

  useEffect(() => {
    const history = readTransactionHistory();
    setTransactionHistory(history);
    const { inventoryList } = summarizeInventory(history);
    const goals = loadInvestmentGoals();
    setGoalSummary({ goals, inventoryList });
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetchDividendsByYears()
      .then(({ data }) => {
        if (!cancelled) {
          setDividendData(data);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setDividendData([]);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const formatCurrency = useCallback(value => {
    if (!Number.isFinite(value)) return '0.00';
    return Number(value).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }, []);

  const dividendSummary = useMemo(
    () => calculateDividendSummary({
      inventoryList: goalSummary.inventoryList,
      dividendEvents: dividendData,
      transactionHistory
    }),
    [goalSummary.inventoryList, dividendData, transactionHistory]
  );

  const goalMessages = useMemo(() => ({
    annualGoal: t('annual_goal'),
    monthlyGoal: t('monthly_goal'),
    minimumGoal: t('minimum_goal'),
    goalDividendAccumulated: t('goal_dividend_accumulated'),
    goalDividendMonthly: t('goal_dividend_monthly'),
    goalDividendMinimum: t('goal_dividend_minimum'),
    goalDividendYtdLabel: t('goal_dividend_ytd_label'),
    goalDividendAnnualLabel: t('goal_dividend_annual_label'),
    goalDividendMonthlyLabel: t('goal_dividend_monthly_label'),
    goalDividendMinimumLabel: t('goal_dividend_minimum_label'),
    goalAchievementLabel: t('goal_achievement_label'),
    goalTargetAnnual: t('goal_target_annual'),
    goalTargetMonthly: t('goal_target_monthly'),
    goalTargetMinimum: t('goal_target_minimum'),
    goalPercentPlaceholder: t('goal_percent_placeholder'),
    goalAnnualHalf: t('goal_annual_half'),
    goalAnnualDone: t('goal_annual_full'),
    goalMonthlyHalf: t('goal_monthly_half'),
    goalMonthlyDone: t('goal_monthly_full'),
    goalMinimumHalf: t('goal_minimum_half'),
    goalMinimumDone: t('goal_minimum_full'),
    goalEmpty: t('goal_empty_state')
  }), [t]);

  const {
    metrics: goalMetrics,
    rows: goalRows,
    emptyState: goalEmptyState
  } = useMemo(
    () => buildDividendGoalViewModel({
      summary: dividendSummary,
      goals: goalSummary.goals,
      messages: goalMessages,
      formatCurrency
    }),
    [dividendSummary, goalSummary.goals, goalMessages, formatCurrency]
  );

  const goalTitle = goalSummary.goals.goalName?.trim() || t('investment_goals');

  return (
    <div className="container" style={{ maxWidth: 800 }}>
      <section className="mt-4">
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 12
          }}
        >
          <h5 style={{ marginBottom: 0 }}>{t('feature_updates')}</h5>
          <button
            type="button"
            onClick={() => setShowFeatureUpdates((prev) => !prev)}
            style={{
              background: 'transparent',
              border: '1px solid var(--color-border)',
              borderRadius: 4,
              padding: '4px 12px',
              cursor: 'pointer'
            }}
            aria-expanded={showFeatureUpdates}
          >
            {showFeatureUpdates
              ? t('hide_feature_updates')
              : t('show_feature_updates')}
          </button>
        </div>
        {showFeatureUpdates && (
          <div
            style={{
              marginTop: 12,
              border: '1px solid var(--color-border)',
              borderRadius: 4,
              overflow: 'hidden'
            }}
          >
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
              <thead style={{ background: 'var(--color-row-even)' }}>
                <tr>
                  <th
                    style={{ textAlign: 'left', padding: '8px 12px', width: '20%' }}
                  >
                    {t('feature_update_date')}
                  </th>
                  <th
                    style={{ textAlign: 'left', padding: '8px 12px', width: '20%' }}
                  >
                    {t('feature_update_category')}
                  </th>
                  <th style={{ textAlign: 'left', padding: '8px 12px' }}>
                    {t('feature_update_summary')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {featureUpdates.map((update, idx) => (
                  <tr
                    key={`${update.date}-${update.category}-${idx}`}
                    style={{
                      background: idx % 2 === 0 ? 'transparent' : 'var(--color-row-even)'
                    }}
                  >
                    <td style={{ padding: '8px 12px', verticalAlign: 'top' }}>
                      {update.date}
                    </td>
                    <td style={{ padding: '8px 12px', verticalAlign: 'top' }}>
                      {update.category}
                    </td>
                    <td style={{ padding: '8px 12px', verticalAlign: 'top' }}>
                      {update.description}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
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
      <InvestmentGoalCard
        title={goalTitle}
        metrics={goalMetrics}
        rows={goalRows}
        emptyState={goalEmptyState}
      />
    </div>
  );
}

