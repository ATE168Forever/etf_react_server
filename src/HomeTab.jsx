import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { API_HOST } from './config';
import { fetchWithCache } from './api';
import { fetchDividendsByYears } from './dividendApi';
import { useLanguage } from './i18n';
import { readTransactionHistory } from './transactionStorage';
import { summarizeInventory } from './inventoryUtils';
import { loadInvestmentGoals } from './investmentGoalsStorage';
import InvestmentGoalCard from './components/InvestmentGoalCard';
import {
  calculateDividendSummary,
  buildDividendGoalViewModel
} from './dividendGoalUtils';

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
    goalDividendAccumulated: t('goal_dividend_accumulated'),
    goalDividendMonthly: t('goal_dividend_monthly'),
    goalDividendYtdLabel: t('goal_dividend_ytd_label'),
    goalDividendAnnualLabel: t('goal_dividend_annual_label'),
    goalDividendMonthlyLabel: t('goal_dividend_monthly_label'),
    goalAchievementLabel: t('goal_achievement_label'),
    goalTargetAnnual: t('goal_target_annual'),
    goalTargetMonthly: t('goal_target_monthly'),
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

