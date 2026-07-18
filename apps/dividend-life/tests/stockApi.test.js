/* eslint-env jest */
import { clearStockListCache } from '../src/stockApi';
import { clearCache } from '../src/api';

jest.mock('../config', () => ({
  API_HOST: 'https://api.example.com'
}));

jest.mock('../src/api', () => ({
  fetchWithCache: jest.fn(),
  clearCache: jest.fn()
}));

describe('stockApi', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('clearStockListCache delegates to api.js clearCache with the stock list URL', () => {
    clearStockListCache();

    expect(clearCache).toHaveBeenCalledTimes(1);
    expect(clearCache).toHaveBeenCalledWith('https://api.example.com/get_stock_list');
  });

  test('clearStockListCache includes fields in the URL when provided', () => {
    clearStockListCache({ fields: ['a', 'b'] });

    expect(clearCache).toHaveBeenCalledTimes(1);
    expect(clearCache).toHaveBeenCalledWith('https://api.example.com/get_stock_list?fields=a%2Cb');
  });
});
