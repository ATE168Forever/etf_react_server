/* eslint-env jest */
// Regression coverage for the Explore ETF filter bar's scroll-driven
// auto-collapse (mobile only): scrolling down past a threshold shrinks the
// sticky filter bar to a one-line summary so more of the stock list is
// visible; tapping the summary re-expands it, and it then stays expanded
// through further scrolling until manually collapsed again.
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';

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

const now = new Date();
const pad = (n) => String(n).padStart(2, '0');
const dividendDateStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-01`;

const STOCK_A = { stock_id: '0050', stock_name: 'Yuanta Taiwan 50' };

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

// jsdom has no native matchMedia. The filter bar only auto-collapses on
// viewports matching `(max-width: 600px)` — default that query to a match
// here so the collapse behavior under test is actually reachable; the
// dedicated desktop test below overrides it to prove the opt-out.
function installMatchMediaMock(mobileMatches) {
  window.matchMedia = jest.fn().mockImplementation((query) => ({
    media: query,
    matches: query === '(max-width: 600px)' ? mobileMatches : false,
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
  }));
}

function scrollWindowTo(y) {
  Object.defineProperty(window, 'scrollY', { value: y, configurable: true });
  act(() => {
    window.dispatchEvent(new Event('scroll'));
  });
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
    data: [buildDividendItem(STOCK_A)],
    meta: null,
  });
  globalThis.fetch = jest.fn(() => Promise.resolve({}));
  installMatchMediaMock(true);
});

afterEach(() => {
  delete window.matchMedia;
  Object.defineProperty(window, 'scrollY', { value: 0, configurable: true });
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
  await waitFor(() => expect(mockFetchDividendsByYears).toHaveBeenCalledTimes(2));
  await waitFor(() => expect(screen.getAllByText('0050').length).toBeGreaterThan(0));

  return view;
}

test('the full filter bar is shown at the top of the page', async () => {
  await renderOnExploreTab();

  expect(document.getElementById('filter-search')).toBeTruthy();
});

test('scrolling down past the threshold collapses the filter bar to a one-line summary', async () => {
  await renderOnExploreTab();

  scrollWindowTo(200);

  expect(document.getElementById('filter-search')).toBeFalsy();
  expect(document.querySelector('.filter-bar__collapsed-summary')).toBeInTheDocument();
});

test('tapping the collapsed summary re-expands the filter bar and it stays expanded on further scrolling', async () => {
  await renderOnExploreTab();

  scrollWindowTo(200);
  fireEvent.click(document.querySelector('.filter-bar__collapsed-summary'));
  expect(document.getElementById('filter-search')).toBeTruthy();

  scrollWindowTo(400);
  expect(document.getElementById('filter-search')).toBeTruthy();
});

test('scrolling back to the top restores the full filter bar', async () => {
  await renderOnExploreTab();

  scrollWindowTo(200);
  expect(document.getElementById('filter-search')).toBeFalsy();

  scrollWindowTo(0);
  expect(document.getElementById('filter-search')).toBeTruthy();
});

test('on a desktop viewport the filter bar never collapses, even when scrolled', async () => {
  installMatchMediaMock(false);
  await renderOnExploreTab();

  scrollWindowTo(200);

  expect(document.getElementById('filter-search')).toBeTruthy();
});
