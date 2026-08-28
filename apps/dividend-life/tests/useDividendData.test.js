/* eslint-env jest */
import { renderHook, act, waitFor } from '@testing-library/react';
import useDividendData from '../src/hooks/useDividendData';

const mockFetchDividendsByYears = jest.fn();
const mockFetchStockList = jest.fn();

jest.mock('../src/dividendApi', () => ({
  fetchDividendsByYears: (...args) => mockFetchDividendsByYears(...args),
}));

jest.mock('../src/stockApi', () => ({
  fetchStockList: (...args) => mockFetchStockList(...args),
}));

const baseProps = {
  dividendScope: 'purchased',
  setDividendScope: () => {},
  transactionHistory: [],
  transactionHistoryLoaded: true,
};

beforeEach(() => {
  mockFetchDividendsByYears.mockReset();
  mockFetchDividendsByYears.mockResolvedValue({ data: [], meta: null });
  mockFetchStockList.mockReset();
  mockFetchStockList.mockResolvedValue({ list: [] });
});

test('enabled defaults to true and fetches dividend data', async () => {
  renderHook(() => useDividendData(baseProps));

  await waitFor(() => expect(mockFetchDividendsByYears).toHaveBeenCalledTimes(1));
});

test('enabled: false skips the dividend data fetch', async () => {
  renderHook(() => useDividendData({ ...baseProps, enabled: false }));

  await act(async () => {
    await Promise.resolve();
  });

  expect(mockFetchDividendsByYears).not.toHaveBeenCalled();
});

test('flipping enabled from false to true triggers the fetch exactly once', async () => {
  const { rerender } = renderHook(
    ({ enabled }) => useDividendData({ ...baseProps, enabled }),
    { initialProps: { enabled: false } }
  );

  await act(async () => {
    await Promise.resolve();
  });
  expect(mockFetchDividendsByYears).not.toHaveBeenCalled();

  rerender({ enabled: true });

  await waitFor(() => expect(mockFetchDividendsByYears).toHaveBeenCalledTimes(1));
});

test('fetchStockList still runs even when enabled is false', async () => {
  renderHook(() => useDividendData({ ...baseProps, enabled: false }));

  await waitFor(() => expect(mockFetchStockList).toHaveBeenCalledTimes(1));
});
