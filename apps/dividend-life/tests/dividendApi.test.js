/* eslint-env jest */
import { fetchDividendsByYears, clearDividendsCache, buildDividendRequestUrl } from '../src/dividendApi';
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
      'https://api.example.com/get_dividend',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ Accept: 'application/json', 'Content-Type': 'application/json' }),
        body: JSON.stringify({ country: ['tw', 'us'] })
      })
    );
  });

  test('fetchDividendsByYears requests each year separately when multiple years provided', async () => {
    await fetchDividendsByYears([2024, 2023], [' TW ', 'US']);

    expect(global.fetch).toHaveBeenCalledTimes(2);
    expect(global.fetch).toHaveBeenNthCalledWith(
      1,
      'https://api.example.com/get_dividend',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ Accept: 'application/json', 'Content-Type': 'application/json' }),
        body: JSON.stringify({ year: [2024], country: ['tw', 'us'] })
      })
    );
    expect(global.fetch).toHaveBeenNthCalledWith(
      2,
      'https://api.example.com/get_dividend',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ Accept: 'application/json', 'Content-Type': 'application/json' }),
        body: JSON.stringify({ year: [2023], country: ['tw', 'us'] })
      })
    );
  });

  test('fetchDividendsByYears appends stock_ids list when provided', async () => {
    await fetchDividendsByYears([2024], undefined, { stockIds: ['0056', '0050'] });

    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.example.com/get_dividend',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ Accept: 'application/json', 'Content-Type': 'application/json' }),
        body: JSON.stringify({ year: [2024], country: ['tw', 'us'], stock_ids: ['0056', '0050'] })
      })
    );
  });

  test('fetchDividendsByYears omits stock_ids when requesting all', async () => {
    await fetchDividendsByYears([2024], undefined, { stockIds: 'all' });

    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.example.com/get_dividend',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ Accept: 'application/json', 'Content-Type': 'application/json' }),
        body: JSON.stringify({ year: [2024], country: ['tw', 'us'] })
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
      'https://api.example.com/get_dividend',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ Accept: 'application/json', 'Content-Type': 'application/json' }),
        body: JSON.stringify({ year: [2024], country: ['tw', 'us'] })
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
});
