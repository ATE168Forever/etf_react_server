import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { API_HOST } from '../config';
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
import { getFeatureUpdates } from './featureUpdates';

const VIEWBOX_WIDTH = 720;
const VIEWBOX_HEIGHT = 280;
const CHART_PADDING = { top: 24, right: 24, bottom: 38, left: 56 };
const BAR_COLOR = 'var(--accent-gold, #d4af37)';
const LINE_COLOR = 'var(--color-primary, #7c99ff)';
const AXIS_COLOR = 'var(--color-border, rgba(160, 169, 199, 0.3))';
const TEXT_COLOR = 'var(--color-text-muted, #a3aed0)';

function DividendChart({
  data,
  labels,
  currency,
  heading,
  t,
  lang,
  selectedIndex,
  onSelect,
}) {
  const totalsArray = Array.isArray(data?.totals)
    ? data.totals.slice(0, 12)
    : [];
  if (!totalsArray.length) {
    return <p style={{ marginTop: 12 }}>{t('dividend_chart_empty')}</p>;
  }

  const safeLabels = labels.slice(0, totalsArray.length);
  const monthCount = safeLabels.length;
  if (!monthCount) {
    return <p style={{ marginTop: 12 }}>{t('dividend_chart_empty')}</p>;
  }

  const normalizedTotals = totalsArray.slice(0, monthCount).map((value) => Number(value) || 0);
  const hasMonthlyValues = normalizedTotals.some((value) => value > 0);

  let running = 0;
  const cumulativeSource = Array.isArray(data?.cumulative) && data.cumulative.length
    ? data.cumulative.slice(0, monthCount).map((value) => Number(value) || 0)
    : normalizedTotals.map((value) => {
        running += value;
        return running;
      });
  const hasCumulativeValues = cumulativeSource.some((value) => value > 0);

  if (!hasMonthlyValues && !hasCumulativeValues) {
    return <p style={{ marginTop: 12 }}>{t('dividend_chart_empty')}</p>;
  }

  const chartHeight = VIEWBOX_HEIGHT - CHART_PADDING.top - CHART_PADDING.bottom;
  const chartWidth = VIEWBOX_WIDTH - CHART_PADDING.left - CHART_PADDING.right;
  const axisY = VIEWBOX_HEIGHT - CHART_PADDING.bottom;
  const axisXStart = CHART_PADDING.left;
  const axisXEnd = axisXStart + chartWidth;
  const xStep = chartWidth / monthCount;
  const barWidth = Math.max(6, xStep * 0.55);

  const monthlyMax = Math.max(...normalizedTotals, 1);
  const cumulativeMax = Math.max(...cumulativeSource, 1);

  const points = cumulativeSource.map((value, idx) => {
    const x = axisXStart + idx * xStep + xStep / 2;
    const y = axisY - (value / cumulativeMax) * chartHeight;
    return { x, y };
  });

  const linePath = points
    .map((point, idx) => `${idx === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
    .join(' ');

  const locale = lang === 'en' ? 'en-US' : 'zh-TW';
  const numberFormatter = useMemo(
    () =>
      new Intl.NumberFormat(locale, {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      }),
    [locale],
  );
  const formatValue = (value) => numberFormatter.format(value);

  return (
    <div className="dividend-chart-wrapper">
      <div
        className="dividend-chart"
        role="img"
        aria-label={heading}
      >
        <svg viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`}>
          <line
            x1={axisXStart}
            y1={axisY}
            x2={axisXEnd}
            y2={axisY}
            stroke={AXIS_COLOR}
            strokeWidth="1"
          />
          {normalizedTotals.map((value, idx) => {
            const barHeight = (value / monthlyMax) * chartHeight;
            const x = axisXStart + idx * xStep + (xStep - barWidth) / 2;
            const y = axisY - barHeight;
            return (
              <g key={`bar-${idx}`}>
                <rect
                  x={x}
                  y={y}
                  width={barWidth}
                  height={barHeight}
                  rx={4}
                  fill={BAR_COLOR}
                  opacity="0.85"
                  className="chart-bar"
                  onClick={() => onSelect?.(idx)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      onSelect?.(idx);
                    }
                  }}
                  role="button"
                  tabIndex={0}
                  aria-label={`${t('dividend_chart_monthly_label')} ${safeLabels[idx]} ${formatValue(value)}`}
                  data-active={selectedIndex === idx}
                />
                {value > 0 && (
                  <text
                    x={x + barWidth / 2}
                    y={Math.max(y - 6, 14)}
                    textAnchor="middle"
                    fontSize="11"
                    fill={TEXT_COLOR}
                  >
                    {formatValue(value)}
                  </text>
                )}
              </g>
            );
          })}
          {linePath && (
            <path
              d={linePath}
              fill="none"
              stroke={LINE_COLOR}
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}
          {points.map((point, idx) => (
            <g key={`point-${idx}`}>
              <circle
                cx={point.x}
                cy={point.y}
                r="3"
                fill={LINE_COLOR}
                stroke="var(--color-card-bg, #111319)"
                strokeWidth="1.5"
              />
              {cumulativeSource[idx] > 0 && (
                <text
                  x={point.x}
                  y={Math.max(point.y - 10, 12)}
                  textAnchor="middle"
                  fontSize="11"
                  fill={LINE_COLOR}
                >
                  {formatValue(cumulativeSource[idx])}
                </text>
              )}
            </g>
          ))}
          {safeLabels.map((label, idx) => (
            <text
              key={`label-${idx}`}
              x={axisXStart + idx * xStep + xStep / 2}
              y={axisY + 18}
              textAnchor="middle"
              fontSize="12"
              fill={TEXT_COLOR}
            >
              {label}
            </text>
          ))}
        </svg>
      </div>
        <div className="dividend-chart-legend">
          <div className="legend-item">
            <span className="legend-swatch" />
            <span>{`${t('dividend_chart_monthly_label')} (${currency})`}</span>
          </div>
          <div className="legend-item">
            <span className="legend-line" />
            <span>{`${t('dividend_chart_cumulative_label')} (${currency})`}</span>
          </div>
        </div>
    </div>
  );
}

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
  const [inventoryLoaded, setInventoryLoaded] = useState(false);
  const [showFeatureUpdates, setShowFeatureUpdates] = useState(false);
  const [chartCurrency, setChartCurrency] = useState(null);
  const [selectedMonthIndex, setSelectedMonthIndex] = useState(null);
  const { t, lang } = useLanguage();
  const featureUpdates = useMemo(() => getFeatureUpdates(lang), [lang]);
  const monthLabels = useMemo(() => {
    const formatter = new Intl.DateTimeFormat(lang === 'en' ? 'en-US' : 'zh-TW', { month: 'short' });
    return Array.from({ length: 12 }, (_, idx) => formatter.format(new Date(2000, idx, 1)));
  }, [lang]);

  useEffect(() => {
    let cancelled = false;
    // React StrictMode purposely invokes effects twice in development to surface
    // side effects. The call is still idempotent because fetchWithCache
    // short-circuits repeat network requests within the TTL window.
    fetchWithCache(`${API_HOST}/site_stats?en=${lang === 'en'}`, 2 * 60 * 60 * 1000)
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
    setInventoryLoaded(true);
  }, []);

  useEffect(() => {
    if (!inventoryLoaded) return;
    let cancelled = false;
    const inventory = Array.isArray(goalSummary.inventoryList) ? goalSummary.inventoryList : [];
    const purchasedIds = Array.from(new Set(
      inventory
        .map(item => {
          const raw = item?.stock_id;
          return typeof raw === 'string' ? raw.trim() : raw ? String(raw).trim() : '';
        })
        .filter(Boolean)
    ));
    const stockIdsOption = purchasedIds.length ? purchasedIds : 'all';

    fetchDividendsByYears(undefined, undefined, { stockIds: stockIdsOption })
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
  }, [goalSummary.inventoryList, inventoryLoaded]);

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
      messages: goalMessages
    }),
    [dividendSummary, goalSummary.goals, goalMessages]
  );

  const goalTitle = goalSummary.goals.goalName?.trim() || t('investment_goals');

  const goalShareConfig = useMemo(() => {
    if (!Array.isArray(goalRows) || goalRows.length === 0) {
      return null;
    }
    const metricValue = (id) => {
      const metric = Array.isArray(goalMetrics)
        ? goalMetrics.find((item) => item.id === id)
        : null;
      return metric?.value || '';
    };
    const primaryRow = goalRows[0];
    const messageParts = [
      `${t('share_goal_message_title')} ${goalTitle}`,
      metricValue('achievement')
        ? `${t('share_goal_message_achievement')} ${metricValue('achievement')}`
        : '',
      metricValue('ytd')
        ? `${t('share_goal_message_ytd')} ${metricValue('ytd')}`
        : '',
      primaryRow
        ? `${t('share_goal_message_target')} ${primaryRow.current} / ${primaryRow.target}`
        : '',
      t('share_goal_message_suffix'),
      t('share_goal_message_highlights'),
      t('share_goal_message_invite')
    ].filter(Boolean);
    const message = messageParts.join('\n').trim();
    if (!message) {
      return null;
    }
    return {
      heading: t('share_goal_heading'),
      description: t('share_goal_description'),
      shareButtonLabel: t('share_goal_share_button'),
      shareAriaLabel: t('share_goal_share_button_aria'),
      copyButtonLabel: t('share_goal_copy_button'),
      copiedFeedback: t('share_goal_copied_feedback'),
      copyError: t('share_goal_copy_error'),
      sharedFeedback: t('share_goal_shared_feedback'),
      shareUnavailable: t('share_goal_unavailable'),
      closeLabel: t('share_goal_close_button'),
      closeAriaLabel: t('share_goal_close_button_aria'),
      previewLabel: t('share_goal_preview_label'),
      destinationsLabel: t('share_goal_destinations_label'),
      destinations: t('share_goal_destinations'),
      destinationsFallback: t('share_goal_destinations_fallback'),
      destinationsNote: t('share_goal_destinations_note'),
      message,
      title: goalTitle
    };
  }, [goalRows, goalMetrics, goalTitle, t]);

  const availableChartCurrencies = useMemo(() => {
    const perCurrency = dividendSummary.perCurrency || {};
    return Object.keys(perCurrency).filter((currency) => {
      const bucket = perCurrency[currency];
      return (
        bucket &&
        Array.isArray(bucket.monthlyTotalsSeries) &&
        bucket.monthlyTotalsSeries.some((value) => Number(value) > 0)
      );
    });
  }, [dividendSummary.perCurrency]);

  useEffect(() => {
    if (availableChartCurrencies.length === 0) {
      setChartCurrency(null);
      return;
    }
    if (!chartCurrency || !availableChartCurrencies.includes(chartCurrency)) {
      setChartCurrency(
        availableChartCurrencies.includes(dividendSummary.baseCurrency)
          ? dividendSummary.baseCurrency
          : availableChartCurrencies[0],
      );
    }
  }, [availableChartCurrencies, chartCurrency, dividendSummary.baseCurrency]);

  const dividendChartConfig = useMemo(() => {
    if (!chartCurrency) return null;
    const perCurrency = dividendSummary.perCurrency || {};
    const bucket = perCurrency[chartCurrency];
    if (!bucket || !Array.isArray(bucket.monthlyTotalsSeries)) {
      return null;
    }

    return {
      currency: chartCurrency,
      totals: bucket.monthlyTotalsSeries,
      cumulative: Array.isArray(bucket.monthlyCumulativeSeries)
        ? bucket.monthlyCumulativeSeries
        : null,
      year: dividendSummary.annualYear || new Date().getFullYear(),
    };
  }, [chartCurrency, dividendSummary]);

  const handleChartCurrencyChange = useCallback((currency) => {
    setChartCurrency(currency);
    setSelectedMonthIndex(null);
  }, []);

  const handleSelectMonth = useCallback((index) => {
    setSelectedMonthIndex((prev) => (prev === index ? null : index));
  }, []);

  const selectedDetail = useMemo(() => {
    if (
      selectedMonthIndex === null ||
      !dividendChartConfig ||
      !Array.isArray(dividendChartConfig.totals)
    ) {
      return null;
    }
    const totals = dividendChartConfig.totals;
    const cumulative =
      Array.isArray(dividendChartConfig.cumulative) && dividendChartConfig.cumulative.length
        ? dividendChartConfig.cumulative
        : null;
    if (selectedMonthIndex < 0 || selectedMonthIndex >= totals.length) {
      return null;
    }
    const monthlyValue = Number(totals[selectedMonthIndex]) || 0;
    const cumulativeValue = cumulative ? Number(cumulative[selectedMonthIndex]) || 0 : null;
    return {
      monthLabel: monthLabels[selectedMonthIndex],
      monthlyValue,
      cumulativeValue,
    };
  }, [selectedMonthIndex, dividendChartConfig, monthLabels]);

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
      {dividendChartConfig && (
        <section className="mt-4">
          <div className="chart-header">
            <h5>{`${dividendChartConfig.year} ${t('dividend_chart_heading')}`}</h5>
            {availableChartCurrencies.length > 1 && (
              <div className="dividend-chart-currency-switch">
                <span className="currency-switch-label">{t('dividend_currency_label')}</span>
                {availableChartCurrencies.map((currency) => (
                  <button
                    key={`chart-currency-${currency}`}
                    type="button"
                    className={
                      currency === chartCurrency
                        ? 'currency-pill currency-pill--active'
                        : 'currency-pill'
                    }
                    onClick={() => handleChartCurrencyChange(currency)}
                  >
                    {currency}
                  </button>
                ))}
              </div>
            )}
          </div>
          <DividendChart
            data={dividendChartConfig}
            labels={monthLabels}
            currency={dividendChartConfig.currency}
            heading={`${dividendChartConfig.year} ${t('dividend_chart_heading')}`}
            t={t}
            lang={lang}
            selectedIndex={selectedMonthIndex}
            onSelect={handleSelectMonth}
          />
          {selectedDetail && (
            <div className="dividend-chart-detail">
              <div>
                <div className="detail-label">{t('dividend_chart_detail_title')}</div>
                <div className="detail-value">
                  {dividendChartConfig.year} {selectedDetail.monthLabel}
                </div>
              </div>
              <div>
                <div className="detail-label">{t('dividend_chart_monthly_label')}</div>
                <div className="detail-value">
                  {selectedDetail.monthlyValue.toLocaleString(lang === 'en' ? 'en-US' : 'zh-TW', {
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 2,
                  })}
                  {' '}
                  {dividendChartConfig.currency}
                </div>
              </div>
              <div>
                <div className="detail-label">{t('dividend_chart_cumulative_label')}</div>
                <div className="detail-value">
                  {selectedDetail.cumulativeValue !== null
                    ? selectedDetail.cumulativeValue.toLocaleString(
                        lang === 'en' ? 'en-US' : 'zh-TW',
                        { minimumFractionDigits: 0, maximumFractionDigits: 2 },
                      )
                    : '-'}
                  {' '}
                  {dividendChartConfig.currency}
                </div>
              </div>
            </div>
          )}
        </section>
      )}
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
        share={goalShareConfig}
      />
    </div>
  );
}
