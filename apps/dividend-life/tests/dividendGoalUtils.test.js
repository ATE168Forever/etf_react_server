/* eslint-env jest */
import {
  calculateDividendSummary,
  buildDividendGoalViewModel
} from '../src/utils/dividendGoalUtils';

describe('dividend goal helpers', () => {
  test('calculates dividend summary for current year', () => {
    const inventoryList = [
      { stock_id: '0050', total_quantity: 1000 },
      { stock_id: '00878', total_quantity: 500 }
    ];
    const transactionHistory = [
      { stock_id: '0050', date: '2023-12-15', quantity: 1000, type: 'buy' },
      { stock_id: '00878', date: '2024-01-10', quantity: 500, type: 'buy' }
    ];
    const dividendEvents = [
      { stock_id: '0050', dividend_date: '2024-01-10', dividend: '1', currency: 'TWD' },
      { stock_id: '0050', dividend_date: '2024-06-10', dividend: '0.8', currency: 'TWD' },
      { stock_id: '00878', dividend_date: '2024-03-15', dividend: '0.5', currency: 'TWD' },
      { stock_id: '0050', dividend_date: '2023-12-10', dividend: '0.6', currency: 'TWD' }
    ];

    const summary = calculateDividendSummary({
      inventoryList,
      dividendEvents,
      transactionHistory,
      asOfDate: new Date('2024-07-01')
    });

    const total = 1000 * 1 + 1000 * 0.8 + 500 * 0.5;
    expect(summary).toMatchObject({
      accumulatedTotal: total,
      annualTotal: total,
      annualYear: 2024,
      monthlyAverage: total / 6,
      monthlyMinimum: 0,
      baseCurrency: 'TWD',
      perCurrency: {
        TWD: {
          accumulatedTotal: total,
          annualTotal: total,
          monthlyAverage: total / 6,
          monthlyMinimum: 0
        }
      }
    });
  });

  test('uses transaction history quantity at dividend date', () => {
    const transactionHistory = [
      { stock_id: '0050', date: '2023-12-01', quantity: 1000, type: 'buy' },
      { stock_id: '0050', date: '2024-02-01', quantity: 1000, type: 'sell' }
    ];
    const dividendEvents = [
      { stock_id: '0050', dividend_date: '2024-01-10', dividend: '1', currency: 'TWD' },
      { stock_id: '0050', dividend_date: '2024-03-10', dividend: '1', currency: 'TWD' }
    ];

    const summary = calculateDividendSummary({
      inventoryList: [],
      dividendEvents,
      transactionHistory,
      asOfDate: new Date('2024-04-01')
    });

    expect(summary).toMatchObject({
      accumulatedTotal: 1000,
      annualTotal: 1000,
      annualYear: 2024,
      monthlyAverage: 1000,
      monthlyMinimum: 0,
      baseCurrency: 'TWD',
      perCurrency: {
        TWD: {
          accumulatedTotal: 1000,
          annualTotal: 1000,
          monthlyAverage: 1000,
          monthlyMinimum: 0
        }
      }
    });
  });

  test('falls back to inventory totals when history is unavailable', () => {
    const inventoryList = [
      { stock_id: '0050', total_quantity: 100 }
    ];
    const dividendEvents = [
      { stock_id: '0050', dividend_date: '2024-01-10', dividend: '2', currency: 'TWD' }
    ];

    const summary = calculateDividendSummary({
      inventoryList,
      dividendEvents,
      transactionHistory: null,
      asOfDate: new Date('2024-02-01')
    });

    expect(summary).toMatchObject({
      accumulatedTotal: 200,
      annualTotal: 200,
      annualYear: 2024,
      monthlyAverage: 200,
      monthlyMinimum: 0,
      baseCurrency: 'TWD',
      perCurrency: {
        TWD: {
          accumulatedTotal: 200,
          annualTotal: 200,
          monthlyAverage: 200,
          monthlyMinimum: 0
        }
      }
    });
  });

  test('separates dividend totals by currency', () => {
    const inventoryList = [
      { stock_id: '0050', total_quantity: 100 },
      { stock_id: 'VUSD', total_quantity: 50 }
    ];
    const dividendEvents = [
      { stock_id: '0050', dividend_date: '2024-01-10', dividend: '2', currency: 'TWD' },
      { stock_id: 'VUSD', dividend_date: '2024-02-15', dividend: '0.5', currency: 'usd' }
    ];

    const summary = calculateDividendSummary({
      inventoryList,
      dividendEvents,
      transactionHistory: [],
      asOfDate: new Date('2024-03-01')
    });

    expect(summary.baseCurrency).toBe('TWD');
    expect(summary.accumulatedTotal).toBeCloseTo(200);
    expect(summary.perCurrency).toMatchObject({
      TWD: {
        accumulatedTotal: 200,
        annualTotal: 200
      },
      USD: {
        accumulatedTotal: 25,
        annualTotal: 25
      }
    });
  });

  test('builds multi-currency labels when summary includes foreign dividends', () => {
    const summary = {
      accumulatedTotal: 200,
      annualTotal: 200,
      annualYear: 2024,
      monthlyAverage: 40,
      monthlyMinimum: 10,
      baseCurrency: 'TWD',
      perCurrency: {
        TWD: {
          accumulatedTotal: 200,
          annualTotal: 200,
          monthlyAverage: 40,
          monthlyMinimum: 10
        },
        USD: {
          accumulatedTotal: 25,
          annualTotal: 25,
          monthlyAverage: 5,
          monthlyMinimum: 0
        }
      }
    };
    const goals = {
      cashflowGoals: [
        { id: 'goal-twd', goalType: 'annual', target: 400, currency: 'TWD' }
      ]
    };
    const messages = {
      annualGoal: '年度目標',
      monthlyGoal: '月平均目標',
      minimumGoal: '每月最低目標',
      goalDividendAccumulated: '累積股息：',
      goalDividendMonthly: '每月平均股息：',
      goalDividendMinimum: '每月最低股息：',
      goalDividendYtdLabel: '累積股息',
      goalDividendAnnualLabel: '年度股息',
      goalDividendMonthlyLabel: '每月平均股息',
      goalDividendMinimumLabel: '每月最低股息',
      goalAchievementLabel: '達成率',
      goalTargetAnnual: '年度目標：',
      goalTargetMonthly: '月平均目標：',
      goalTargetMinimum: '每月最低目標：',
      goalPercentPlaceholder: '--',
      goalAnnualHalf: '年度過半',
      goalAnnualDone: '年度完成',
      goalMonthlyHalf: '月過半',
      goalMonthlyDone: '月完成',
      goalMinimumHalf: '月最低過半',
      goalMinimumDone: '月最低完成',
      goalEmpty: ''
    };

    const { metrics, rows, currencyBreakdown, currencyMetrics } = buildDividendGoalViewModel({
      summary,
      goals,
      messages,
      formatCurrency: value => Number(value).toFixed(0)
    });

    const ytdMetric = metrics.find(metric => metric.id === 'ytd');
    expect(ytdMetric.value).toBe('NT$ 200 + US$ 25');

    const annualMetric = metrics.find(metric => metric.id === 'annual');
    expect(annualMetric.value).toBe('NT$ 200 + US$ 25');

    expect(rows).toHaveLength(1);
    expect(rows[0].label).toBe('年度目標 (NT$)');
    expect(rows[0].current).toBe('累積股息：NT$ 200');
    expect(currencyBreakdown).toEqual([
      { currency: 'TWD', label: 'NT$', value: 'NT$ 200' },
      { currency: 'USD', label: 'US$', value: 'US$ 25' }
    ]);
    expect(currencyMetrics).toEqual([
      {
        currency: 'TWD',
        label: 'NT$',
        accumulatedTotal: 'NT$ 200',
        annualTotal: 'NT$ 200',
        monthlyAverage: 'NT$ 40',
        monthlyMinimum: 'NT$ 10'
      },
      {
        currency: 'USD',
        label: 'US$',
        accumulatedTotal: 'US$ 25',
        annualTotal: 'US$ 25',
        monthlyAverage: 'US$ 5',
        monthlyMinimum: 'US$ 0'
      }
    ]);
  });

  test('builds goal view model with metrics and rows', () => {
    const summary = {
      accumulatedTotal: 1800,
      annualTotal: 2400,
      annualYear: 2024,
      monthlyAverage: 200,
      monthlyMinimum: 120,
      baseCurrency: 'TWD',
      perCurrency: {
        TWD: {
          accumulatedTotal: 1800,
          annualTotal: 2400,
          monthlyAverage: 200,
          monthlyMinimum: 120
        }
      }
    };
    const goals = {
      cashflowGoals: [
        { id: 'annual', goalType: 'annual', target: 3600, currency: 'TWD' },
        { id: 'monthly', goalType: 'monthly', target: 250, currency: 'TWD' }
      ]
    };
    const messages = {
      annualGoal: '年度目標',
      monthlyGoal: '月平均目標',
      minimumGoal: '每月最低目標',
      goalDividendAccumulated: '累積股息：',
      goalDividendMonthly: '每月平均股息：',
      goalDividendMinimum: '每月最低股息：',
      goalDividendYtdLabel: '累積股息',
      goalDividendAnnualLabel: '年度股息',
      goalDividendMonthlyLabel: '每月平均股息',
      goalDividendMinimumLabel: '每月最低股息',
      goalAchievementLabel: '達成率',
      goalTargetAnnual: '年度目標：',
      goalTargetMonthly: '月平均目標：',
      goalTargetMinimum: '每月最低目標：',
      goalPercentPlaceholder: '--',
      goalAnnualHalf: '年度過半',
      goalAnnualDone: '年度完成',
      goalMonthlyHalf: '月過半',
      goalMonthlyDone: '月完成',
      goalMinimumHalf: '月最低過半',
      goalMinimumDone: '月最低完成',
      goalEmpty: ''
    };

    const formatCurrency = value => Number(value).toFixed(0);
    const { metrics, rows, goalType, achievementPercent } = buildDividendGoalViewModel({
      summary,
      goals,
      messages,
      formatCurrency
    });

    expect(metrics).toEqual([
      expect.objectContaining({ id: 'ytd', label: '累積股息', value: 'NT$ 1800' }),
      expect.objectContaining({ id: 'annual', label: '年度股息 (2024)', value: 'NT$ 2400', isActive: true }),
      expect.objectContaining({ id: 'monthly', label: '每月平均股息', value: 'NT$ 200' }),
      expect.objectContaining({ id: 'minimum', label: '每月最低股息', value: 'NT$ 120' }),
      expect.objectContaining({ id: 'achievement', label: '達成率', value: '50%', highlight: true, showCelebration: false })
    ]);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      id: 'annual',
      percentLabel: '50%',
      encouragement: '年度過半'
    });
    expect(rows[0].label).toBe('年度目標 (NT$)');
    expect(rows[0].current).toBe('累積股息：NT$ 1800');
    expect(rows[0].target).toBe('年度目標：NT$ 3600');
    expect(rows[1]).toMatchObject({
      id: 'monthly',
      percentLabel: '80%'
    });
    expect(rows[1].label).toBe('月平均目標 (NT$)');
    expect(rows[1].current).toBe('每月平均股息：NT$ 200');
    expect(rows[1].target).toBe('月平均目標：NT$ 250');
    expect(goalType).toBe('annual');
    expect(achievementPercent).toBeCloseTo(0.5);
  });

  test('builds monthly minimum goal when selected', () => {
    const summary = {
      accumulatedTotal: 900,
      annualTotal: 1500,
      annualYear: 2023,
      monthlyAverage: 120,
      monthlyMinimum: 80,
      baseCurrency: 'TWD',
      perCurrency: {
        TWD: {
          accumulatedTotal: 900,
          annualTotal: 1500,
          monthlyAverage: 120,
          monthlyMinimum: 80
        }
      }
    };
    const messages = {
      annualGoal: '年度目標',
      monthlyGoal: '月平均目標',
      minimumGoal: '每月最低目標',
      goalDividendAccumulated: '累積股息：',
      goalDividendMonthly: '每月平均股息：',
      goalDividendMinimum: '每月最低股息：',
      goalDividendYtdLabel: '累積股息',
      goalDividendAnnualLabel: '年度股息',
      goalDividendMonthlyLabel: '每月平均股息',
      goalDividendMinimumLabel: '每月最低股息',
      goalAchievementLabel: '達成率',
      goalTargetAnnual: '年度目標：',
      goalTargetMonthly: '月平均目標：',
      goalTargetMinimum: '每月最低目標：',
      goalPercentPlaceholder: '--',
      goalAnnualHalf: '年度過半',
      goalAnnualDone: '年度完成',
      goalMonthlyHalf: '月過半',
      goalMonthlyDone: '月完成',
      goalMinimumHalf: '月最低過半',
      goalMinimumDone: '月最低完成',
      goalEmpty: '請新增目標'
    };

    const { rows, emptyState, goalType } = buildDividendGoalViewModel({
      summary,
      goals: {
        cashflowGoals: [
          { id: 'minimum-goal', goalType: 'minimum', target: 120, currency: 'TWD' }
        ]
      },
      messages,
      formatCurrency: value => Number(value).toFixed(0)
    });

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ id: 'minimum-goal', percentLabel: '67%' });
    expect(rows[0].label).toBe('每月最低目標 (NT$)');
    expect(rows[0].current).toBe('每月最低股息：NT$ 80');
    expect(goalType).toBe('minimum');
    expect(emptyState).toBe('');

    const noGoals = buildDividendGoalViewModel({
      summary,
      goals: { cashflowGoals: [] },
      messages,
      formatCurrency: value => Number(value).toFixed(0)
    });

    expect(noGoals.rows).toHaveLength(0);
    expect(noGoals.emptyState).toBe('請新增目標');
  });

  test('uses current year dividends when calculating achievement', () => {
    const summary = {
      accumulatedTotal: 900,
      annualTotal: 1800,
      annualYear: 2023,
      monthlyAverage: 150,
      monthlyMinimum: 90,
      baseCurrency: 'TWD',
      perCurrency: {
        TWD: {
          accumulatedTotal: 900,
          annualTotal: 1800,
          monthlyAverage: 150,
          monthlyMinimum: 90
        }
      }
    };
    const messages = {
      annualGoal: '年度目標',
      monthlyGoal: '月平均目標',
      minimumGoal: '每月最低目標',
      goalDividendAccumulated: '累積股息：',
      goalDividendMonthly: '每月平均股息：',
      goalDividendMinimum: '每月最低股息：',
      goalDividendYtdLabel: '累積股息',
      goalDividendAnnualLabel: '年度股息',
      goalDividendMonthlyLabel: '每月平均股息',
      goalDividendMinimumLabel: '每月最低股息',
      goalAchievementLabel: '達成率',
      goalTargetAnnual: '年度目標：',
      goalTargetMonthly: '月平均目標：',
      goalTargetMinimum: '每月最低目標：',
      goalPercentPlaceholder: '--',
      goalAnnualHalf: '年度過半',
      goalAnnualDone: '年度完成',
      goalMonthlyHalf: '月過半',
      goalMonthlyDone: '月完成',
      goalMinimumHalf: '月最低過半',
      goalMinimumDone: '月最低完成',
      goalEmpty: ''
    };

    const { metrics } = buildDividendGoalViewModel({
      summary,
      goals: {
        cashflowGoals: [
          { id: 'annual', goalType: 'annual', target: 1800, currency: 'TWD' }
        ]
      },
      messages,
      formatCurrency: value => Number(value).toFixed(0)
    });

    const annualMetric = metrics.find(metric => metric.id === 'annual');
    expect(annualMetric.value).toBe('NT$ 1800');
    expect(annualMetric.isActive).toBe(true);
  });

  test('celebrates achievement when reaching 100 percent', () => {
    const summary = {
      accumulatedTotal: 3600,
      annualTotal: 3600,
      annualYear: 2024,
      monthlyAverage: 300,
      monthlyMinimum: 200,
      baseCurrency: 'TWD',
      perCurrency: {
        TWD: {
          accumulatedTotal: 3600,
          annualTotal: 3600,
          monthlyAverage: 300,
          monthlyMinimum: 200
        }
      }
    };
    const messages = {
      annualGoal: '年度目標',
      monthlyGoal: '月平均目標',
      minimumGoal: '每月最低目標',
      goalDividendAccumulated: '累積股息：',
      goalDividendMonthly: '每月平均股息：',
      goalDividendMinimum: '每月最低股息：',
      goalDividendYtdLabel: '累積股息',
      goalDividendAnnualLabel: '年度股息',
      goalDividendMonthlyLabel: '每月平均股息',
      goalDividendMinimumLabel: '每月最低股息',
      goalAchievementLabel: '達成率',
      goalTargetAnnual: '年度目標：',
      goalTargetMonthly: '月平均目標：',
      goalTargetMinimum: '每月最低目標：',
      goalPercentPlaceholder: '--',
      goalAnnualHalf: '年度過半',
      goalAnnualDone: '年度完成',
      goalMonthlyHalf: '月過半',
      goalMonthlyDone: '月完成',
      goalMinimumHalf: '月最低過半',
      goalMinimumDone: '月最低完成',
      goalEmpty: ''
    };

    const { metrics } = buildDividendGoalViewModel({
      summary,
      goals: {
        cashflowGoals: [
          { id: 'annual', goalType: 'annual', target: 3600, currency: 'TWD' }
        ]
      },
      messages,
      formatCurrency: value => Number(value).toFixed(0)
    });

    const achievementMetric = metrics.find(metric => metric.id === 'achievement');
    expect(achievementMetric.value).toBe('100%');
    expect(achievementMetric.highlight).toBe(true);
    expect(achievementMetric.showCelebration).toBe(true);
  });
});
