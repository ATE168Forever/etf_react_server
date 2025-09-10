/* eslint-env jest */
import { render, screen } from '@testing-library/react';
import UserDividendsTab from './UserDividendsTab';
import { readTransactionHistory } from './transactionStorage';

jest.mock('./transactionStorage');
jest.mock('./components/DividendCalendar', () => () => null);

test('displays stock id and dynamic name from dividend data', async () => {
  readTransactionHistory.mockReturnValue([
    { stock_id: '0050', date: '2024-01-01', quantity: 1000, type: 'buy' }
  ]);

  const allDividendData = [
    { stock_id: '0050', stock_name: 'Test ETF' }
  ];

  render(<UserDividendsTab allDividendData={allDividendData} selectedYear={2024} />);
  expect(await screen.findByText('0050 Test ETF')).toBeInTheDocument();
});
