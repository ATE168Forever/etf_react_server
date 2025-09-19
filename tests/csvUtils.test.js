/* eslint-env jest */
import { encodeCsvCode, decodeCsvCode } from '../src/utils/csvUtils';
import { transactionsToCsv, transactionsFromCsv } from '../src/utils/csvUtils';

test('encodeCsvCode wraps code with formula to preserve leading zeros', () => {
  expect(encodeCsvCode('00878')).toBe('="00878"');
});

test('decodeCsvCode removes wrapper and returns original code', () => {
  expect(decodeCsvCode('="00878"')).toBe('00878');
  expect(decodeCsvCode('00878')).toBe('00878');
});

test('transactionsToCsv and transactionsFromCsv round-trip transactions', () => {
  const list = [
    { stock_id: '0050', stock_name: 'ETF A', date: '2024-01-01', quantity: 1000, price: 10, type: 'buy' },
    { stock_id: '0056', stock_name: 'ETF B', date: '2024-02-01', quantity: 500, price: '', type: 'sell' }
  ];
  const csv = transactionsToCsv(list);
  const parsed = transactionsFromCsv(csv);
  expect(parsed).toEqual([
    { stock_id: '0050', stock_name: 'ETF A', date: '2024-01-01', quantity: 1000, price: 10, type: 'buy' },
    { stock_id: '0056', stock_name: 'ETF B', date: '2024-02-01', quantity: 500, price: '', type: 'sell' }
  ]);
});
