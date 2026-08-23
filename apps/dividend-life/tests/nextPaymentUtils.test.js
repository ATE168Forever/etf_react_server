import { getNextAnnouncedPayment } from '../src/utils/nextPaymentUtils';

function daysFromToday(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

describe('getNextAnnouncedPayment', () => {
  test('returns null when there are no announced payment events', () => {
    expect(getNextAnnouncedPayment([], [])).toBeNull();
  });

  test('returns null when the only announced events are ex-dividend, not payment', () => {
    const dividendData = [
      { stock_id: '0056', stock_name: 'ETF A', dividend: 1, dividend_date: daysFromToday(5), payment_date: null }
    ];
    const history = [{ stock_id: '0056', date: '2020-01-01', type: 'buy', quantity: 1000 }];
    expect(getNextAnnouncedPayment(dividendData, history)).toBeNull();
  });

  test('picks the soonest upcoming payment event among multiple holdings', () => {
    const dividendData = [
      { stock_id: '0056', stock_name: 'ETF A', dividend: 1, dividend_date: null, payment_date: daysFromToday(40) },
      { stock_id: '0050', stock_name: 'ETF B', dividend: 2, dividend_date: null, payment_date: daysFromToday(12) }
    ];
    const history = [
      { stock_id: '0056', date: '2020-01-01', type: 'buy', quantity: 1000 },
      { stock_id: '0050', date: '2020-01-01', type: 'buy', quantity: 500 }
    ];
    const result = getNextAnnouncedPayment(dividendData, history);
    expect(result.stock_id).toBe('0050');
    expect(result.type).toBe('pay');
    expect(result.total).toBeCloseTo(1000);
  });

  test('is not limited to a short lookahead window (finds payments months out)', () => {
    const dividendData = [
      { stock_id: '0056', stock_name: 'ETF A', dividend: 1, dividend_date: null, payment_date: daysFromToday(180) }
    ];
    const history = [{ stock_id: '0056', date: '2020-01-01', type: 'buy', quantity: 1000 }];
    const result = getNextAnnouncedPayment(dividendData, history);
    expect(result).not.toBeNull();
    expect(result.stock_id).toBe('0056');
  });
});
