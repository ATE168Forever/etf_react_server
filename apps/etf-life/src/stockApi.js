import { API_HOST } from './config';
import { fetchWithCache } from './api';

export const DEFAULT_STOCK_COUNTRIES = ['tw', 'us'];

export function normalizeStockListResponse(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.items)) return payload.items;
  return [];
}

function normalizeCountryCode(country, fallback = 'TW') {
  if (typeof country === 'string') {
    const trimmed = country.trim();
    if (trimmed) {
      return trimmed.toUpperCase();
    }
  }
  return fallback.toUpperCase();
}

function buildStockListUrl(country) {
  const normalized = typeof country === 'string' ? country.trim().toLowerCase() : '';
  const target = normalized || 'tw';
  const params = new URLSearchParams({ country: target });
  return `${API_HOST}/get_stock_list?${params.toString()}`;
}

export async function fetchStockList({ countries = DEFAULT_STOCK_COUNTRIES } = {}) {
  const requested = Array.isArray(countries) ? countries : [countries];
  const normalizedCountries = Array.from(new Set(
    requested
      .map(country => (typeof country === 'string' ? country.trim().toLowerCase() : ''))
      .filter(Boolean)
  ));

  if (!normalizedCountries.length) {
    normalizedCountries.push('tw');
  }

  const requests = normalizedCountries.map(country => fetchWithCache(buildStockListUrl(country)));
  const results = await Promise.allSettled(requests);

  const list = [];
  const indexByStockId = new Map();
  const meta = [];

  results.forEach((result, index) => {
    if (result.status !== 'fulfilled') {
      return;
    }

    const country = normalizedCountries[index];
    const normalizedCountry = normalizeCountryCode(country, 'tw');
    const { data, cacheStatus, timestamp } = result.value;
    const entries = normalizeStockListResponse(data);

    entries.forEach(item => {
      if (!item || !item.stock_id) return;
      const stockCountry = normalizeCountryCode(item.country, normalizedCountry);
      const existingIndex = indexByStockId.get(item.stock_id);
      if (existingIndex !== undefined) {
        const existing = list[existingIndex];
        list[existingIndex] = {
          ...existing,
          ...item,
          country: existing.country || stockCountry
        };
      } else {
        indexByStockId.set(item.stock_id, list.length);
        list.push({ ...item, country: stockCountry });
      }
    });

    meta.push({
      country: normalizedCountry,
      cacheStatus: cacheStatus ?? null,
      timestamp: timestamp ?? null
    });
  });

  if (!meta.length) {
    const rejection = results.find(res => res.status === 'rejected');
    if (rejection?.reason) {
      throw rejection.reason;
    }
    throw new Error('Failed to fetch stock list');
  }

  return { list, meta };
}

export function clearStockListCache(countries = DEFAULT_STOCK_COUNTRIES) {
  const targets = Array.isArray(countries) ? countries : [countries];
  targets
    .map(country => (typeof country === 'string' ? country.trim().toLowerCase() : ''))
    .filter(Boolean)
    .forEach(country => {
      const url = buildStockListUrl(country);
      try {
        localStorage.removeItem(`cache:data:${url}`);
        localStorage.removeItem(`cache:meta:${url}`);
      } catch {
        // ignore storage errors
      }
    });
}
