export async function fetchWithCache(url) {
  const MAX_AGE = 2 * 60 * 60 * 1000; // 2 hours
  const cacheKey = `cache:data:${url}`;
  const metaKey = `cache:meta:${url}`;
  const headers = {};
  let meta;
  let age = Infinity;

  try {
    const metaRaw = localStorage.getItem(metaKey);
    if (metaRaw) {
      meta = JSON.parse(metaRaw);
      if (meta.timestamp) {
        age = Date.now() - new Date(meta.timestamp).getTime();
        if (age < MAX_AGE) {
          const cached = localStorage.getItem(cacheKey);
          if (cached) {
            return { data: JSON.parse(cached), cacheStatus: 'cached', timestamp: meta.timestamp };
          }
        }
      }
    }
  } catch {
    // ignore parse errors
  }

  if (meta?.etag && age < MAX_AGE) {
    headers['If-None-Match'] = meta.etag;
  } else if (meta?.lastModified && age < MAX_AGE) {
    headers['If-Modified-Since'] = meta.lastModified;
  }

  let response;
  try {
    response = await fetch(url, { headers });
  } catch (err) {
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      return { data: JSON.parse(cached), cacheStatus: 'stale', timestamp: meta?.timestamp || null };
    }
    throw err;
  }

  if (response.status === 200) {
    const data = await response.json();
    const etag = response.headers.get('ETag');
    const lastModified = response.headers.get('Last-Modified');
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
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      const etag = response.headers.get('ETag') || meta?.etag || null;
      const lastModified = response.headers.get('Last-Modified') || meta?.lastModified || null;
      const timestamp = new Date().toISOString();
      try {
        localStorage.setItem(
          metaKey,
          JSON.stringify({ etag, lastModified, timestamp })
        );
      } catch {
        // ignore write errors
      }
      return { data: JSON.parse(cached), cacheStatus: 'cached', timestamp };
    }
    throw new Error('No cached data available');
  }

  const cached = localStorage.getItem(cacheKey);
  if (cached) {
    return { data: JSON.parse(cached), cacheStatus: 'stale', timestamp: meta?.timestamp || null };
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
