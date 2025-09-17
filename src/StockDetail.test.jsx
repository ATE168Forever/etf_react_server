/* eslint-env jest */
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import StockDetail from './StockDetail';

jest.mock('./config', () => ({
  API_HOST: 'http://localhost'
}));

beforeEach(() => {
  globalThis.fetch = jest.fn((url) => {
    if (url.includes('/get_stock_list')) {
      return Promise.resolve({
        json: () => Promise.resolve([{ stock_id: '0056', stock_name: 'Test ETF' }])
      });
    }
    if (url.includes('/get_dividend')) {
      return Promise.resolve({
        json: () => Promise.resolve([])
      });
    }
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
