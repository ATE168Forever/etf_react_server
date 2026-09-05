/* eslint-env jest */
import { render, screen, fireEvent } from '@testing-library/react';
import UserDividendsTab from '../src/UserDividendsTab';
import { readTransactionHistory } from '../src/utils/transactionStorage';

jest.mock('../src/utils/transactionStorage');
jest.mock('../config', () => ({ API_HOST: '' }));

test('UserDividendsTab remembers calendar visibility', async () => {
  localStorage.clear();
  const year = new Date().getFullYear();
  // Calendar UI (and its show/hide toggle) is only reachable once the user
  // has at least one holding — with none, the tab renders the cashflow
  // empty state instead (see State A/B gating in UserDividendsTab).
  readTransactionHistory.mockReturnValue([
    { stock_id: '0050', date: `${year}-01-01`, quantity: 1000, type: 'buy' }
  ]);
  const allDividendData = [];
  const { unmount } = render(<UserDividendsTab allDividendData={allDividendData} />);
  const hideBtn = await screen.findByRole('button', { name: /隱藏月曆/ });
  fireEvent.click(hideBtn);
  unmount();
  render(<UserDividendsTab allDividendData={allDividendData} />);
  const showBtn = await screen.findByRole('button', { name: /顯示月曆/ });
  expect(showBtn).toBeInTheDocument();
});
