/* eslint-env jest */
import Cookies from 'js-cookie';
import { migrateTransactionHistory } from './transactionStorage';

describe('transaction storage migration', () => {
  beforeEach(() => {
    localStorage.clear();
    Cookies.remove('my_transaction_history');
  });

  test('moves data from cookie to localStorage', () => {
    const sample = [{ stock_id: 'AAA', date: '2024-01-01', quantity: 1000, type: 'buy', price: 10 }];
    Cookies.set('my_transaction_history', JSON.stringify(sample));
    const result = migrateTransactionHistory();
    expect(result).toEqual(sample);
    expect(JSON.parse(localStorage.getItem('my_transaction_history'))).toEqual(sample);
    expect(Cookies.get('my_transaction_history')).toBeUndefined();
  });
});
