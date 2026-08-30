/* eslint-env jest */
// Regression coverage for the Explore ETF tab's calendarEvents builder in
// DividendLifePage.jsx. UserDividendsTab.jsx's calendarEvents builder was
// fixed on this branch to set hasValidYield/hasPendingYield and never
// coerce a missing yield to 0, but DividendLifePage.jsx's *separate*
// calendarEvents builder (feeding the same DividendCalendar component from
// the Explore ETF tab) was not updated to match. Since
// DividendCalendar.jsx's tooltip gates yield validity on
// Boolean(cell?.hasValidYield) -- an absent flag reads as invalid, same as
// an explicitly-invalid one -- every event from the Explore tab showed
// "無法計算" / "Not available" even for a perfectly valid, non-zero yield.
import { render, screen, act, waitFor, fireEvent } from '@testing-library/react';

jest.mock('@shared/assets/dividend-life.svg', () => 'data:image/svg+xml;base64,PHN2Zy8+');
jest.mock('@shared/assets/dividend-life-light.svg', () => 'data:image/svg+xml;base64,PHN2Zy8+');

jest.mock('../src/api', () => ({
  fetchWithCache: jest.fn(() => Promise.resolve({ data: [] })),
  clearCache: jest.fn(),
}));

const mockFetchStockList = jest.fn();
jest.mock('../src/stockApi', () => ({
  fetchStockList: (...args) => mockFetchStockList(...args),
}));

const mockFetchDividendsByYears = jest.fn();
jest.mock('../src/dividendApi', () => ({
  fetchDividendsByYears: (...args) => mockFetchDividendsByYears(...args),
  clearDividendsCache: jest.fn(),
  clearEmptyDividendCaches: jest.fn(),
}));

jest.mock('../config', () => ({ API_HOST: '' }));

import App from '../src/App';
import { RouterProvider } from '@shared/router';

// Keep the ex-dividend date safely inside the current month so it's always
// visible in the calendar's default (current month) view, regardless of
// what day of the month the suite runs on.
const now = new Date();
const pad = (n) => String(n).padStart(2, '0');
const dividendDateStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-01`;

function buildDividendItem({ dividend_yield }) {
  return {
    stock_id: '0050',
    stock_name: 'Yuanta Taiwan 50',
    dividend: 1.5,
    dividend_yield,
    currency: 'TWD',
    dividend_date: dividendDateStr,
    payment_date: dividendDateStr,
    last_close_price: 40,
  };
}

beforeEach(() => {
  history.replaceState(null, '', '#');
  localStorage.clear();
  sessionStorage.clear();
  localStorage.setItem('lang', 'zh');
  mockFetchStockList.mockReset();
  mockFetchStockList.mockResolvedValue({ list: [], meta: null });
  mockFetchDividendsByYears.mockReset();
  globalThis.fetch = jest.fn(() => Promise.resolve({}));
});

function findEventTooltipTrigger(container) {
  return Array.from(container.querySelectorAll('.tooltip-text'))
    .find(el => (el.title || '').includes('除息前一天收盤價'));
}

test('a genuinely valid, non-zero yield still shows its percentage in the Explore tab calendar tooltip', async () => {
  mockFetchDividendsByYears.mockResolvedValue({
    data: [buildDividendItem({ dividend_yield: 4.2 })],
    meta: null,
  });

  const { container } = render(
    <RouterProvider>
      <App />
    </RouterProvider>
  );
  await waitFor(() => expect(mockFetchDividendsByYears).toHaveBeenCalled());

  const dividendTab = await screen.findByRole('tab', { name: '探索 ETF' });
  await act(async () => {
    fireEvent.click(dividendTab);
  });
  await waitFor(() => expect(mockFetchDividendsByYears).toHaveBeenCalledTimes(2));

  await waitFor(() => expect(findEventTooltipTrigger(container)).toBeTruthy());
  const tooltipTrigger = findEventTooltipTrigger(container);

  expect(tooltipTrigger.title).toMatch(/當次殖利率: 4\.2%/);
  expect(tooltipTrigger.title).not.toMatch(/無法計算/);
});

test('a genuinely missing yield still shows "無法計算" in the Explore tab calendar tooltip', async () => {
  mockFetchDividendsByYears.mockResolvedValue({
    data: [buildDividendItem({ dividend_yield: null })],
    meta: null,
  });

  const { container } = render(
    <RouterProvider>
      <App />
    </RouterProvider>
  );
  await waitFor(() => expect(mockFetchDividendsByYears).toHaveBeenCalled());

  const dividendTab = await screen.findByRole('tab', { name: '探索 ETF' });
  await act(async () => {
    fireEvent.click(dividendTab);
  });
  await waitFor(() => expect(mockFetchDividendsByYears).toHaveBeenCalledTimes(2));

  await waitFor(() => expect(findEventTooltipTrigger(container)).toBeTruthy());
  const tooltipTrigger = findEventTooltipTrigger(container);

  expect(tooltipTrigger.title).toMatch(/當次殖利率: 無法計算/);
  expect(tooltipTrigger.title).not.toMatch(/當次殖利率: 0%/);
});
