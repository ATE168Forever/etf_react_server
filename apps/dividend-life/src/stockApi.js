import { API_HOST } from '@shared/config';
import { fetchWithCache } from './api';

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

function normalizeFieldsList(fields) {
  if (!fields) return [];
  if (typeof fields === 'string') {
    return fields
      .split(',')
      .map(value => value.trim())
      .filter(Boolean);
  }
  if (Array.isArray(fields)) {
    return fields
      .map(value => (typeof value === 'string' ? value.trim() : ''))
      .filter(Boolean);
  }
  return [];
}

function buildStockListUrl(options = {}) {
  const params = new URLSearchParams();
  const fields = normalizeFieldsList(options.fields);
  if (fields.length) {
    params.set('fields', fields.join(','));
  }
  const queryString = params.toString();
  if (queryString) {
    return `${API_HOST}/get_stock_list?${queryString}`;
  }
  return `${API_HOST}/get_stock_list`;
}

export async function fetchStockList(options = {}) {
  const url = buildStockListUrl(options);
  const result = await fetchWithCache(url);
  const { data, cacheStatus, timestamp } = result;
  const entries = normalizeStockListResponse(data);

  const list = [];
  const indexByStockId = new Map();

  entries.forEach(item => {
    if (!item || !item.stock_id) return;
    const stockCountry = normalizeCountryCode(item.country, 'tw');
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

  const meta = {
    cacheStatus: cacheStatus ?? null,
    timestamp: timestamp ?? null
  };

  return { list, meta };
}

export function clearStockListCache(options = {}) {
  const url = buildStockListUrl(options);
  try {
    localStorage.removeItem(`cache:data:${url}`);
    localStorage.removeItem(`cache:meta:${url}`);
  } catch {
    // ignore storage errors
  }
}
