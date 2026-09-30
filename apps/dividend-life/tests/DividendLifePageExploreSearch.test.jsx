/* eslint-env jest */
// Regression coverage for the Explore ETF tab's search box (Task 1) and the
// Reset button's interaction with it (final-review fix 4). Neither the
// search filtering's actual end-to-end effect on rendered output, nor the
// Reset button restoring a filtered-out stock, had a test before this file
// -- both were previously covered only indirectly by "the full suite still
// passes". Mocking pattern copied from AppExploreCalendarYield.test.jsx.
//
// The search box was later replaced with a multi-select checkbox dropdown
// (the same FilterDropdown the desktop table's "依代號篩選" column-header
// button uses) driven by selectedStockIds, instead of free-text matching --
// these tests were updated to drive that flow instead.
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

// Keep the ex-dividend date safely inside the current month so both stocks
// land in the currently-selected year's data regardless of what day of the
// month the suite runs on.
const now = new Date();
const pad = (n) => String(n).padStart(2, '0');
const dividendDateStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-01`;

const STOCK_A = { stock_id: '0050', stock_name: 'Yuanta Taiwan 50' };
const STOCK_B = { stock_id: '00878', stock_name: 'Guotai Dividend Plus' };

function buildDividendItem(stock, overrides = {}) {
  return {
    stock_id: stock.stock_id,
    stock_name: stock.stock_name,
    dividend: 1.5,
    dividend_yield: 3.0,
    currency: 'TWD',
    dividend_date: dividendDateStr,
    payment_date: dividendDateStr,
    last_close_price: 40,
    ...overrides,
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
  mockFetchDividendsByYears.mockResolvedValue({
    data: [buildDividendItem(STOCK_A), buildDividendItem(STOCK_B)],
    meta: null,
  });
  globalThis.fetch = jest.fn(() => Promise.resolve({}));
});

async function renderOnExploreTab() {
  const view = render(
    <RouterProvider>
      <App />
    </RouterProvider>
  );
  await waitFor(() => expect(mockFetchDividendsByYears).toHaveBeenCalled());

  const dividendTab = await screen.findByRole('tab', { name: '探索 ETF' });
  await act(async () => {
    fireEvent.click(dividendTab);
  });
  // The Explore tab's own useDividendData instance only fetches once
  // visited, so this is the second call (see AppExploreCalendarYield.test.jsx).
  await waitFor(() => expect(mockFetchDividendsByYears).toHaveBeenCalledTimes(2));
  await waitFor(() => expect(screen.getAllByText('0050').length).toBeGreaterThan(0));

  return view;
}

test('both stocks render in the Explore tab before any search text is entered', async () => {
  await renderOnExploreTab();

  expect(screen.getAllByText('0050').length).toBeGreaterThan(0);
  expect(screen.getAllByText('00878').length).toBeGreaterThan(0);
});

function openSearchDropdownAndSelect(stockId) {
  const trigger = document.getElementById('filter-search');
  fireEvent.click(trigger);

  // FilterDropdown renders via a portal directly onto document.body, so it
  // lives outside the render container -- query the whole document instead.
  const checkbox = Array.from(document.querySelectorAll('.dropdown-item'))
    .find(label => label.textContent.trim() === stockId)
    .querySelector('input[type="checkbox"]');
  fireEvent.click(checkbox);

  const applyButton = screen.getByRole('button', { name: '確定' });
  fireEvent.click(applyButton);
}

test('checking one stock in the search dropdown filters out the other', async () => {
  await renderOnExploreTab();

  const trigger = document.getElementById('filter-search');
  expect(trigger).toBeTruthy();

  openSearchDropdownAndSelect('0050');

  await waitFor(() => expect(screen.queryAllByText('00878').length).toBe(0));
  expect(screen.getAllByText('0050').length).toBeGreaterThan(0);
  expect(trigger).toHaveTextContent('已選 1 檔');
});

test('Reset restores both stocks after the search dropdown has filtered one out', async () => {
  await renderOnExploreTab();

  openSearchDropdownAndSelect('0050');
  await waitFor(() => expect(screen.queryAllByText('00878').length).toBe(0));

  const resetButton = screen.getByRole('button', { name: /重置/ });
  fireEvent.click(resetButton);

  await waitFor(() => expect(screen.getAllByText('00878').length).toBeGreaterThan(0));
  expect(screen.getAllByText('0050').length).toBeGreaterThan(0);
  expect(document.getElementById('filter-search')).toHaveTextContent('ETF 代號或名稱');
});
