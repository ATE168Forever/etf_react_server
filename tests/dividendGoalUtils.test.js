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
      { stock_id: '0050', dividend_date: '2024-01-10', dividend: '1' },
      { stock_id: '0050', dividend_date: '2024-06-10', dividend: '0.8' },
      { stock_id: '00878', dividend_date: '2024-03-15', dividend: '0.5' },
      { stock_id: '0050', dividend_date: '2023-12-10', dividend: '0.6' }
    ];

    const summary = calculateDividendSummary({
      inventoryList,
      dividendEvents,
      transactionHistory,
      asOfDate: new Date('2024-07-01')
    });

    expect(summary).toEqual({
      accumulatedTotal: 1000 * 1 + 1000 * 0.8 + 500 * 0.5,
      annualTotal: 1000 * 1 + 1000 * 0.8 + 500 * 0.5,
      annualYear: 2024,
      monthlyAverage: (1000 * 1 + 1000 * 0.8 + 500 * 0.5) / 6,
      monthlyMinimum: 0
    });
  });

  test('uses transaction history quantity at dividend date', () => {
    const transactionHistory = [
      { stock_id: '0050', date: '2023-12-01', quantity: 1000, type: 'buy' },
      { stock_id: '0050', date: '2024-02-01', quantity: 1000, type: 'sell' }
    ];
    const dividendEvents = [
      { stock_id: '0050', dividend_date: '2024-01-10', dividend: '1' },
      { stock_id: '0050', dividend_date: '2024-03-10', dividend: '1' }
    ];

    const summary = calculateDividendSummary({
      inventoryList: [],
      dividendEvents,
      transactionHistory,
      asOfDate: new Date('2024-04-01')
    });

    expect(summary).toEqual({
      accumulatedTotal: 1000,
      annualTotal: 1000,
      annualYear: 2024,
      monthlyAverage: 1000,
      monthlyMinimum: 0
    });
  });

  test('falls back to inventory totals when history is unavailable', () => {
    const inventoryList = [
      { stock_id: '0050', total_quantity: 100 }
    ];
    const dividendEvents = [
      { stock_id: '0050', dividend_date: '2024-01-10', dividend: '2' }
    ];

    const summary = calculateDividendSummary({
      inventoryList,
      dividendEvents,
      transactionHistory: null,
      asOfDate: new Date('2024-02-01')
    });

    expect(summary).toEqual({
      accumulatedTotal: 200,
      annualTotal: 200,
      annualYear: 2024,
      monthlyAverage: 200,
      monthlyMinimum: 0
    });
  });

  test('builds goal view model with metrics and rows', () => {
    const summary = {
      accumulatedTotal: 1800,
      annualTotal: 2400,
      annualYear: 2024,
      monthlyAverage: 200,
      monthlyMinimum: 120
    };
    const goals = { totalTarget: 3600, monthlyTarget: 250, minimumTarget: 100, goalType: 'annual' };
    const messages = {
      annualGoal: '年度目標',
      monthlyGoal: '每月目標',
      minimumGoal: '最低目標',
      goalDividendAccumulated: '累積股息：',
      goalDividendMonthly: '每月平均股息：',
      goalDividendMinimum: '每月最低股息：',
      goalDividendYtdLabel: '累積股息',
      goalDividendAnnualLabel: '年度股息',
      goalDividendMonthlyLabel: '每月平均股息',
      goalDividendMinimumLabel: '每月最低股息',
      goalAchievementLabel: '達成率',
      goalTargetAnnual: '年度目標：',
      goalTargetMonthly: '每月目標：',
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
      { id: 'ytd', label: '累積股息', value: '1800' },
      { id: 'annual', label: '年度股息 (2024)', value: '2400' },
      { id: 'monthly', label: '每月平均股息', value: '200' },
      { id: 'minimum', label: '每月最低股息', value: '120' },
      { id: 'achievement', label: '達成率', value: '50%' }
    ]);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      id: 'annual',
      percentLabel: '50%',
      encouragement: '年度過半'
    });
    expect(goalType).toBe('annual');
    expect(achievementPercent).toBeCloseTo(0.5);
  });

  test('builds monthly minimum goal when selected', () => {
    const summary = {
      accumulatedTotal: 900,
      annualTotal: 1500,
      annualYear: 2023,
      monthlyAverage: 120,
      monthlyMinimum: 80
    };
    const messages = {
      annualGoal: '年度目標',
      monthlyGoal: '每月目標',
      minimumGoal: '最低目標',
      goalDividendAccumulated: '累積股息：',
      goalDividendMonthly: '每月平均股息：',
      goalDividendMinimum: '每月最低股息：',
      goalDividendYtdLabel: '累積股息',
      goalDividendAnnualLabel: '年度股息',
      goalDividendMonthlyLabel: '每月平均股息',
      goalDividendMinimumLabel: '每月最低股息',
      goalAchievementLabel: '達成率',
      goalTargetAnnual: '年度目標：',
      goalTargetMonthly: '每月目標：',
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
      goals: { totalTarget: 0, monthlyTarget: 0, minimumTarget: 120, goalType: 'minimum' },
      messages,
      formatCurrency: value => Number(value).toFixed(0)
    });

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ id: 'minimum', percentLabel: '67%' });
    expect(goalType).toBe('minimum');
    expect(emptyState).toBe('');

    const noGoals = buildDividendGoalViewModel({
      summary,
      goals: { totalTarget: 0, monthlyTarget: 0, minimumTarget: 0 },
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
      monthlyMinimum: 90
    };
    const messages = {
      annualGoal: '年度目標',
      monthlyGoal: '每月目標',
      minimumGoal: '最低目標',
      goalDividendAccumulated: '累積股息：',
      goalDividendMonthly: '每月平均股息：',
      goalDividendMinimum: '每月最低股息：',
      goalDividendYtdLabel: '累積股息',
      goalDividendAnnualLabel: '年度股息',
      goalDividendMonthlyLabel: '每月平均股息',
      goalDividendMinimumLabel: '每月最低股息',
      goalAchievementLabel: '達成率',
      goalTargetAnnual: '年度目標：',
      goalTargetMonthly: '每月目標：',
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
      goals: { totalTarget: 1800, monthlyTarget: 0, minimumTarget: 0, goalType: 'annual' },
      messages,
      formatCurrency: value => Number(value).toFixed(0)
    });

    const achievementMetric = metrics.find(metric => metric.id === 'achievement');
    expect(achievementMetric.value).toBe('50%');
  });
});
