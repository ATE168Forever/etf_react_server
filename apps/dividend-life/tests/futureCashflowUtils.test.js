import { calculateFutureCashflow } from '../src/utils/futureCashflowUtils';

const asOfDate = new Date('2026-08-15T00:00:00');

describe('calculateFutureCashflow', () => {
  test('buckets future announced TWD events by month, starting with the current month', () => {
    const dividendData = [
      { stock_id: '0056', dividend: 1, payment_date: '2026-09-05', currency: 'TWD' },
      { stock_id: '0056', dividend: 1, payment_date: '2026-11-10', currency: 'TWD' }
    ];
    const inventoryList = [{ stock_id: '0056', total_quantity: 1000 }];
    const result = calculateFutureCashflow({
      dividendData, inventoryList, baseCurrency: 'TWD', monthlyLivingCost: 0, monthsAhead: 6, asOfDate
    });
    expect(result.months).toHaveLength(6);
    expect(result.months[0]).toMatchObject({ year: 2026, month: 7, amount: 0, hasAnnouncedData: false }); // Aug (0-indexed)
    expect(result.months[1]).toMatchObject({ year: 2026, month: 8, amount: 1000, hasAnnouncedData: true }); // Sep
    expect(result.months[3]).toMatchObject({ year: 2026, month: 10, amount: 1000, hasAnnouncedData: true }); // Nov
  });

  test('ignores events already paid on or before asOfDate', () => {
    const dividendData = [{ stock_id: '0056', dividend: 1, payment_date: '2026-08-15', currency: 'TWD' }];
    const inventoryList = [{ stock_id: '0056', total_quantity: 1000 }];
    const result = calculateFutureCashflow({ dividendData, inventoryList, baseCurrency: 'TWD', asOfDate });
    expect(result.months.every(m => m.amount === 0)).toBe(true);
  });

  test('ignores events in a currency other than baseCurrency', () => {
    const dividendData = [{ stock_id: 'VOO', dividend: 1, payment_date: '2026-09-05', currency: 'USD' }];
    const inventoryList = [{ stock_id: 'VOO', total_quantity: 10 }];
    const result = calculateFutureCashflow({ dividendData, inventoryList, baseCurrency: 'TWD', asOfDate });
    expect(result.months.every(m => m.amount === 0 && !m.hasAnnouncedData)).toBe(true);
  });

  test('flags isBelowLivingCost only for months with announced data below the target', () => {
    const dividendData = [{ stock_id: '0056', dividend: 1, payment_date: '2026-09-05', currency: 'TWD' }];
    const inventoryList = [{ stock_id: '0056', total_quantity: 1000 }];
    const result = calculateFutureCashflow({
      dividendData, inventoryList, baseCurrency: 'TWD', monthlyLivingCost: 5000, asOfDate
    });
    const sept = result.months[1];
    expect(sept.amount).toBe(1000);
    expect(sept.isBelowLivingCost).toBe(true);
    const aug = result.months[0];
    expect(aug.hasAnnouncedData).toBe(false);
    expect(aug.isBelowLivingCost).toBe(false);
  });

  test('respects a custom monthsAhead length', () => {
    const result = calculateFutureCashflow({ dividendData: [], inventoryList: [], monthsAhead: 12, asOfDate });
    expect(result.months).toHaveLength(12);
  });
});
