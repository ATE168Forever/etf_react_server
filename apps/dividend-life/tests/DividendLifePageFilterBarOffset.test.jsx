/* eslint-env jest */
// Regression coverage for the Explore ETF sticky-header offset: the desktop
// stock table's sticky thead used to stick to the same `top: 0` as the
// sticky filter bar above it, so scrolling made them physically overlap --
// the table's sticky header/first column ended up permanently pinned
// underneath the filter bar. The fix measures the filter bar's real
// rendered height via ResizeObserver and exposes it as --filter-bar-height
// on the dividend tab panel; App.css's `.table-responsive thead th` reads
// it back so the table's sticky header sticks just below the filter bar.
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

// jsdom has no native matchMedia; keep this on the desktop branch (the
// filter-bar/table sticky overlap this fix addresses is desktop-only --
// the mobile card list hides the desktop table entirely).
function installMatchMediaMock(mobileMatches) {
  window.matchMedia = jest.fn().mockImplementation((query) => ({
    media: query,
    matches: query === '(max-width: 600px)' ? mobileMatches : false,
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
  }));
}

// jsdom has no ResizeObserver. This mock fires its callback synchronously
// on observe() (so the effect's initial measurement is exercised) and
// exposes the instance list so tests can trigger a follow-up "resize".
class MockResizeObserver {
  constructor(callback) {
    this.callback = callback;
    MockResizeObserver.instances.push(this);
  }
  observe(el) {
    this.target = el;
    this.callback([{ target: el }]);
  }
  unobserve() {}
  disconnect() {}
}
MockResizeObserver.instances = [];

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
  installMatchMediaMock(false);
  MockResizeObserver.instances = [];
  window.ResizeObserver = MockResizeObserver;
});

afterEach(() => {
  delete window.matchMedia;
  delete window.ResizeObserver;
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

test('measures the filter bar and exposes its height as --filter-bar-height on the dividend tab panel', async () => {
  await renderOnExploreTab();

  const filterBar = document.querySelector('.filter-bar');
  Object.defineProperty(filterBar, 'offsetHeight', { value: 132, configurable: true });

  act(() => {
    MockResizeObserver.instances[0].callback([{ target: filterBar }]);
  });

  const panel = document.getElementById('panel-dividend');
  expect(panel.style.getPropertyValue('--filter-bar-height')).toBe('132px');
});

test('updates --filter-bar-height when the filter bar is resized again (e.g. collapsing)', async () => {
  await renderOnExploreTab();

  const filterBar = document.querySelector('.filter-bar');
  const panel = document.getElementById('panel-dividend');
  const observer = MockResizeObserver.instances[0];

  Object.defineProperty(filterBar, 'offsetHeight', { value: 140, configurable: true });
  act(() => observer.callback([{ target: filterBar }]));
  expect(panel.style.getPropertyValue('--filter-bar-height')).toBe('140px');

  Object.defineProperty(filterBar, 'offsetHeight', { value: 40, configurable: true });
  act(() => observer.callback([{ target: filterBar }]));
  expect(panel.style.getPropertyValue('--filter-bar-height')).toBe('40px');
});
