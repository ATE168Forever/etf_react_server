const MAX_BODY_PREVIEW = 200;

function formatBodyPreview(body) {
  if (typeof body !== 'string') {
    return '';
  }
  if (body.length <= MAX_BODY_PREVIEW) {
    return body;
  }
  return body.slice(0, MAX_BODY_PREVIEW);
}

function isResponseOk(response) {
  if (typeof response?.ok === 'boolean') {
    return response.ok;
  }
  const status = typeof response?.status === 'number' ? response.status : 0;
  return status >= 200 && status < 300;
}

async function readBodyText(response) {
  if (response && typeof response.text === 'function') {
    return response.text();
  }
  if (response && typeof response.json === 'function') {
    try {
      const value = await response.json();
      return typeof value === 'string' ? value : JSON.stringify(value);
    } catch {
      return '';
    }
  }
  return '';
}

export async function parseJSONResponse(response, url) {
  const contentType = response?.headers?.get?.('content-type') || response?.headers?.['content-type'] || '';
  const body = await readBodyText(response);
  const status = typeof response?.status === 'number' ? response.status : 0;
  const statusText = typeof response?.statusText === 'string' ? response.statusText : '';

  if (!isResponseOk(response)) {
    throw new Error(
      `HTTP ${status} ${statusText} @ ${url}\n` +
        `content-type=${contentType || 'unknown'}\n` +
        `body: ${formatBodyPreview(body)}`
    );
  }

  if (!String(contentType).toLowerCase().includes('application/json')) {
    throw new Error(
      `Expected JSON but got ${contentType || 'unknown'} @ ${url}\n` +
        `body: ${formatBodyPreview(body)}`
    );
  }

  try {
    const parsed = JSON.parse(body);
    return parsed;
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown parse error';
    throw new Error(
      `Invalid JSON @ ${url}: ${message}\n` +
        `body: ${formatBodyPreview(body)}`
    );
  }
}

export async function safeFetchJSON(url, init) {
  const response = await fetch(url, init);
  return parseJSONResponse(response, url);
}
