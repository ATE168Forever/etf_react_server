export async function fetchWithCache(url, maxAge = 10 * 60 * 60 * 1000) {
  // maxAge controls how long cached data is considered "fresh" before we label it stale.
  const cacheKey = `cache:data:${url}`;
  const metaKey = `cache:meta:${url}`;
  const headers = {};
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
  if (meta?.etag) {
    headers['If-None-Match'] = meta.etag;
  } else if (meta?.lastModified) {
    headers['If-Modified-Since'] = meta.lastModified;
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
    const data = await response.json();
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
    if (hasCachedData) {
      const etag = response.headers.get('ETag') || meta?.etag || null;
      const lastModified = response.headers.get('Last-Modified') || meta?.lastModified || null;
      const timestamp = new Date().toISOString();
      try {
        localStorage.setItem(metaKey, JSON.stringify({ etag, lastModified, timestamp }));
      } catch {
        // ignore write errors
      }
      return { data: cachedData, cacheStatus: 'cached', timestamp };
    }

    try {
      const revalidatedResponse = await fetch(url);

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
