import React, { useEffect, useState } from 'react';
import { API_HOST } from './config';
import { fetchWithCache } from './api';
import { useLanguage } from './i18n';
import { readTransactionHistory } from './transactionStorage';
import { summarizeInventory, calculateMonthlyContribution } from './inventoryUtils';
import { loadInvestmentGoals } from './investmentGoalsStorage';
import InvestmentGoalCard from './components/InvestmentGoalCard';

export default function HomeTab() {
  const [stats, setStats] = useState({ milestones: [], latest: [], tip: '' });
  const [goalSummary, setGoalSummary] = useState(() => {
    const goals = loadInvestmentGoals();
    return {
      goals,
      totalInvestment: 0,
      monthlyContribution: 0
    };
  });
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
    const { totalInvestment } = summarizeInventory(history);
    const monthlyContribution = calculateMonthlyContribution(history);
    const goals = loadInvestmentGoals();
    setGoalSummary({ goals, totalInvestment, monthlyContribution });
  }, []);

  const formatCurrency = value => {
    if (!Number.isFinite(value)) return '0.00';
    return value.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  const totalGoalSet = goalSummary.goals.totalTarget > 0;
  const monthlyGoalSet = goalSummary.goals.monthlyTarget > 0;
  const totalPercentValue = totalGoalSet
    ? Math.min(1, goalSummary.totalInvestment / goalSummary.goals.totalTarget)
    : 0;
  const monthlyPercentValue = monthlyGoalSet
    ? Math.min(1, goalSummary.monthlyContribution / goalSummary.goals.monthlyTarget)
    : 0;

  const goalRows = [
    {
      id: 'total',
      label: t('total_goal'),
      current: `${t('goal_current_total')}${formatCurrency(goalSummary.totalInvestment)}`,
      target: `${t('goal_target')}${totalGoalSet
        ? formatCurrency(goalSummary.goals.totalTarget)
        : t('goal_not_set')}`,
      percent: totalPercentValue,
      percentLabel: totalGoalSet
        ? `${Math.min(100, Math.round(totalPercentValue * 100))}%`
        : t('goal_percent_placeholder'),
      encouragement: totalGoalSet
        ? totalPercentValue >= 1
          ? t('goal_encourage_total_full')
          : totalPercentValue >= 0.5
            ? t('goal_encourage_total_half')
            : ''
        : ''
    },
    {
      id: 'monthly',
      label: t('monthly_goal'),
      current: `${t('goal_current_month')}${formatCurrency(goalSummary.monthlyContribution)}`,
      target: `${t('goal_target')}${monthlyGoalSet
        ? formatCurrency(goalSummary.goals.monthlyTarget)
        : t('goal_not_set')}`,
      percent: monthlyPercentValue,
      percentLabel: monthlyGoalSet
        ? `${Math.min(100, Math.round(monthlyPercentValue * 100))}%`
        : t('goal_percent_placeholder'),
      encouragement: monthlyGoalSet
        ? monthlyPercentValue >= 1
          ? t('goal_encourage_month_full')
          : monthlyPercentValue >= 0.5
            ? t('goal_encourage_month_half')
            : ''
        : ''
    }
  ];

  const goalEmptyState = !totalGoalSet && !monthlyGoalSet ? t('goal_empty_state') : '';

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
        title={t('investment_goals')}
        rows={goalRows}
        emptyState={goalEmptyState}
      />
    </div>
  );
}

