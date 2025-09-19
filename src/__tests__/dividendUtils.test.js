import { getTomorrowDividendAlerts } from '../dividendUtils';

describe('getTomorrowDividendAlerts', () => {
  test('detects ex-dividend and payment events for tomorrow', () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().slice(0, 10);
    const data = [
      { stock_id: '0056', stock_name: 'ETF A', dividend_date: tomorrowStr, payment_date: null, dividend: '1.5' },
      { stock_id: '0050', stock_name: 'ETF B', dividend_date: null, payment_date: tomorrowStr, dividend: '0.8' }
    ];
    const history = [
      { stock_id: '0056', date: '2023-01-01', type: 'buy', quantity: 1000 },
      { stock_id: '0050', date: '2023-01-01', type: 'buy', quantity: 2000 }
    ];
    const alerts = getTomorrowDividendAlerts(data, history);
    expect(alerts).toHaveLength(2);
    const exAlert = alerts.find(a => a.stock_id === '0056');
    expect(exAlert.type).toBe('ex');
    expect(exAlert.total).toBeCloseTo(1500);
    const payAlert = alerts.find(a => a.stock_id === '0050');
    expect(payAlert.type).toBe('pay');
    expect(payAlert.total).toBeCloseTo(1600);
  });
});
