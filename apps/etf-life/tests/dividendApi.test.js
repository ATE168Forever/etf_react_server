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

  test('fetchDividendsByYears requests both TW and US data by default', async () => {
    fetchWithCache.mockResolvedValue({ data: [], cacheStatus: 'fresh', timestamp: '2024-01-01T00:00:00Z' });

    await fetchDividendsByYears([2024]);

    expect(fetchWithCache).toHaveBeenCalledTimes(2);
    const urls = fetchWithCache.mock.calls.map(([url]) => url);
    expect(urls).toContain('https://api.example.com/get_dividend?year=2024&country=tw');
    expect(urls).toContain('https://api.example.com/get_dividend?year=2024&country=us');
  });

  test('clearDividendsCache removes cached TW and US entries by default', () => {
    clearDividendsCache([2024]);

    expect(clearCache).toHaveBeenCalledTimes(2);
    const urls = clearCache.mock.calls.map(([url]) => url);
    expect(urls).toContain('https://api.example.com/get_dividend?year=2024&country=tw');
    expect(urls).toContain('https://api.example.com/get_dividend?year=2024&country=us');
  });

  test('fetchDividendsByYears falls back to TW and US when countries list empty', async () => {
    fetchWithCache.mockResolvedValue({ data: [], cacheStatus: 'fresh', timestamp: '2024-01-01T00:00:00Z' });

    await fetchDividendsByYears([2024], []);

    expect(fetchWithCache).toHaveBeenCalledTimes(2);
    const urls = fetchWithCache.mock.calls.map(([url]) => url);
    expect(urls).toContain('https://api.example.com/get_dividend?year=2024&country=tw');
    expect(urls).toContain('https://api.example.com/get_dividend?year=2024&country=us');
  });

  test('clearDividendsCache falls back to TW and US when countries list empty', () => {
    clearDividendsCache([2024], []);

    expect(clearCache).toHaveBeenCalledTimes(2);
    const urls = clearCache.mock.calls.map(([url]) => url);
    expect(urls).toContain('https://api.example.com/get_dividend?year=2024&country=tw');
    expect(urls).toContain('https://api.example.com/get_dividend?year=2024&country=us');
  });
});
