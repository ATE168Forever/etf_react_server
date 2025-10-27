/* eslint-env jest */
import { render, screen, act, waitFor, fireEvent } from '@testing-library/react';

jest.mock('../src/assets/dividend-life.svg', () => 'data:image/svg+xml;base64,PHN2Zy8+');

const mockFetchWithCache = jest.fn();
const mockFetchStockList = jest.fn();

jest.mock('../src/api', () => ({
  fetchWithCache: (...args) => mockFetchWithCache(...args),
  clearCache: jest.fn()
}));

jest.mock('../src/stockApi', () => ({
  fetchStockList: (...args) => mockFetchStockList(...args)
}));

const mockFetchDividendsByYears = jest.fn();

jest.mock('../src/dividendApi', () => ({
  fetchDividendsByYears: (...args) => mockFetchDividendsByYears(...args),
  clearDividendsCache: jest.fn()
}));

jest.mock('../src/config', () => ({ API_HOST: '' }));

import App from '../src/App';
import { RouterProvider } from '@shared/router';

beforeEach(() => {
  jest.useFakeTimers();
  localStorage.clear();
  sessionStorage.clear();
  localStorage.setItem('lang', 'zh');
  mockFetchWithCache.mockReset();
  mockFetchWithCache.mockResolvedValue({ data: [] });
  mockFetchStockList.mockReset();
  mockFetchStockList.mockResolvedValue({ list: [], meta: null });
  mockFetchDividendsByYears.mockReset();
  globalThis.fetch = jest.fn(() => Promise.resolve({}));
});

afterEach(() => {
  jest.runOnlyPendingTimers();
  jest.useRealTimers();
});

test('falls back to the latest available year when current year has no data', async () => {
  const currentYear = new Date().getFullYear();
  const previousYear = currentYear - 1;

  mockFetchDividendsByYears.mockResolvedValue({
    data: [
      {
        stock_id: '0050',
        stock_name: '台灣50',
        dividend_date: `${previousYear}-05-01`,
        payment_date: `${previousYear}-06-01`,
        dividend: '1.23',
        dividend_yield: '4.56',
        last_close_price: '100'
      }
    ],
    meta: [
      { year: previousYear, cacheStatus: 'cached', timestamp: '2024-06-01T00:00:00Z' }
    ]
  });

  mockFetchWithCache.mockImplementation((url) => {
    if (url.includes('/site_stats')) {
      return Promise.resolve({ data: { milestones: [], latest: [], tip: '' } });
    }
    return Promise.resolve({ data: [] });
  });

  await act(async () => {
    render(
      <RouterProvider>
        <App />
      </RouterProvider>
    );
  });

  const dividendTab = await screen.findByRole('button', { name: 'ETF 配息查詢' });

  await act(async () => {
    fireEvent.click(dividendTab);
  });

  const [yearSelect] = await screen.findAllByRole('combobox');

  await waitFor(() => {
    expect(yearSelect.value).toBe(String(previousYear));
  });
});
