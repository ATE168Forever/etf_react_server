/* eslint-env jest */
import { render, screen, fireEvent } from '@testing-library/react';
import UserDividendsTab from '../src/UserDividendsTab';
import { readTransactionHistory } from '../src/utils/transactionStorage';

jest.mock('../src/utils/transactionStorage');
jest.mock('../src/config', () => ({ API_HOST: '' }));
jest.mock('../src/api', () => ({ fetchWithCache: jest.fn(() => Promise.resolve({ data: [] })) }));

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
    { stock_id: 'AAA', date: `${year}-01-01`, quantity: 1000, type: 'buy' }
  ]);
  const data = [
    {
      stock_id: 'AAA',
      stock_name: 'AAA',
      dividend: '1',
      dividend_date: `${year}-${month}-05`,
      payment_date: `${year}-${month}-15`,
      dividend_yield: '1',
      last_close_price: '10'
    }
  ];

  render(<UserDividendsTab allDividendData={data} selectedYear={Number(year)} />);

  const exTotals = await screen.findAllByText(/除息金額/);
  expect(exTotals.some(element => /1,000/.test(element.textContent || ''))).toBe(true);
  const payTotals = await screen.findAllByText(/發放金額/);
  expect(payTotals.some(element => /1,000/.test(element.textContent || ''))).toBe(true);
  const bothBtn = screen.getByRole('button', { name: '除息/發放日' });
  expect(bothBtn).toHaveClass('btn-selected');
});

test('payment totals fall back to payment date holdings when ex-date missing', async () => {
  const nowStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Taipei' });
  const [year, month] = nowStr.split('-');
  readTransactionHistory.mockReturnValue([
    { stock_id: 'BBB', date: `${year}-01-10`, quantity: 1000, type: 'buy' }
  ]);

  const data = [
    {
      stock_id: 'BBB',
      stock_name: 'BBB ETF',
      dividend: '2.5',
      dividend_date: null,
      payment_date: `${year}-${month}-18`,
      dividend_yield: '3',
      last_close_price: '40'
    }
  ];

  render(<UserDividendsTab allDividendData={data} selectedYear={Number(year)} />);

  const payOnlyTotals = await screen.findAllByText(/發放金額/);
  expect(payOnlyTotals.some(element => /2,500/.test(element.textContent || ''))).toBe(true);
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

test('allows switching between TWD and USD dividend summaries', async () => {
  readTransactionHistory.mockReturnValue([
    { stock_id: '0050', date: '2024-01-01', quantity: 1000, type: 'buy' },
    { stock_id: 'VUSD', date: '2024-01-01', quantity: 200, type: 'buy' }
  ]);

  const data = [
    {
      stock_id: '0050',
      stock_name: '台股ETF',
      dividend: '1',
      dividend_date: '2024-03-15',
      payment_date: '2024-04-15',
      currency: 'TWD'
    },
    {
      stock_id: 'VUSD',
      stock_name: 'Vanguard USD',
      dividend: '0.5',
      dividend_date: '2024-05-10',
      payment_date: '2024-05-20',
      currency: 'USD'
    }
  ];

  render(<UserDividendsTab allDividendData={data} selectedYear={2024} />);

  const twdRow = await screen.findByText('0050 台股ETF');
  expect(twdRow.closest('tr')).toHaveTextContent('1,000');
  expect(screen.queryByText('VUSD Vanguard USD')).not.toBeInTheDocument();

  const toUsdButton = await screen.findByRole('button', { name: /^(美股|US\$|US dividends)$/i });
  fireEvent.click(toUsdButton);

  const usdRow = await screen.findByText('VUSD Vanguard USD');
  expect(usdRow.closest('tr')).toHaveTextContent('100');
  expect(screen.queryByText('0050 台股ETF')).not.toBeInTheDocument();

  const toTwdButton = await screen.findByRole('button', { name: /^(台股|NT\$|NT dividends)$/i });
  fireEvent.click(toTwdButton);

  const twdRowAgain = await screen.findByText('0050 台股ETF');
  expect(twdRowAgain.closest('tr')).toHaveTextContent('1,000');
  expect(screen.queryByText('VUSD Vanguard USD')).not.toBeInTheDocument();
});
