/* eslint-env jest */
import { render, screen } from '@testing-library/react';
import UserDividendsTab from '../src/UserDividendsTab';
import { readTransactionHistory } from '../src/utils/transactionStorage';

jest.mock('../src/utils/transactionStorage');
jest.mock('../src/config', () => ({ API_HOST: '' }));

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

test('calendar defaults to showing both ex and payment events', async () => {
  const nowStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Taipei' });
  const [year, month] = nowStr.split('-');
  readTransactionHistory.mockReturnValue([
    { stock_id: '0050', date: `${year}-01-01`, quantity: 1000, type: 'buy' }
  ]);
  const data = [
    {
      stock_id: '0050',
      stock_name: '0050',
      dividend: '1',
      dividend_date: `${year}-${month}-05`,
      payment_date: `${year}-${month}-15`,
      dividend_yield: '1',
      last_close_price: '10',
      market: 'TW'
    }
  ];

  render(<UserDividendsTab allDividendData={data} selectedYear={Number(year)} />);

  await screen.findByRole('button', { name: '除息/發放日' });
  expect(document.body.textContent).toContain('NT$');
  const bothBtn = screen.getByRole('button', { name: '除息/發放日' });
  expect(bothBtn).toHaveClass('btn-selected');
});

test('payment totals fall back to payment date holdings when ex-date missing', async () => {
  const nowStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Taipei' });
  const [year, month] = nowStr.split('-');
  readTransactionHistory.mockReturnValue([
    { stock_id: '0056', date: `${year}-01-10`, quantity: 1000, type: 'buy' }
  ]);

  const data = [
    {
      stock_id: '0056',
      stock_name: '高股息ETF',
      dividend: '2.5',
      dividend_date: null,
      payment_date: `${year}-${month}-18`,
      dividend_yield: '3',
      last_close_price: '40',
      market: 'TW'
    }
  ];

  render(<UserDividendsTab allDividendData={data} selectedYear={Number(year)} />);

  await screen.findByRole('button', { name: '除息/發放日' });
  expect(document.body.textContent).toContain('NT$');
});

test('shows dividends for stocks sold before year end', async () => {
  readTransactionHistory.mockReturnValue([
    { stock_id: '0056', date: '2024-01-01', quantity: 1000, type: 'buy' },
    { stock_id: '0056', date: '2024-08-01', quantity: 1000, type: 'sell' }
  ]);

  const data = [
    {
      stock_id: '0056',
      stock_name: '高股息ETF',
      dividend: '1.5',
      dividend_date: '2024-03-15',
      payment_date: '2024-04-15',
      dividend_yield: '5',
      last_close_price: '30'
    }
  ];

  render(<UserDividendsTab allDividendData={data} selectedYear={2024} />);

  expect(await screen.findByText('0056 高股息ETF')).toBeInTheDocument();
  expect(screen.queryByText('尚無庫存，請先新增交易紀錄')).not.toBeInTheDocument();
});

test('shows US currency when viewing US dividends', async () => {
  readTransactionHistory.mockReturnValue([
    { stock_id: 'VTI', date: '2024-01-01', quantity: 10, type: 'buy' }
  ]);

  const data = [
    {
      stock_id: 'VTI',
      stock_name: 'VTI',
      dividend: '2',
      dividend_date: '2024-03-05',
      payment_date: '2024-03-15',
      dividend_yield: '2',
      last_close_price: '200',
      market: 'US'
    }
  ];

  render(<UserDividendsTab allDividendData={data} selectedYear={2024} />);

  const usButton = await screen.findByRole('button', { name: '美股' });
  expect(usButton).toHaveClass('btn-selected');
  expect(document.body.textContent).toContain('US$');
});
