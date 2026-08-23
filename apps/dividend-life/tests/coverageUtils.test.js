import { calculateCoverage } from '../src/utils/coverageUtils';

const asOfDate = new Date('2026-08-15T00:00:00');

describe('calculateCoverage', () => {
  test('splits this-month TWD dividends into received vs pending by payment_date', () => {
    const dividendData = [
      { stock_id: '0056', dividend: 1, dividend_date: '2026-08-05', payment_date: '2026-08-10', currency: 'TWD' },
      { stock_id: '0050', dividend: 2, dividend_date: '2026-08-06', payment_date: '2026-08-25', currency: 'TWD' }
    ];
    const inventoryList = [
      { stock_id: '0056', total_quantity: 1000 },
      { stock_id: '0050', total_quantity: 500 }
    ];
    const result = calculateCoverage({ dividendData, inventoryList, monthlyLivingCost: 0, asOfDate });
    expect(result.twScheduled).toBe(1000 + 1000);
    expect(result.twReceived).toBe(1000);
    expect(result.twPending).toBe(1000);
  });

  test('tracks USD amounts separately and flags hasUsAmount without adding to coverage', () => {
    const dividendData = [
      { stock_id: 'VOO', dividend: 1.5, dividend_date: '2026-08-05', payment_date: '2026-08-10', currency: 'USD' }
    ];
    const inventoryList = [{ stock_id: 'VOO', total_quantity: 10 }];
    const result = calculateCoverage({ dividendData, inventoryList, monthlyLivingCost: 0, asOfDate });
    expect(result.usScheduled).toBeCloseTo(15);
    expect(result.hasUsAmount).toBe(true);
    expect(result.twScheduled).toBe(0);
  });

  test('ignores events for stocks not currently held', () => {
    const dividendData = [
      { stock_id: '0056', dividend: 1, dividend_date: '2026-08-05', payment_date: '2026-08-10', currency: 'TWD' }
    ];
    const result = calculateCoverage({ dividendData, inventoryList: [], monthlyLivingCost: 0, asOfDate });
    expect(result.twScheduled).toBe(0);
  });

  test('ignores events outside the current month', () => {
    const dividendData = [
      { stock_id: '0056', dividend: 1, dividend_date: '2026-07-05', payment_date: '2026-07-10', currency: 'TWD' }
    ];
    const inventoryList = [{ stock_id: '0056', total_quantity: 1000 }];
    const result = calculateCoverage({ dividendData, inventoryList, monthlyLivingCost: 0, asOfDate });
    expect(result.twScheduled).toBe(0);
  });

  test('returns null coveragePercent and isLivingCostSet=false when living cost is 0', () => {
    const result = calculateCoverage({ dividendData: [], inventoryList: [], monthlyLivingCost: 0, asOfDate });
    expect(result.isLivingCostSet).toBe(false);
    expect(result.coveragePercent).toBeNull();
  });

  test('computes rounded coveragePercent when living cost is set, allowing over 100', () => {
    const dividendData = [
      { stock_id: '0056', dividend: 2, dividend_date: '2026-08-05', payment_date: '2026-08-10', currency: 'TWD' }
    ];
    const inventoryList = [{ stock_id: '0056', total_quantity: 1000 }];
    const result = calculateCoverage({ dividendData, inventoryList, monthlyLivingCost: 1000, asOfDate });
    expect(result.isLivingCostSet).toBe(true);
    expect(result.coveragePercent).toBe(200);
  });
});
