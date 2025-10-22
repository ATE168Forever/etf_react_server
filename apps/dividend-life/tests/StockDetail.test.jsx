/* eslint-env jest */
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import StockDetail from '../src/StockDetail';

jest.mock('../src/config', () => ({
  API_HOST: 'http://localhost'
}));

jest.mock('../src/stockApi', () => ({
  fetchStockList: jest.fn(() => Promise.resolve({ list: [{ stock_id: '0056', stock_name: 'Test ETF' }], meta: null }))
}));

jest.mock('../src/dividendApi', () => ({
  fetchDividendsByYears: jest.fn(() => Promise.resolve({ data: [] }))
}));

beforeEach(() => {
  const { fetchStockList } = require('../src/stockApi');
  fetchStockList.mockResolvedValue({ list: [{ stock_id: '0056', stock_name: 'Test ETF' }], meta: null });
  const { fetchDividendsByYears } = require('../src/dividendApi');
  fetchDividendsByYears.mockResolvedValue({ data: [] });
  globalThis.fetch = jest.fn((url) => {
    if (url.includes('/get_returns')) {
      return Promise.resolve({
        json: () => Promise.resolve({
          stock_id: '0056',
          market: 'TW',
          price_return_1m: 0.51,
          total_return_1m: 0.51,
          highest_1m: 100,
          lowest_1m: 10,
          mean_1m: 50,
          price_return_3m: 2.55,
          total_return_3m: 5.06,
          highest_3m: 100,
          lowest_3m: 10,
          mean_3m: 50,
          price_return_1y: -5.97,
          total_return_1y: 4.85,
          highest_1y: 100,
          lowest_1y: 10,
          mean_1y: 50
        })
      });
    }
    if (url.includes('/dividend_helper')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({})
      });
    }
    return Promise.reject(new Error('Unknown url'));
  });
});

test('renders returns data', async () => {
  const queryClient = new QueryClient();
  render(
    <QueryClientProvider client={queryClient}>
      <StockDetail stockId="0056" />
    </QueryClientProvider>
  );
  await waitFor(() => expect(screen.getAllByText('0.51%').length).toBeGreaterThan(0));
  expect(screen.getByText('5.06%')).toBeInTheDocument();
  expect(screen.getByText('-5.97%')).toBeInTheDocument();
});
