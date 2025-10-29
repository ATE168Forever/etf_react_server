/* eslint-env jest */
import { fetchWithCache } from '../src/api';

function createMockResponse({ status = 200, body = {}, headers = {} } = {}) {
  const resolvedBody = body === undefined ? {} : body;
  const textValue = typeof resolvedBody === 'string' ? resolvedBody : JSON.stringify(resolvedBody);
  const normalizedHeaders = Object.fromEntries(
    Object.entries(headers).map(([key, value]) => [key.toLowerCase(), value])
  );

  return {
    status,
    ok: status >= 200 && status < 300,
    statusText: status === 304 ? 'Not Modified' : 'OK',
    headers: {
      get: key => normalizedHeaders[key.toLowerCase()] ?? null
    },
    text: jest.fn().mockResolvedValue(textValue)
  };
}

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

  test('revalidates cached data when not expired', async () => {
    jest.useFakeTimers();
    const timestamp = new Date('2024-01-01T00:00:00Z').toISOString();
    jest.setSystemTime(new Date('2024-01-01T01:00:00Z'));
    localStorage.setItem(cacheKey, JSON.stringify({ value: 1 }));
    localStorage.setItem(metaKey, JSON.stringify({ timestamp, etag: 'etag-1' }));
    globalThis.fetch = jest.fn().mockResolvedValue({
      status: 304,
      headers: { get: () => null }
    });

    const result = await fetchWithCache(URL);

    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    expect(globalThis.fetch).toHaveBeenCalledWith(URL, {
      headers: { 'If-None-Match': 'etag-1' }
    });
    expect(result.data).toEqual({ value: 1 });
    expect(result.cacheStatus).toBe('cached');
    expect(result.timestamp).toBe(new Date('2024-01-01T01:00:00Z').toISOString());
  });

  test('fetches new data when cache expired', async () => {
    jest.useFakeTimers();
    const oldTimestamp = new Date('2024-01-01T00:00:00Z').toISOString();
    jest.setSystemTime(new Date('2024-01-01T02:01:00Z'));
    localStorage.setItem(cacheKey, JSON.stringify({ value: 1 }));
    localStorage.setItem(metaKey, JSON.stringify({ timestamp: oldTimestamp, etag: 'old' }));

    const newData = { value: 2 };
    globalThis.fetch = jest
      .fn()
      .mockResolvedValue(
        createMockResponse({
          status: 200,
          body: newData,
          headers: { 'content-type': 'application/json' }
        })
      );

    const result = await fetchWithCache(URL);

    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    expect(globalThis.fetch.mock.calls[0][1]).toEqual({
      headers: { 'If-None-Match': 'old' }
    });
    expect(result.data).toEqual(newData);
    expect(result.cacheStatus).toBe('fresh');
    expect(result.timestamp).toBe(new Date('2024-01-01T02:01:00Z').toISOString());
  });

  test('forces unconditional refetch when stale cache receives 304', async () => {
    jest.useFakeTimers();
    const oldTimestamp = new Date('2024-01-01T00:00:00Z').toISOString();
    jest.setSystemTime(new Date('2024-01-02T00:00:00Z'));
    const cachedValue = { value: 1 };
    const newPayload = { value: 3 };

    localStorage.setItem(cacheKey, JSON.stringify(cachedValue));
    localStorage.setItem(metaKey, JSON.stringify({ timestamp: oldTimestamp, etag: 'stale-etag' }));

    globalThis.fetch = jest
      .fn()
      .mockResolvedValueOnce(
        createMockResponse({
          status: 304,
          headers: { 'content-type': 'application/json' }
        })
      )
      .mockResolvedValueOnce(
        createMockResponse({
          status: 200,
          body: newPayload,
          headers: { 'content-type': 'application/json' }
        })
      );

    const result = await fetchWithCache(URL);

    expect(globalThis.fetch).toHaveBeenCalledTimes(2);
    expect(globalThis.fetch).toHaveBeenNthCalledWith(1, URL, {
      headers: {}
    });

    const cacheBust = new Date('2024-01-02T00:00:00Z').getTime().toString();
    expect(globalThis.fetch).toHaveBeenNthCalledWith(2, `${URL}?cacheBust=${cacheBust}`, {
      cache: 'no-store'
    });
    expect(result.data).toEqual(newPayload);
    expect(result.cacheStatus).toBe('fresh');
    expect(result.timestamp).toBe(new Date('2024-01-02T00:00:00Z').toISOString());
    expect(JSON.parse(localStorage.getItem(cacheKey))).toEqual(newPayload);
  });

  test('falls back to stale cache on fetch error', async () => {
    jest.useFakeTimers();
    const timestamp = new Date('2024-01-01T00:00:00Z').toISOString();
    jest.setSystemTime(new Date('2024-01-01T02:01:00Z'));
    localStorage.setItem(cacheKey, JSON.stringify({ value: 1 }));
    localStorage.setItem(metaKey, JSON.stringify({ timestamp }));

    globalThis.fetch = jest.fn().mockRejectedValue(new Error('Network error'));

    const result = await fetchWithCache(URL);

    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ data: { value: 1 }, cacheStatus: 'stale', timestamp });
  });
});

