function sanitizeUrl(value) {
  if (typeof value !== 'string') return '';
  const trimmed = value.trim();
  if (!trimmed || trimmed.toLowerCase() === 'undefined' || trimmed.toLowerCase() === 'null') {
    return '';
  }
  return trimmed.replace(/\/+$/, '');
}

const resolvedApiHost = sanitizeUrl(import.meta.env?.VITE_API_HOST);
const resolvedHostUrl = sanitizeUrl(import.meta.env?.VITE_HOST_URL);

if (import.meta.env?.DEV && !resolvedApiHost && typeof window !== 'undefined') {
  // eslint-disable-next-line no-console
  console.warn('[config] Missing VITE_API_HOST – API requests will fall back to the front-end origin.');
}

export const API_HOST = resolvedApiHost;
export const HOST_URL = resolvedHostUrl || resolvedApiHost;

