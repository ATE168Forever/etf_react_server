/* eslint-env jest */
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

const scopesRequested = () => mockFetchDividendsByYears.mock.calls.map(call => call[2]?.stockIds);

beforeEach(() => {
  // Reset the URL hash between tests — DividendLifePage reads the initial tab
  // from window.location.hash, and history.replaceState from a previous
  // test's tab switch otherwise bleeds into the next test's initial render.
  history.replaceState(null, '', '#');
  localStorage.clear();
  sessionStorage.clear();
  localStorage.setItem('lang', 'zh');
  localStorage.setItem(
    'my_transaction_history',
    JSON.stringify([{ stock_id: '0050', date: '2024-01-01', type: 'buy', quantity: 1000, price: 100 }])
  );
  mockFetchStockList.mockReset();
  mockFetchStockList.mockResolvedValue({ list: [], meta: null });
  mockFetchDividendsByYears.mockReset();
  mockFetchDividendsByYears.mockResolvedValue({ data: [], meta: null });
  globalThis.fetch = jest.fn(() => Promise.resolve({}));
});

async function renderApp() {
  await act(async () => {
    render(
      <RouterProvider>
        <App />
      </RouterProvider>
    );
  });
}

test('does not fetch the full-market ("all") dataset before the Explore ETFs tab is visited', async () => {
  await renderApp();

  await waitFor(() => expect(mockFetchDividendsByYears).toHaveBeenCalledTimes(1));

  expect(scopesRequested()).not.toContainEqual('all');
  expect(scopesRequested()).toContainEqual(['0050']);
});

test('Explore ETFs tab defaults to the "all" scope independently of the purchased-scoped main data', async () => {
  await renderApp();
  await waitFor(() => expect(mockFetchDividendsByYears).toHaveBeenCalledTimes(1));

  const dividendTab = screen.getByRole('tab', { name: '探索 ETF' });
  await act(async () => {
    fireEvent.click(dividendTab);
  });

  await waitFor(() => expect(mockFetchDividendsByYears).toHaveBeenCalledTimes(2));
  expect(scopesRequested()).toContainEqual('all');
  expect(scopesRequested()).toContainEqual(['0050']);

  const allPill = await screen.findByRole('button', { name: '全部 ETF' });
  expect(allPill).toHaveClass('filter-bar__pill--active');
});

test('switching the Explore ETFs scope pill does not trigger another fetch for the main data', async () => {
  await renderApp();
  await waitFor(() => expect(mockFetchDividendsByYears).toHaveBeenCalledTimes(1));

  const dividendTab = screen.getByRole('tab', { name: '探索 ETF' });
  await act(async () => {
    fireEvent.click(dividendTab);
  });
  await waitFor(() => expect(mockFetchDividendsByYears).toHaveBeenCalledTimes(2));

  const purchasedPill = await screen.findByRole('button', { name: '已購買 ETF' });
  await act(async () => {
    fireEvent.click(purchasedPill);
  });

  await waitFor(() => expect(purchasedPill).toHaveClass('filter-bar__pill--active'));
  // exactly one new call (the explore hook re-fetching its own scope) — the
  // main hook must not have refetched too.
  expect(mockFetchDividendsByYears).toHaveBeenCalledTimes(3);
});
