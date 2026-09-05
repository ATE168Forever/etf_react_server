/* eslint-env jest */
import { render, screen, fireEvent, within } from '@testing-library/react';
import UserDividendsTab from '../src/UserDividendsTab';
import { readTransactionHistory } from '../src/utils/transactionStorage';
import EmptyState from '../src/components/EmptyState';

jest.mock('../src/utils/transactionStorage');
jest.mock('../config', () => ({ API_HOST: '' }));
jest.mock('../src/stockApi', () => ({ fetchStockList: jest.fn(() => Promise.resolve({ list: [], meta: null })) }));
jest.mock('../src/hooks/useStorageListener', () => jest.fn());
// Wraps (not replaces) the real EmptyState so existing tests asserting on its
// rendered text still pass, while letting the flash-regression test below inspect
// every render pass EmptyState was invoked on — including one that gets discarded
// by a same-tick re-render before `render()` returns, which a final-DOM-only
// assertion (getByText/queryByText) can't see.
jest.mock('../src/components/EmptyState', () => {
  const actual = jest.requireActual('../src/components/EmptyState').default;
  return { __esModule: true, default: jest.fn((props) => actual(props)) };
});

test('displays stock id and dynamic name from dividend data', async () => {
  const year = new Date().getFullYear();
  readTransactionHistory.mockReturnValue([
    { stock_id: '0050', date: `${year}-01-01`, quantity: 1000, type: 'buy' }
  ]);

  const allDividendData = [
    {
      stock_id: '0050',
      stock_name: 'Test ETF',
      dividend: '1',
      dividend_date: `${year}-03-15`,
      payment_date: `${year}-04-15`,
      dividend_yield: '5',
      last_close_price: '100',
      currency: 'TWD'
    }
  ];

  render(<UserDividendsTab allDividendData={allDividendData} />);
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

test('State A/B: no holdings shows cashflow empty state, no table, no calendar toggle', async () => {
  readTransactionHistory.mockReturnValue([]);
  render(<UserDividendsTab allDividendData={[]} availableYears={[2025]} />);
  expect(await screen.findByText('還沒有配息現金流')).toBeInTheDocument();
  expect(screen.queryByRole('table')).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /隱藏月曆|顯示月曆/ })).not.toBeInTheDocument();
});

test('State C: holdings but no matching dividend rows shows single insufficient-data row, not one row per holding', async () => {
  readTransactionHistory.mockReturnValue([
    { stock_id: '0050', date: '2025-01-01', quantity: 1000, type: 'buy' },
    { stock_id: '0056', date: '2025-01-01', quantity: 1000, type: 'buy' },
  ]);
  render(<UserDividendsTab allDividendData={[]} availableYears={[2025]} />);
  // Disambiguate from the calendar panel's own <table> (month-grid, shown by
  // default alongside the cashflow table) via its accessible name.
  const table = await screen.findByRole('table', { name: '我的配息月份表' });
  const dataRows = within(table).getAllByRole('row').slice(1); // drop header row
  expect(dataRows.length).toBe(1);
  expect(within(table).getByText('尚無庫存，請先新增交易紀錄')).toBeInTheDocument();
});

test('calendar widget event tooltip never coerces missing dividend_yield/last_close_price to 0/null (calendarEvents builder)', async () => {
  const nowStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Taipei' });
  const [year, month] = nowStr.split('-');
  readTransactionHistory.mockReturnValue([
    { stock_id: 'SEMY', date: `${year}-01-01`, quantity: 10, type: 'buy' }
  ]);

  const data = [
    {
      stock_id: 'SEMY',
      stock_name: 'GraniteShares YieldBOOST Semiconductor ETF',
      dividend: '0.18346',
      dividend_date: `${year}-${month}-07`,
      payment_date: `${year}-${month}-14`,
      dividend_yield: null,
      last_close_price: null,
      currency: 'USD'
    }
  ];

  const { container } = render(<UserDividendsTab allDividendData={data} />);

  await screen.findAllByText('SEMY');

  // The calendar widget's per-event tooltip trigger uses the plain
  // "tooltip-text" class (no extra className), unlike the monthly summary
  // table's cells which use "tooltip-dotted" — this disambiguates the two
  // "missing data" tooltips that share the same underlying bug class.
  const eventTrigger = Array.from(container.querySelectorAll('.tooltip-text'))
    .find(el => (el.title || '').includes('除息前一天收盤價'));

  expect(eventTrigger).toBeTruthy();
  expect(eventTrigger.title).not.toMatch(/null/);
  expect(eventTrigger.title).toMatch(/資料不足/); // close price
  expect(eventTrigger.title).toMatch(/無法計算/); // yield
  expect(eventTrigger.title).not.toMatch(/當次殖利率: 0%/); // never a bare "0%"
});

test('Finding 2: a user who fully exited a position in a prior year is not stranded behind the empty state', async () => {
  // Fully bought and sold in 2022 — for the default (current-year) selectedYear,
  // holdingIds is empty and there's no dividend data at all, so allRelevantStockIds
  // (year-scoped) is also empty. Before the fix, the early-return gated on
  // `!hasHoldings` (derived from allRelevantStockIds), which would show the generic
  // empty state here with no way to reach the year picker inside it and see this
  // user's real 2022 history. The fix gates on raw `history.length` instead.
  readTransactionHistory.mockReturnValue([
    { stock_id: '0056', date: '2022-01-01', quantity: 1000, type: 'buy' },
    { stock_id: '0056', date: '2022-06-01', quantity: 1000, type: 'sell' },
  ]);
  render(<UserDividendsTab allDividendData={[]} availableYears={[2022, 2023]} />);
  expect(await screen.findByRole('table', { name: '我的配息月份表' })).toBeInTheDocument();
  expect(screen.queryByText('還沒有配息現金流')).not.toBeInTheDocument();
  // The year picker (inside the calendar panel) must be reachable so the user can
  // navigate back to 2022 to see their real history.
  expect(screen.getByRole('button', { name: /隱藏月曆|顯示月曆/ })).toBeInTheDocument();
});

test('Finding 3: no first-paint flash of EmptyState for a user with real holdings', async () => {
  // history used to start as useState([]) and only get populated by a useEffect
  // after mount, so the very first render always satisfied the (post-fix-#2)
  // `history.length === 0` gate and rendered EmptyState — even for users who go
  // on to see the real table a tick later. Checking the EmptyState mock's call
  // log (not just the final DOM) catches that first, later-discarded render.
  EmptyState.mockClear();
  readTransactionHistory.mockReturnValue([
    { stock_id: '0050', date: '2024-01-01', quantity: 1000, type: 'buy' }
  ]);
  render(<UserDividendsTab allDividendData={[]} availableYears={[2024]} />);
  await screen.findByRole('table', { name: '我的配息月份表' });
  expect(EmptyState).not.toHaveBeenCalled();
});
