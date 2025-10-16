/* eslint-env jest */
import Cookies from 'js-cookie';
import { migrateTransactionHistory } from '../src/utils/transactionStorage';

describe('transaction storage migration', () => {
  beforeEach(() => {
    localStorage.clear();
    Cookies.remove('my_transaction_history');
  });

  test('moves data from cookie to localStorage', () => {
    const sample = [{ stock_id: 'AAA', date: '2024-01-01', quantity: 1000, type: 'buy', price: 10 }];
    Cookies.set('my_transaction_history', JSON.stringify(sample));
    const result = migrateTransactionHistory();
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject(sample[0]);
    expect(result[0].id).toEqual(expect.any(String));
    const stored = JSON.parse(localStorage.getItem('my_transaction_history'));
    expect(stored).toHaveLength(1);
    expect(stored[0]).toMatchObject(sample[0]);
    expect(stored[0].id).toEqual(expect.any(String));
    expect(Cookies.get('my_transaction_history')).toBeUndefined();
  });
});
