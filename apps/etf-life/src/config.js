const env = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env : {};

const normalize = (value) => {
  if (typeof value !== 'string') return '';
  const trimmed = value.trim();
  return trimmed.endsWith('/') ? trimmed.replace(/\/+$/, '') : trimmed;
};

const fallbackOrigin = () => {
  if (typeof window === 'undefined' || !window.location || !window.location.origin) {
    return '';
  }
  return window.location.origin;
};

export const API_HOST = normalize(env.VITE_API_HOST) || fallbackOrigin();
export const HOST_URL = normalize(env.VITE_HOST_URL) || fallbackOrigin();
