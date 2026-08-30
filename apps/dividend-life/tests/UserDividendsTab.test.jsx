/* eslint-env jest */
import { render, screen, fireEvent, within } from '@testing-library/react';
import UserDividendsTab from '../src/UserDividendsTab';
import { readTransactionHistory } from '../src/utils/transactionStorage';

jest.mock('../src/utils/transactionStorage');
jest.mock('../config', () => ({ API_HOST: '' }));
jest.mock('../src/stockApi', () => ({ fetchStockList: jest.fn(() => Promise.resolve({ list: [], meta: null })) }));
jest.mock('../src/hooks/useStorageListener', () => jest.fn());

test('displays stock id and dynamic name from dividend data', async () => {
  readTransactionHistory.mockReturnValue([
    { stock_id: '0050', date: '2024-01-01', quantity: 1000, type: 'buy' }
  ]);

  const allDividendData = [
    {
      stock_id: '0050',
      stock_name: 'Test ETF',
      dividend: '1',
      dividend_date: '2024-03-15',
      payment_date: '2024-04-15',
      dividend_yield: '5',
      last_close_price: '100',
      currency: 'TWD'
    }
  ];

  render(<UserDividendsTab allDividendData={allDividendData} selectedYear={2024} />);
  const elements = await screen.findAllByText('0050');
  expect(elements.length).toBeGreaterThan(0);
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
  const bothBtn = screen.getByRole('button', { name: '全部' });
  expect(bothBtn).toHaveClass('filter-bar__pill--active');
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
  const year = new Date().getFullYear();
  readTransactionHistory.mockReturnValue([
    { stock_id: '0056', date: `${year}-01-01`, quantity: 1000, type: 'buy' },
    { stock_id: '0056', date: `${year}-08-01`, quantity: 1000, type: 'sell' }
  ]);

  const data = [
    {
      stock_id: '0056',
      stock_name: '高股息ETF',
      dividend: '1.5',
      dividend_date: `${year}-03-15`,
      payment_date: `${year}-04-15`,
      dividend_yield: '5',
      last_close_price: '30'
    }
  ];

  render(<UserDividendsTab allDividendData={data} />);

  const elements = await screen.findAllByText('0056');
  expect(elements.length).toBeGreaterThan(0);
  expect(screen.queryByText('尚無庫存，請先新增交易紀錄')).not.toBeInTheDocument();
});

test('allows switching between TWD and USD dividend summaries', async () => {
  const year = new Date().getFullYear();
  readTransactionHistory.mockReturnValue([
    { stock_id: '0050', date: `${year}-01-01`, quantity: 1000, type: 'buy' },
    { stock_id: 'VUSD', date: `${year}-01-01`, quantity: 200, type: 'buy' }
  ]);

  const data = [
    {
      stock_id: '0050',
      stock_name: '台股ETF',
      dividend: '1',
      dividend_date: `${year}-09-15`,
      payment_date: `${year}-09-25`,
      currency: 'TWD'
    },
    {
      stock_id: 'VUSD',
      stock_name: 'Vanguard USD',
      dividend: '0.5',
      dividend_date: `${year}-10-10`,
      payment_date: `${year}-10-20`,
      currency: 'USD'
    }
  ];

  render(<UserDividendsTab allDividendData={data} />);

  const dividendTable = await screen.findByRole('table', { name: '我的配息月份表' });

  const toTwdButtonInitial = screen.getByRole('button', { name: /^(台股|NT\$|NT dividends)$/i });
  fireEvent.click(toTwdButtonInitial);

  expect(within(dividendTable).getAllByText('0050').length).toBeGreaterThan(0);
  expect(within(dividendTable).queryByText('VUSD')).not.toBeInTheDocument();

  const toUsdButton = screen.getByRole('button', { name: /^(美股|US\$|US dividends)$/i });
  fireEvent.click(toUsdButton);

  expect(within(dividendTable).getAllByText('VUSD').length).toBeGreaterThan(0);
  expect(within(dividendTable).queryByText('0050')).not.toBeInTheDocument();

  const toTwdButton = screen.getByRole('button', { name: /^(台股|NT\$|NT dividends)$/i });
  fireEvent.click(toTwdButton);

  expect(within(dividendTable).getAllByText('0050').length).toBeGreaterThan(0);
  expect(within(dividendTable).queryByText('VUSD')).not.toBeInTheDocument();
});

test('donut detail shows 0% yield instead of Infinity/NaN when cost data is missing', async () => {
  const year = new Date().getFullYear();
  // No `price` on the buy entry: getAverageCostBeforeDate resolves to 0,
  // so investment is 0 while dividend total is > 0 — a real reachable
  // data-quality gap (e.g. an imported/manual holding without cost basis).
  readTransactionHistory.mockReturnValue([
    { stock_id: '0050', date: `${year}-01-01`, quantity: 1000, type: 'buy' }
  ]);

  const data = [
    {
      stock_id: '0050',
      stock_name: 'Test ETF',
      dividend: '1',
      dividend_date: `${year}-03-15`,
      payment_date: `${year}-04-15`,
      last_close_price: '100'
    }
  ];

  render(<UserDividendsTab allDividendData={data} selectedYear={year} />);

  const donutList = await screen.findByRole('list', { name: '配息貢獻佔比' });
  const segmentButton = within(donutList).getByRole('button', { name: /0050/ });
  fireEvent.click(segmentButton);

  const yieldText = await screen.findByText(/殖利率：/);
  expect(yieldText.textContent).toBe('殖利率：0%');
});

test('single-entry calendar cell tooltip shows localized unavailable text, never "undefined" or a bare 0', async () => {
  const year = new Date().getFullYear();
  // Missing (not zero) price/yield, matching what the API returns when it
  // omits last_close_price / dividend_yield for a given dividend record.
  readTransactionHistory.mockReturnValue([
    { stock_id: 'MISS', date: `${year}-01-01`, quantity: 1000, type: 'buy' }
  ]);

  const data = [
    {
      stock_id: 'MISS',
      stock_name: 'Missing Data ETF',
      dividend: '5',
      dividend_date: `${year}-03-10`,
      payment_date: `${year}-04-10`,
      dividend_yield: null,
      last_close_price: null,
      currency: 'TWD'
    }
  ];

  const { container } = render(<UserDividendsTab allDividendData={data} selectedYear={year} />);

  await screen.findAllByText('MISS');

  // Several cells in this table share the `.tooltip-dotted` class (cost
  // row, monthly total, per-stock/per-month cell); the per-month cell is
  // the only one whose tooltip includes the close-price label, so use that
  // to disambiguate.
  const tooltipTriggers = Array.from(container.querySelectorAll('.tooltip-dotted'));
  const cellTrigger = tooltipTriggers.find(el => (el.title || '').includes('除息前一天收盤價'));
  expect(cellTrigger).toBeTruthy();

  expect(cellTrigger.title).not.toMatch(/undefined/);
  expect(cellTrigger.title).toMatch(/資料不足/); // close price
  expect(cellTrigger.title).toMatch(/無法計算/); // yield
  expect(cellTrigger.title).not.toMatch(/當次殖利率: 0(?!\d)/); // never a bare "0"
});
