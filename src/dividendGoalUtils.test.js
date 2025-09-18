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
    const dividendEvents = [
      { stock_id: '0050', dividend_date: '2024-01-10', dividend: '1' },
      { stock_id: '0050', dividend_date: '2024-06-10', dividend: '0.8' },
      { stock_id: '00878', dividend_date: '2024-03-15', dividend: '0.5' },
      { stock_id: '0050', dividend_date: '2023-12-10', dividend: '0.6' }
    ];

    const summary = calculateDividendSummary({
      inventoryList,
      dividendEvents,
      asOfDate: new Date('2024-07-01')
    });

    expect(summary).toEqual({
      yearToDateTotal: 1000 * 1 + 1000 * 0.8 + 500 * 0.5,
      annualTotal: 1000 * 1 + 1000 * 0.8 + 500 * 0.5,
      annualYear: 2024,
      monthlyAverage: (1000 * 1 + 1000 * 0.8 + 500 * 0.5) / 12
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
      goalDividendMonthly: '每月股息：',
      goalDividendYtdLabel: '累積股息',
      goalDividendAnnualLabel: '年度股息',
      goalDividendMonthlyLabel: '每月股息',
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
      { id: 'monthly', label: '每月股息', value: '200' },
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
});
