/* eslint-env jest */
import { fetchDividendsByYears, clearDividendsCache, buildDividendRequestUrl } from '../src/dividendApi';
import { fetchWithCache, clearCache } from '../src/api';

jest.mock('../src/api', () => ({
  fetchWithCache: jest.fn(),
  clearCache: jest.fn()
}));

jest.mock('../src/config', () => ({
  API_HOST: 'https://api.example.com'
}));

describe('dividendApi', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('buildDividendRequestUrl appends normalized country and year', () => {
    const url = buildDividendRequestUrl(2025, 'US');
    expect(url).toBe('https://api.example.com/get_dividend?year=2025&country=us');
  });

  test('buildDividendRequestUrl accepts option object', () => {
    const url = buildDividendRequestUrl(undefined, undefined, { years: [2024, '2023'], countries: ['TW', ' us '], fields: ['a', 'b'] });
    expect(url).toBe('https://api.example.com/get_dividend?year=2024&country=tw%2Cus&fields=a%2Cb');
  });

  test('fetchDividendsByYears requests base endpoint when no filters provided', async () => {
    fetchWithCache.mockResolvedValue({ data: [], cacheStatus: 'fresh', timestamp: '2024-01-01T00:00:00Z' });

    await fetchDividendsByYears();

    expect(fetchWithCache).toHaveBeenCalledTimes(1);
    expect(fetchWithCache).toHaveBeenCalledWith('https://api.example.com/get_dividend');
  });

  test('fetchDividendsByYears requests each year separately when multiple years provided', async () => {
    fetchWithCache.mockResolvedValue({ data: [], cacheStatus: 'fresh', timestamp: '2024-01-01T00:00:00Z' });

    await fetchDividendsByYears([2024, 2023], [' TW ', 'US']);

    expect(fetchWithCache).toHaveBeenCalledTimes(2);
    expect(fetchWithCache).toHaveBeenNthCalledWith(1, 'https://api.example.com/get_dividend?year=2024&country=tw%2Cus');
    expect(fetchWithCache).toHaveBeenNthCalledWith(2, 'https://api.example.com/get_dividend?year=2023&country=tw%2Cus');
  });

  test('clearDividendsCache clears base endpoint when no filters provided', () => {
    clearDividendsCache();

    expect(clearCache).toHaveBeenCalledTimes(1);
    expect(clearCache).toHaveBeenNthCalledWith(1, 'https://api.example.com/get_dividend');
  });

  test('fetchDividendsByYears falls back to TW and US when countries list empty', async () => {
    fetchWithCache.mockResolvedValue({ data: [], cacheStatus: 'fresh', timestamp: '2024-01-01T00:00:00Z' });

    await fetchDividendsByYears([2024], []);

    expect(fetchWithCache).toHaveBeenCalledTimes(1);
    expect(fetchWithCache).toHaveBeenCalledWith('https://api.example.com/get_dividend?year=2024&country=tw%2Cus');
  });

  test('clearDividendsCache falls back to TW and US when countries list empty', () => {
    clearDividendsCache([2024], []);

    expect(clearCache).toHaveBeenCalledTimes(1);
    expect(clearCache).toHaveBeenCalledWith('https://api.example.com/get_dividend?year=2024&country=tw%2Cus');
  });

  test('clearDividendsCache clears each year separately when multiple years provided', () => {
    clearDividendsCache([2025, 2024], ['TW']);

    expect(clearCache).toHaveBeenCalledTimes(2);
    expect(clearCache).toHaveBeenNthCalledWith(1, 'https://api.example.com/get_dividend?year=2025&country=tw');
    expect(clearCache).toHaveBeenNthCalledWith(2, 'https://api.example.com/get_dividend?year=2024&country=tw');
  });
});
