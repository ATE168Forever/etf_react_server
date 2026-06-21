import { transactionsToCsv, transactionsFromCsv } from '../src/utils/csvUtils';

describe('csvUtils round-trip', () => {
  const base = [
    { stock_id: '0056', stock_name: '元大高股息', date: '2024-01-15', quantity: 100, price: 30.5, type: 'buy' },
    { stock_id: 'JEPI', stock_name: 'Example ETF, Inc.', date: '2024-02-10', quantity: 50, price: 55.0, type: 'buy' },
    { stock_id: 'TEST', stock_name: 'ETF "Quoted" Name', date: '2024-03-01', quantity: 10, price: 100.0, type: 'sell' },
  ];

  test('round-trip preserves stock_name with comma', () => {
    const csv = transactionsToCsv(base);
    const parsed = transactionsFromCsv(csv);
    expect(parsed[1].stock_name).toBe('Example ETF, Inc.');
  });

  test('round-trip preserves stock_name with double quote', () => {
    const csv = transactionsToCsv(base);
    const parsed = transactionsFromCsv(csv);
    expect(parsed[2].stock_name).toBe('ETF "Quoted" Name');
  });

  test('round-trip preserves all fields', () => {
    const csv = transactionsToCsv(base);
    const parsed = transactionsFromCsv(csv);
    expect(parsed).toHaveLength(3);
    expect(parsed[0].stock_id).toBe('0056');
    expect(parsed[0].quantity).toBe(100);
    expect(parsed[0].price).toBe(30.5);
    expect(parsed[0].type).toBe('buy');
  });

  test('stock_name with leading = is preserved as-is', () => {
    const dangerous = [
      { stock_id: '0001', stock_name: '=SUM(1+1)', date: '2024-01-01', quantity: 1, price: 10, type: 'buy' },
    ];
    const csv = transactionsToCsv(dangerous);
    const parsed = transactionsFromCsv(csv);
    expect(parsed[0].stock_name).toBe('=SUM(1+1)');
  });

  test('handles BOM in input', () => {
    const csv = transactionsToCsv(base);
    const parsed = transactionsFromCsv(csv);
    expect(parsed).toHaveLength(3);
  });
});
