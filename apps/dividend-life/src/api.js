import { parseJSONResponse } from './utils/safeFetchJSON';
import { buildKeyBase, readEntry, writeEntry, removeEntry } from './utils/localCacheStore';

export async function fetchWithCache(url, maxAge = 2 * 60 * 60 * 1000, options = {}) {
  // maxAge controls how long cached data is considered "fresh" before we label it stale.
  const { signal } = options;
  const keyBase = buildKeyBase(url);
  const getHeader = (res, key) => {
    if (!res || !res.headers) return null;
    if (typeof res.headers.get === 'function') {
      try {
        return res.headers.get(key);
      } catch {
        return null;
      }
    }
    return res.headers?.[key] ?? null;
  };

  const { hasCachedData, cachedData, meta, cachedTimestamp, age } = readEntry(keyBase);

  const hasFreshCache = hasCachedData && age < maxAge;
  const shouldSendValidators = hasFreshCache || (hasCachedData && age < maxAge * 2);
  const headers = {};
  if (shouldSendValidators) {
    if (meta?.etag) {
      headers['If-None-Match'] = meta.etag;
    } else if (meta?.lastModified) {
      headers['If-Modified-Since'] = meta.lastModified;
    }
  }

  let response;
  try {
    response = await fetch(url, { headers, ...(signal ? { signal } : {}) });
  } catch (err) {
    if (hasCachedData) {
      return {
        data: cachedData,
        cacheStatus: hasFreshCache ? 'cached' : 'stale',
        timestamp: cachedTimestamp
      };
    }
    throw err;
  }

  if (response.status === 200) {
    const data = await parseJSONResponse(response, url);
    const etag = getHeader(response, 'ETag');
    const lastModified = getHeader(response, 'Last-Modified');
    const timestamp = new Date().toISOString();
    writeEntry(keyBase, data, { etag, lastModified, timestamp });
    return { data, cacheStatus: 'fresh', timestamp };
  }

  if (response.status === 304) {
    if (hasCachedData && hasFreshCache) {
      const etag = getHeader(response, 'ETag') || meta?.etag || null;
      const lastModified = getHeader(response, 'Last-Modified') || meta?.lastModified || null;
      const timestamp = new Date().toISOString();
      writeEntry(keyBase, cachedData, { etag, lastModified, timestamp });
      return { data: cachedData, cacheStatus: 'cached', timestamp };
    }

    try {
      const cacheBustValue = Date.now().toString();
      const cacheBustUrl = url.includes('?')
        ? `${url}&cacheBust=${cacheBustValue}`
        : `${url}?cacheBust=${cacheBustValue}`;
      const revalidatedResponse = await fetch(cacheBustUrl, { cache: 'no-store', ...(signal ? { signal } : {}) });

      if (revalidatedResponse.status === 200) {
        const data = await parseJSONResponse(revalidatedResponse, cacheBustUrl);
        const etag = getHeader(revalidatedResponse, 'ETag');
        const lastModified = getHeader(revalidatedResponse, 'Last-Modified');
        const timestamp = new Date().toISOString();
        writeEntry(keyBase, data, { etag, lastModified, timestamp });
        return { data, cacheStatus: 'fresh', timestamp };
      }

      if (revalidatedResponse.status === 304) {
        return {
          data: cachedData,
          cacheStatus: 'stale',
          timestamp: cachedTimestamp
        };
      }
    } catch {
      // network errors fall through to stale cache below
    }

    return {
      data: cachedData,
      cacheStatus: 'stale',
      timestamp: cachedTimestamp
    };
  }

  // 4xx errors indicate a problem with the request — don't silently serve stale data
  if (response.status >= 400 && response.status < 500) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  // 5xx/unexpected: serve stale if available (transient server error)
  if (hasCachedData) {
    return {
      data: cachedData,
      cacheStatus: 'stale',
      timestamp: cachedTimestamp
    };
  }

  throw new Error(`HTTP error! status: ${response.status}`);
}

export function clearCache(url) {
  removeEntry(buildKeyBase(url));
}
