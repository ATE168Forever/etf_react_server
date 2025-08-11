export async function fetchWithCache(url) {
  const cacheKey = `cache:data:${url}`;
  const metaKey = `cache:meta:${url}`;
  const headers = {};
  let cachedMeta = null;

  try {
    const metaRaw = localStorage.getItem(metaKey);
    if (metaRaw) {
      cachedMeta = JSON.parse(metaRaw);
      if (cachedMeta.etag) {
        headers['If-None-Match'] = cachedMeta.etag;
      } else if (cachedMeta.lastModified) {
        headers['If-Modified-Since'] = cachedMeta.lastModified;
      }
    }
  } catch {
    // ignore parse errors
  }

  const response = await fetch(url, { headers });
  if (response.status === 200) {
    const data = await response.json();
    const etag = response.headers.get('ETag');
    const lastModified = response.headers.get('Last-Modified');
    const storedAt = new Date().toISOString();
    try {
      localStorage.setItem(cacheKey, JSON.stringify(data));
      localStorage.setItem(metaKey, JSON.stringify({ etag, lastModified, storedAt }));
    } catch {
      // localStorage may be unavailable or full
    }
    return { data, fromCache: false, meta: { etag, lastModified, storedAt } };
  }

  if (response.status === 304) {
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      try {
        if (!cachedMeta) {
          const metaRaw = localStorage.getItem(metaKey);
          if (metaRaw) cachedMeta = JSON.parse(metaRaw);
        }
      } catch {
        // ignore parse errors
      }
      return { data: JSON.parse(cached), fromCache: true, meta: cachedMeta };
    }
    throw new Error('No cached data available');
  }

  throw new Error(`HTTP error! status: ${response.status}`);
}
