export async function fetchWithCache(url) {
  const cacheKey = `cache:data:${url}`;
  const metaKey = `cache:meta:${url}`;
  const headers = {};
  let meta;

  try {
    const metaRaw = localStorage.getItem(metaKey);
    if (metaRaw) {
      meta = JSON.parse(metaRaw);
      if (meta.etag) {
        headers['If-None-Match'] = meta.etag;
      } else if (meta.lastModified) {
        headers['If-Modified-Since'] = meta.lastModified;
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
      return { data: JSON.parse(cached), cacheStatus: 'cached', timestamp: meta?.timestamp || null };
    }
    throw new Error('No cached data available');
  }

  throw new Error(`HTTP error! status: ${response.status}`);
}
