/* eslint-env jest */
import { render, screen, fireEvent } from '@testing-library/react';
import UserDividendsTab from '../src/UserDividendsTab';
import { readTransactionHistory } from '../src/utils/transactionStorage';

jest.mock('../src/utils/transactionStorage');
jest.mock('@shared/config', () => ({ API_HOST: '' }));

test('UserDividendsTab remembers calendar visibility', async () => {
  localStorage.clear();
  readTransactionHistory.mockReturnValue([]);
  const allDividendData = [];
  const year = new Date().getFullYear();
  const { unmount } = render(<UserDividendsTab allDividendData={allDividendData} selectedYear={year} />);
  const hideBtn = await screen.findByRole('button', { name: '隱藏月曆' });
  fireEvent.click(hideBtn);
  unmount();
  render(<UserDividendsTab allDividendData={allDividendData} selectedYear={year} />);
  const showBtn = await screen.findByRole('button', { name: '顯示月曆' });
  expect(showBtn).toBeInTheDocument();
});
