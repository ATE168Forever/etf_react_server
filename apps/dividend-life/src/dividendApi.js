import { API_HOST } from '../config';
import { clearCache } from './api';
import { normalizeDividendResponse, DIVIDEND_YEARS } from './utils/dividendGoalUtils';
import { parseJSONResponse } from './utils/safeFetchJSON';
import { buildKeyBase, readEntry, writeEntry, removeEntry, sweepInvalidEntries } from './utils/localCacheStore';

const DEFAULT_DIVIDEND_COUNTRIES = ['tw', 'us'];
const CHUNK_THRESHOLD = 50;  // chunk when more than 50 IDs to keep URLs under ~2 KB
const CHUNK_SIZE = 80;       // 80 IDs × ~13 chars = ~1 KB per request
const CONCURRENCY = 4;

function toArray(value) {
  if (Array.isArray(value)) return value;
  if (value === undefined || value === null) return [];
  return [value];
}

function normalizeCountryCode(country) {
  if (typeof country === 'string') {
    const trimmed = country.trim();
    if (trimmed) {
      return trimmed.toLowerCase();
    }
  }
  return '';
}

function normalizeCountryList(input) {
  const values = toArray(input)
    .map(country => normalizeCountryCode(country))
    .filter(Boolean);
  return Array.from(new Set(values));
}

function normalizeYearList(input) {
  const values = toArray(input)
    .map(year => Number(year))
    .filter(year => Number.isFinite(year));
  return Array.from(new Set(values));
}

function normalizeFieldsList(input) {
  const values = toArray(input)
    .map(field => (typeof field === 'string' ? field.trim() : ''))
    .filter(Boolean);
  return Array.from(new Set(values));
}

function normalizeStockIds(input) {
  if (input === undefined || input === null) return [];
  if (typeof input === 'string') {
    const trimmed = input.trim();
    if (!trimmed) return [];
    if (trimmed.toLowerCase() === 'all') return 'all';
    return [trimmed];
  }
  const values = toArray(input)
    .map(value => (typeof value === 'string' ? value.trim() : ''))
    .filter(Boolean);
  if (values.some(value => value.toLowerCase() === 'all')) {
    return 'all';
  }
  return Array.from(new Set(values));
}

function buildDividendUrl() {
  return `${API_HOST}/get_dividend`;
}

function buildFetchContext(years, countries) {
  const hasYearInput = years !== undefined;
  const hasCountryInput = countries !== undefined;

  const normalizedYears = hasYearInput
    ? normalizeYearList(years)
    : [];
  const normalizedCountries = hasCountryInput
    ? normalizeCountryList(countries)
    : [];

  if (!normalizedYears.length && hasYearInput) {
    normalizedYears.push(...normalizeYearList(DIVIDEND_YEARS));
  }

  if (!normalizedCountries.length) {
    normalizedCountries.push(...normalizeCountryList(DEFAULT_DIVIDEND_COUNTRIES));
  }

  return {
    years: normalizedYears,
    countries: normalizedCountries
  };
}

function chunkArray(input = [], size = CHUNK_SIZE) {
  if (!Array.isArray(input) || input.length === 0) return [];
  const safeSize = Number.isFinite(size) && size > 0 ? Math.floor(size) : CHUNK_SIZE;
  const out = [];
  for (let i = 0; i < input.length; i += safeSize) {
    out.push(input.slice(i, i + safeSize));
  }
  return out;
}

async function runTaskPool(tasks = [], limit = CONCURRENCY) {
  if (!Array.isArray(tasks) || tasks.length === 0) return [];
  const results = new Array(tasks.length);
  let index = 0;
  const workerCount = Math.min(tasks.length, Math.max(1, limit));
  const workers = new Array(workerCount).fill(null).map(async () => {
    while (index < tasks.length) {
      const current = index;
      index += 1;
      results[current] = await tasks[current]();
    }
  });
  await Promise.all(workers);
  return results;
}

function mergeDividendItems(responses = []) {
  const map = new Map();
  responses.forEach(data => {
    const items = normalizeDividendResponse(data);
    items.forEach(item => {
      if (!item) return;
      const key = `${item.stock_id ?? ''}|${item.dividend_date ?? ''}|${item.payment_date ?? ''}`;
      if (!map.has(key)) {
        map.set(key, item);
      }
    });
  });
  return Array.from(map.values()).sort((a, b) => {
    const dateA = a?.dividend_date || a?.payment_date || '';
    const dateB = b?.dividend_date || b?.payment_date || '';
    const da = new Date(dateA || '1970-01-01');
    const db = new Date(dateB || '1970-01-01');
    const diff = da - db;
    if (diff !== 0) return diff;
    const stockA = String(a?.stock_id ?? '');
    const stockB = String(b?.stock_id ?? '');
    return stockA.localeCompare(stockB);
  });
}

const DEFAULT_CACHE_MAX_AGE = 2 * 60 * 60 * 1000;

async function executeDividendRequest(url, payload) {
  // Explicitly prevent conditional request headers to avoid 304 responses
  const headers = {
    Accept: 'application/json',
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    Pragma: 'no-cache'
  };

  let requestUrl = url;
  if (payload) {
    const params = new URLSearchParams();
    Object.entries(payload).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        value.forEach(v => params.append(key, v));
      } else if (value !== undefined && value !== null) {
        params.append(key, value);
      }
    });
    const queryString = params.toString();
    if (queryString) {
      requestUrl = `${url}?${queryString}`;
    }
  }

  const response = await fetch(requestUrl, {
    method: 'GET',
    headers,
    cache: 'no-store'  // Completely bypass browser cache
  });

  const result = await parseJSONResponse(response, requestUrl);
  return result;
}

async function fetchWithCache(url, payload, maxAge = DEFAULT_CACHE_MAX_AGE, options = {}) {
  const { useCache = true } = options;
  if (!useCache) {
    const data = await executeDividendRequest(url, payload);
    const timestamp = new Date().toISOString();
    return {
      data,
      cacheStatus: 'fresh',
      timestamp
    };
  }

  const cacheKeyBase = buildKeyBase(url, payload);
  const { hasCachedData, cachedData, cachedTimestamp, age } = readEntry(cacheKeyBase);

  const hasFreshCache = hasCachedData && age < maxAge;
  // Cache is valid if we have a cached response (even with 0 items); null/undefined means no cache
  const hasValidCachedItems = hasCachedData && cachedData !== null && cachedData !== undefined;
  if (hasFreshCache && hasValidCachedItems) {
    return {
      data: cachedData,
      cacheStatus: 'cached',
      timestamp: cachedTimestamp
    };
  }

  try {
    const data = await executeDividendRequest(url, payload);
    const timestamp = new Date().toISOString();
    writeEntry(cacheKeyBase, data, { timestamp });
    return {
      data,
      cacheStatus: 'fresh',
      timestamp
    };
  } catch (error) {
    // Fall back to cache if we have any cached data
    if (hasCachedData) {
      return {
        data: cachedData,
        cacheStatus: age < maxAge ? 'cached' : 'stale',
        timestamp: cachedTimestamp
      };
    }
    throw error;
  }
}

function clearFetchCache(url, payload) {
  removeEntry(buildKeyBase(url, payload));
}

async function fetchDividendWithChunks(url, basePayload, stockIds, options = {}) {
  const { useCache = true } = options;
  if (!Array.isArray(stockIds) || stockIds.length === 0 || stockIds.length <= CHUNK_THRESHOLD) {
    const result = await fetchWithCache(url, basePayload, DEFAULT_CACHE_MAX_AGE, { useCache });
    return result;
  }

  const base = basePayload ? { ...basePayload } : {};
  const chunks = chunkArray(stockIds, CHUNK_SIZE);
  const tasks = chunks.map(chunk => () => {
    const payload = { ...base, stock_ids: chunk };
    if (useCache) {
      return fetchWithCache(url, payload, DEFAULT_CACHE_MAX_AGE, { useCache: true });
    }
    return fetchWithCache(url, payload, DEFAULT_CACHE_MAX_AGE, { useCache: false });
  });
  const responses = await runTaskPool(tasks, CONCURRENCY);

  const dataSets = responses.map(res => res?.data);
  const mergedItems = mergeDividendItems(dataSets);

  const cacheStatuses = responses
    .map(res => res?.cacheStatus)
    .filter(status => typeof status === 'string' && status.length > 0);
  const uniqueStatuses = new Set(cacheStatuses);
  const aggregatedStatus = uniqueStatuses.size === 0
    ? null
    : uniqueStatuses.size === 1
      ? cacheStatuses[0]
      : 'mixed';

  const latestTimestamp = responses.reduce((latest, res) => {
    const ts = res?.timestamp;
    if (!ts) return latest;
    if (!latest) return ts;
    return ts > latest ? ts : latest;
  }, null);

  return {
    data: { items: mergedItems },
    cacheStatus: aggregatedStatus,
    timestamp: latestTimestamp
  };
}

function buildDividendPayload({ targetYear, countries, stockIds, fields }) {
  const payload = {};

  if (targetYear !== undefined && targetYear !== null) {
    const numeric = Number(targetYear);
    if (Number.isFinite(numeric)) {
      payload.year = [numeric];
    }
  }

  if (Array.isArray(countries) && countries.length) {
    payload.country = countries;
  }

  if (Array.isArray(stockIds) && stockIds.length) {
    payload.stock_ids = stockIds;
  }

  if (Array.isArray(fields) && fields.length) {
    payload.fields = fields;
  }

  return Object.keys(payload).length ? payload : null;
}

export async function fetchDividendsByYears(years, countries, options = {}) {
  const { years: normalizedYears, countries: normalizedCountries } = buildFetchContext(years, countries);
  const normalizedStockIds = normalizeStockIds(options?.stockIds);
  const normalizedFields = normalizeFieldsList(options?.fields);
  const forceRefresh = Boolean(options?.forceRefresh);
  const stockIdArray = Array.isArray(normalizedStockIds) ? normalizedStockIds : [];

  const requestCountries = normalizedCountries.length ? normalizedCountries : normalizeCountryList(DEFAULT_DIVIDEND_COUNTRIES);
  const yearsToFetch = normalizedYears.length ? normalizedYears : [undefined];

  const requests = yearsToFetch.map(async targetYear => {
    const url = buildDividendUrl();
    const payload = buildDividendPayload({
      targetYear,
      countries: requestCountries,
      stockIds: (Array.isArray(normalizedStockIds) && stockIdArray.length > CHUNK_THRESHOLD)
        ? []
        : (normalizedStockIds === 'all' ? [] : stockIdArray),
      fields: normalizedFields
    });

    const response = await fetchDividendWithChunks(
      url,
      payload,
      stockIdArray,
      { useCache: !forceRefresh }
    );
    const responsePayload = response?.data ?? response ?? [];
    const data = normalizeDividendResponse(responsePayload);

    const numericYear = targetYear === undefined ? null : Number(targetYear);
    const yearValue = Number.isFinite(numericYear) ? numericYear : null;
    const metaEntry = {
      year: yearValue,
      years: yearValue !== null ? [yearValue] : null,
      country: normalizedCountries.length === 1 ? normalizedCountries[0].toUpperCase() : null,
      countries: normalizedCountries.length
        ? normalizedCountries.map(code => code.toUpperCase())
        : null,
      cacheStatus: response?.cacheStatus || null,
      timestamp: response?.timestamp || null
    };

    return { data, metaEntry };
  });

  const results = await Promise.all(requests);

  const combinedData = results.flatMap(result => result.data);
  const perRequestMeta = results.map(result => result.metaEntry);

  let meta;
  if (normalizedYears.length > 1) {
    const cacheStatuses = perRequestMeta
      .map(entry => entry.cacheStatus)
      .filter(status => typeof status === 'string' && status.length > 0);
    const uniqueStatuses = new Set(cacheStatuses);
    const aggregatedStatus = uniqueStatuses.size === 0
      ? null
      : uniqueStatuses.size === 1
        ? cacheStatuses[0]
        : 'mixed';

    const latestTimestamp = perRequestMeta.reduce((latest, entry) => {
      if (!entry.timestamp) return latest;
      if (!latest) return entry.timestamp;
      return entry.timestamp > latest ? entry.timestamp : latest;
    }, null);

    const aggregatedMeta = {
      year: null,
      years: [...normalizedYears],
      country: normalizedCountries.length === 1 ? normalizedCountries[0].toUpperCase() : null,
      countries: normalizedCountries.length
        ? normalizedCountries.map(code => code.toUpperCase())
        : null,
      cacheStatus: aggregatedStatus,
      timestamp: latestTimestamp
    };

    meta = [aggregatedMeta, ...perRequestMeta];
  } else {
    meta = perRequestMeta;
  }

  return {
    data: combinedData,
    meta
  };
}

// Clear all dividend-related localStorage cache entries that are unparseable/invalid,
// plus any leftover pre-v1 (unversioned) cache keys.
export function clearEmptyDividendCaches() {
  try {
    const removedCount = sweepInvalidEntries();
    if (removedCount > 0) {
      console.log('[dividendApi] Cleared', removedCount, 'invalid/unparseable cache entries');
    }
  } catch (e) {
    console.warn('[dividendApi] Failed to clear empty caches:', e);
  }
}

export function clearDividendsCache(years, countries, options = {}) {
  const { years: normalizedYears, countries: normalizedCountries } = buildFetchContext(years, countries);

  const requestCountries = normalizedCountries.length ? normalizedCountries : normalizeCountryList(DEFAULT_DIVIDEND_COUNTRIES);
  const yearsToClear = normalizedYears.length ? normalizedYears : [undefined];
  const normalizedStockIds = normalizeStockIds(options?.stockIds);
  const normalizedFields = normalizeFieldsList(options?.fields);
  const stockIdArray = Array.isArray(normalizedStockIds) ? normalizedStockIds : [];
  const shouldChunk = stockIdArray.length > CHUNK_THRESHOLD;

  yearsToClear.forEach(targetYear => {
    const url = buildDividendUrl();
    const payload = buildDividendPayload({
      targetYear,
      countries: requestCountries,
      stockIds: shouldChunk ? [] : (normalizedStockIds === 'all' ? [] : stockIdArray),
      fields: normalizedFields
    });

    clearCache(url);
    if (shouldChunk) {
      const base = payload ? { ...payload } : {};
      const chunks = chunkArray(stockIdArray, CHUNK_SIZE);
      chunks.forEach(chunk => {
        clearFetchCache(url, { ...base, stock_ids: chunk });
      });
      clearFetchCache(url, payload);
    } else {
      clearFetchCache(url, payload);
    }
  });
}

export function buildDividendRequestUrl() {
  return buildDividendUrl();
}

export async function fetchDividend({ stockIds, year, country = DEFAULT_DIVIDEND_COUNTRIES, fields } = {}) {
  const { data } = await fetchDividendsByYears(
    year,
    country,
    { stockIds, fields }
  );
  return { items: data };
}

export { buildDividendUrl };
