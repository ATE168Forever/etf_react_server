/* eslint-env jest */
import { fetchDividendsByYears, clearDividendsCache, buildDividendRequestUrl, clearEmptyDividendCaches } from '../src/dividendApi';
import { clearCache } from '../src/api';

jest.mock('../src/api', () => ({
  clearCache: jest.fn()
}));

jest.mock('../config', () => ({
  API_HOST: 'https://api.example.com'
}));

function createJsonResponse(data) {
  return {
    ok: true,
    status: 200,
    statusText: 'OK',
    headers: {
      get: (key) => (key && key.toLowerCase() === 'content-type' ? 'application/json' : null)
    },
    text: jest.fn().mockResolvedValue(JSON.stringify(data))
  };
}

describe('dividendApi', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    global.fetch = jest.fn().mockResolvedValue(createJsonResponse([]));
  });

  afterEach(() => {
    delete global.fetch;
  });

  test('buildDividendRequestUrl appends normalized country and year', () => {
    const url = buildDividendRequestUrl(2025, 'US');
    expect(url).toBe('https://api.example.com/get_dividend');
  });

  test('buildDividendRequestUrl accepts option object', () => {
    const url = buildDividendRequestUrl(undefined, undefined, { years: [2024, '2023'], countries: ['TW', ' us '], fields: ['a', 'b'] });
    expect(url).toBe('https://api.example.com/get_dividend');
  });

  test('buildDividendRequestUrl includes stock_ids when list provided', () => {
    const url = buildDividendRequestUrl(2024, 'TW', { stockIds: ['0056', ' 0050 '] });
    expect(url).toBe('https://api.example.com/get_dividend');
  });

  test('fetchDividendsByYears requests base endpoint when no filters provided', async () => {
    await fetchDividendsByYears();

    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.example.com/get_dividend?country=tw&country=us',
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({ Accept: 'application/json', 'Cache-Control': 'no-cache, no-store, must-revalidate', Pragma: 'no-cache' }),
        cache: 'no-store'
      })
    );
  });

  test('fetchDividendsByYears requests each year separately when multiple years provided', async () => {
    await fetchDividendsByYears([2024, 2023], [' TW ', 'US']);

    expect(global.fetch).toHaveBeenCalledTimes(2);
    expect(global.fetch).toHaveBeenNthCalledWith(
      1,
      'https://api.example.com/get_dividend?year=2024&country=tw&country=us',
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({ Accept: 'application/json', 'Cache-Control': 'no-cache, no-store, must-revalidate', Pragma: 'no-cache' }),
        cache: 'no-store'
      })
    );
    expect(global.fetch).toHaveBeenNthCalledWith(
      2,
      'https://api.example.com/get_dividend?year=2023&country=tw&country=us',
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({ Accept: 'application/json', 'Cache-Control': 'no-cache, no-store, must-revalidate', Pragma: 'no-cache' }),
        cache: 'no-store'
      })
    );
  });

  test('fetchDividendsByYears appends stock_ids list when provided', async () => {
    await fetchDividendsByYears([2024], undefined, { stockIds: ['0056', '0050'] });

    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.example.com/get_dividend?year=2024&country=tw&country=us&stock_ids=0056&stock_ids=0050',
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({ Accept: 'application/json', 'Cache-Control': 'no-cache, no-store, must-revalidate', Pragma: 'no-cache' }),
        cache: 'no-store'
      })
    );
  });

  test('fetchDividendsByYears omits stock_ids when requesting all', async () => {
    await fetchDividendsByYears([2024], undefined, { stockIds: 'all' });

    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.example.com/get_dividend?year=2024&country=tw&country=us',
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({ Accept: 'application/json', 'Cache-Control': 'no-cache, no-store, must-revalidate', Pragma: 'no-cache' }),
        cache: 'no-store'
      })
    );
  });

  test('clearDividendsCache clears base endpoint when no filters provided', () => {
    clearDividendsCache();

    expect(clearCache).toHaveBeenCalledTimes(1);
    expect(clearCache).toHaveBeenNthCalledWith(1, 'https://api.example.com/get_dividend');
  });

  test('fetchDividendsByYears falls back to TW and US when countries list empty', async () => {
    await fetchDividendsByYears([2024], []);

    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.example.com/get_dividend?year=2024&country=tw&country=us',
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({ Accept: 'application/json', 'Cache-Control': 'no-cache, no-store, must-revalidate', Pragma: 'no-cache' }),
        cache: 'no-store'
      })
    );
  });

  test('clearDividendsCache falls back to TW and US when countries list empty', () => {
    clearDividendsCache([2024], []);

    expect(clearCache).toHaveBeenCalledTimes(1);
    expect(clearCache).toHaveBeenCalledWith('https://api.example.com/get_dividend');
  });

  test('clearDividendsCache clears each year separately when multiple years provided', () => {
    clearDividendsCache([2025, 2024], ['TW']);

    expect(clearCache).toHaveBeenCalledTimes(2);
    expect(clearCache).toHaveBeenNthCalledWith(1, 'https://api.example.com/get_dividend');
    expect(clearCache).toHaveBeenNthCalledWith(2, 'https://api.example.com/get_dividend');
  });

  test('clearDividendsCache includes stock_ids list when provided', () => {
    clearDividendsCache([2024], ['TW'], { stockIds: ['0056', '0050'] });

    expect(clearCache).toHaveBeenCalledTimes(1);
    expect(clearCache).toHaveBeenCalledWith('https://api.example.com/get_dividend');
  });

  test('clearDividendsCache omits stock_ids when requesting all', () => {
    clearDividendsCache([2024], ['TW'], { stockIds: 'all' });

    expect(clearCache).toHaveBeenCalledTimes(1);
    expect(clearCache).toHaveBeenCalledWith('https://api.example.com/get_dividend');
  });

  test('fetchDividendsByYears caches responses under the versioned cache:v1: prefix and skips re-fetching within maxAge', async () => {
    await fetchDividendsByYears([2024], ['TW']);
    expect(global.fetch).toHaveBeenCalledTimes(1);

    const storedKeys = Array.from({ length: localStorage.length }, (_, i) => localStorage.key(i));
    const cacheKey = storedKeys.find(key => key.startsWith('cache:v1:data:') && key.includes('get_dividend'));
    expect(cacheKey).toBeDefined();

    await fetchDividendsByYears([2024], ['TW']);
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  test('clearEmptyDividendCaches removes corrupt versioned dividend cache entries and sweeps leftover legacy-prefixed entries', () => {
    localStorage.setItem('cache:v1:data:https://api.example.com/get_dividend?year=2024', '{not valid json');
    localStorage.setItem('cache:v1:meta:https://api.example.com/get_dividend?year=2024', JSON.stringify({ timestamp: '2026-01-01T00:00:00.000Z' }));
    localStorage.setItem('cache:data:https://api.example.com/get_stock_list', JSON.stringify({ value: 1 }));
    localStorage.setItem('cache:meta:https://api.example.com/get_stock_list', JSON.stringify({ timestamp: '2026-01-01T00:00:00.000Z' }));

    clearEmptyDividendCaches();

    expect(localStorage.getItem('cache:v1:data:https://api.example.com/get_dividend?year=2024')).toBeNull();
    expect(localStorage.getItem('cache:v1:meta:https://api.example.com/get_dividend?year=2024')).toBeNull();
    expect(localStorage.getItem('cache:data:https://api.example.com/get_stock_list')).toBeNull();
    expect(localStorage.getItem('cache:meta:https://api.example.com/get_stock_list')).toBeNull();
  });
});
