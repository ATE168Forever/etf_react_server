export async function fetchWithCache(url, maxAge = 2 * 60 * 60 * 1000) {
  // maxAge controls how long cached data is considered "fresh" before we label it stale.
  const cacheKey = `cache:data:${url}`;
  const metaKey = `cache:meta:${url}`;
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
  let meta;
  let age = Infinity;
  let cachedTimestamp = null;
  let cachedData;
  let hasCachedData = false;

  try {
    const metaRaw = localStorage.getItem(metaKey);
    if (metaRaw) {
      meta = JSON.parse(metaRaw);
      if (meta?.timestamp) {
        cachedTimestamp = meta.timestamp;
        const cachedTime = new Date(meta.timestamp);
        if (!Number.isNaN(cachedTime.getTime())) {
          age = Date.now() - cachedTime.getTime();
        }
      }
    }
  } catch {
    // ignore parse errors
  }

  try {
    const raw = localStorage.getItem(cacheKey);
    if (raw !== null) {
      cachedData = JSON.parse(raw);
      hasCachedData = true;
    }
  } catch {
    // ignore storage or parse errors
    cachedData = undefined;
    hasCachedData = false;
  }

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
    response = await fetch(url, { headers });
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
    const contentType = (getHeader(response, 'Content-Type') || '').toLowerCase();
    const canReadText = typeof response.text === 'function';
    const canReadJson = typeof response.json === 'function';
    let rawBody = '';
    let data;

    if (canReadText) {
      rawBody = await response.text();
    }

    if (contentType && !contentType.includes('json')) {
      const error = new Error(
        `Expected JSON response from ${url} but received "${contentType || 'unknown'}". `
        + 'This usually means the API host is misconfigured or the request was routed to the front-end dev server.'
      );
      error.details = rawBody.slice(0, 200);
      throw error;
    }

    try {
      if (canReadText) {
        data = rawBody ? JSON.parse(rawBody) : null;
      } else if (canReadJson) {
        data = await response.json();
        try {
          rawBody = typeof data === 'string' ? data : JSON.stringify(data);
        } catch {
          rawBody = '[body-unavailable]';
        }
      } else {
        data = null;
        rawBody = '[body-unavailable]';
      }
    } catch (parseError) {
      const error = new Error(
        `Failed to parse JSON response from ${url}. `
        + 'Ensure the ETF Life API is reachable and returning valid JSON.'
      );
      error.cause = parseError;
      error.details = rawBody.slice(0, 200);
      throw error;
    }

    const etag = getHeader(response, 'ETag');
    const lastModified = getHeader(response, 'Last-Modified');
    const timestamp = new Date().toISOString();
    try {
      localStorage.setItem(cacheKey, JSON.stringify(data));
      localStorage.setItem(metaKey, JSON.stringify({ etag, lastModified, timestamp }));
    } catch {
      // localStorage may be unavailable or full
    }
    return { data, cacheStatus: 'fresh', timestamp };
  }

  if (response.status === 304) {
    if (hasCachedData && hasFreshCache) {
      const etag = getHeader(response, 'ETag') || meta?.etag || null;
      const lastModified = getHeader(response, 'Last-Modified') || meta?.lastModified || null;
      const timestamp = new Date().toISOString();
      try {
        localStorage.setItem(metaKey, JSON.stringify({ etag, lastModified, timestamp }));
      } catch {
        // ignore write errors
      }
      return { data: cachedData, cacheStatus: 'cached', timestamp };
    }

    try {
      const cacheBustValue = Date.now().toString();
      const cacheBustUrl = url.includes('?')
        ? `${url}&cacheBust=${cacheBustValue}`
        : `${url}?cacheBust=${cacheBustValue}`;
      const revalidatedResponse = await fetch(cacheBustUrl, { cache: 'no-store' });

      if (revalidatedResponse.status === 200) {
        const data = await revalidatedResponse.json();
        const etag = getHeader(revalidatedResponse, 'ETag');
        const lastModified = getHeader(revalidatedResponse, 'Last-Modified');
        const timestamp = new Date().toISOString();
        try {
          localStorage.setItem(cacheKey, JSON.stringify(data));
          localStorage.setItem(metaKey, JSON.stringify({ etag, lastModified, timestamp }));
        } catch {
          // ignore write errors
        }
        return { data, cacheStatus: 'fresh', timestamp };
      }

      if (revalidatedResponse.status === 304) {
        const timestamp = cachedTimestamp;
        return {
          data: cachedData,
          cacheStatus: 'stale',
          timestamp
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

  if (hasCachedData) {
    return {
      data: cachedData,
      cacheStatus: hasFreshCache ? 'cached' : 'stale',
      timestamp: cachedTimestamp
    };
  }

  throw new Error(`HTTP error! status: ${response.status}`);
}

export function clearCache(url) {
  try {
    localStorage.removeItem(`cache:data:${url}`);
    localStorage.removeItem(`cache:meta:${url}`);
  } catch {
    // ignore errors
  }
}
