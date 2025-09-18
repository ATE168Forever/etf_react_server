/* eslint-env jest */
import {
  calculateDividendSummary,
  buildDividendGoalViewModel
} from './dividendGoalUtils';

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
      yearToDateTotal: 1000 * 1 + 1000 * 0.8 + 500 * 0.5,
      annualTotal: 1000 * 1 + 1000 * 0.8 + 500 * 0.5,
      annualYear: 2024,
      monthlyAverage: (1000 * 1 + 1000 * 0.8 + 500 * 0.5) / 12
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
      yearToDateTotal: 1000,
      annualTotal: 1000,
      annualYear: 2024,
      monthlyAverage: 1000 / 12
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
      yearToDateTotal: 200,
      annualTotal: 200,
      annualYear: 2024,
      monthlyAverage: 200 / 12
    });
  });

  test('builds goal view model with metrics and rows', () => {
    const summary = {
      yearToDateTotal: 1800,
      annualTotal: 2400,
      annualYear: 2024,
      monthlyAverage: 200
    };
    const goals = { totalTarget: 3600, monthlyTarget: 250 };
    const messages = {
      annualGoal: '年度目標',
      monthlyGoal: '每月目標',
      goalDividendAccumulated: '累積股息：',
      goalDividendMonthly: '每月平均股息：',
      goalDividendYtdLabel: '累積股息',
      goalDividendAnnualLabel: '年度股息',
      goalDividendMonthlyLabel: '每月平均股息',
      goalAchievementLabel: '達成率',
      goalTargetAnnual: '年度目標：',
      goalTargetMonthly: '每月目標：',
      goalPercentPlaceholder: '--',
      goalAnnualHalf: '年度過半',
      goalAnnualDone: '年度完成',
      goalMonthlyHalf: '月過半',
      goalMonthlyDone: '月完成',
      goalEmpty: ''
    };

    const formatCurrency = value => Number(value).toFixed(0);
    const { metrics, rows } = buildDividendGoalViewModel({
      summary,
      goals,
      messages,
      formatCurrency
    });

    expect(metrics).toEqual([
      { id: 'ytd', label: '累積股息', value: '1800' },
      { id: 'annual', label: '年度股息 (2024)', value: '2400' },
      { id: 'monthly', label: '每月平均股息', value: '200' },
      { id: 'achievement', label: '達成率', value: '50%' }
    ]);
    expect(rows[0]).toMatchObject({
      id: 'annual',
      percentLabel: '50%',
      encouragement: '年度過半'
    });
    expect(rows[1]).toMatchObject({
      id: 'monthly',
      percentLabel: '80%',
      encouragement: '月過半'
    });
  });

  test('omits goal rows when targets are not provided', () => {
    const summary = {
      yearToDateTotal: 900,
      annualTotal: 1500,
      annualYear: 2023,
      monthlyAverage: 120
    };
    const messages = {
      annualGoal: '年度目標',
      monthlyGoal: '每月目標',
      goalDividendAccumulated: '累積股息：',
      goalDividendMonthly: '每月平均股息：',
      goalDividendYtdLabel: '累積股息',
      goalDividendAnnualLabel: '年度股息',
      goalDividendMonthlyLabel: '每月平均股息',
      goalAchievementLabel: '達成率',
      goalTargetAnnual: '年度目標：',
      goalTargetMonthly: '每月目標：',
      goalPercentPlaceholder: '--',
      goalAnnualHalf: '年度過半',
      goalAnnualDone: '年度完成',
      goalMonthlyHalf: '月過半',
      goalMonthlyDone: '月完成',
      goalEmpty: '請新增目標'
    };

    const { rows, emptyState } = buildDividendGoalViewModel({
      summary,
      goals: { totalTarget: 0, monthlyTarget: 300 },
      messages,
      formatCurrency: value => Number(value).toFixed(0)
    });

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ id: 'monthly' });
    expect(emptyState).toBe('');

    const noGoals = buildDividendGoalViewModel({
      summary,
      goals: { totalTarget: 0, monthlyTarget: 0 },
      messages,
      formatCurrency: value => Number(value).toFixed(0)
    });

    expect(noGoals.rows).toHaveLength(0);
    expect(noGoals.emptyState).toBe('請新增目標');
  });

  test('uses current year dividends when calculating achievement', () => {
    const summary = {
      yearToDateTotal: 900,
      annualTotal: 1800,
      annualYear: 2023,
      monthlyAverage: 150
    };
    const messages = {
      annualGoal: '年度目標',
      monthlyGoal: '每月目標',
      goalDividendAccumulated: '累積股息：',
      goalDividendMonthly: '每月平均股息：',
      goalDividendYtdLabel: '累積股息',
      goalDividendAnnualLabel: '年度股息',
      goalDividendMonthlyLabel: '每月平均股息',
      goalAchievementLabel: '達成率',
      goalTargetAnnual: '年度目標：',
      goalTargetMonthly: '每月目標：',
      goalPercentPlaceholder: '--',
      goalAnnualHalf: '年度過半',
      goalAnnualDone: '年度完成',
      goalMonthlyHalf: '月過半',
      goalMonthlyDone: '月完成',
      goalEmpty: ''
    };

    const { metrics } = buildDividendGoalViewModel({
      summary,
      goals: { totalTarget: 1800, monthlyTarget: 0 },
      messages,
      formatCurrency: value => Number(value).toFixed(0)
    });

    const achievementMetric = metrics.find(metric => metric.id === 'achievement');
    expect(achievementMetric.value).toBe('50%');
  });
});
