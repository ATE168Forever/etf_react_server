/* eslint-env jest */
import { fetchWithCache } from './api';

describe('fetchWithCache', () => {
  const URL = 'https://example.com/data';
  const cacheKey = `cache:data:${URL}`;
  const metaKey = `cache:meta:${URL}`;
  const realFetch = globalThis.fetch;

  afterEach(() => {
    localStorage.clear();
    globalThis.fetch = realFetch;
    jest.useRealTimers();
    jest.resetAllMocks();
  });

  test('returns cached data when not expired', async () => {
    jest.useFakeTimers();
    const timestamp = new Date('2024-01-01T00:00:00Z').toISOString();
    jest.setSystemTime(new Date('2024-01-01T01:00:00Z'));
    localStorage.setItem(cacheKey, JSON.stringify({ value: 1 }));
    localStorage.setItem(metaKey, JSON.stringify({ timestamp }));
    globalThis.fetch = jest.fn();

    const result = await fetchWithCache(URL);

    expect(globalThis.fetch).not.toHaveBeenCalled();
    expect(result).toEqual({ data: { value: 1 }, cacheStatus: 'cached', timestamp });
  });

  test('fetches new data when cache expired', async () => {
    jest.useFakeTimers();
    const oldTimestamp = new Date('2024-01-01T00:00:00Z').toISOString();
    jest.setSystemTime(new Date('2024-01-01T02:01:00Z'));
    localStorage.setItem(cacheKey, JSON.stringify({ value: 1 }));
    localStorage.setItem(metaKey, JSON.stringify({ timestamp: oldTimestamp, etag: 'old' }));

    const newData = { value: 2 };
    globalThis.fetch = jest.fn().mockResolvedValue({
      status: 200,
      json: async () => newData,
      headers: { get: () => null }
    });

    const result = await fetchWithCache(URL);

    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    expect(globalThis.fetch.mock.calls[0][1]).toEqual({ headers: {} });
    expect(result.data).toEqual(newData);
    expect(result.cacheStatus).toBe('fresh');
    expect(result.timestamp).toBe(new Date('2024-01-01T02:01:00Z').toISOString());
  });
});

