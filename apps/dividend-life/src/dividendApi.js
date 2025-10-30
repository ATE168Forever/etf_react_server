import { API_HOST } from '@shared/config';
import { fetchWithCache, clearCache } from './api';
import { normalizeDividendResponse, DIVIDEND_YEARS } from './utils/dividendGoalUtils';

const DEFAULT_DIVIDEND_COUNTRIES = ['tw', 'us'];

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

function buildDividendUrl(yearOrOptions, maybeCountry) {
  const options = (yearOrOptions && typeof yearOrOptions === 'object' && !Array.isArray(yearOrOptions))
    ? yearOrOptions
    : { years: yearOrOptions, countries: maybeCountry };

  const params = new URLSearchParams();

  const normalizedYears = normalizeYearList(options?.years);
  if (normalizedYears.length) {
    params.set('year', normalizedYears.map(year => String(year)).join(','));
  }

  const normalizedCountries = normalizeCountryList(options?.countries);
  if (normalizedCountries.length) {
    params.set('country', normalizedCountries.join(','));
  }

  const stockId = typeof options?.stockId === 'string' ? options.stockId.trim() : '';
  if (stockId) {
    params.set('stock_id', stockId);
  }

  const fields = normalizeFieldsList(options?.fields);
  if (fields.length) {
    params.set('fields', fields.join(','));
  }

  const query = params.toString();
  return query ? `${API_HOST}/get_dividend?${query}` : `${API_HOST}/get_dividend`;
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

  if (!normalizedCountries.length && hasCountryInput) {
    normalizedCountries.push(...normalizeCountryList(DEFAULT_DIVIDEND_COUNTRIES));
  }

  return {
    years: normalizedYears,
    countries: normalizedCountries
  };
}

export async function fetchDividendsByYears(years, countries) {
  const { years: normalizedYears, countries: normalizedCountries } = buildFetchContext(years, countries);

  const requestCountries = normalizedCountries.length ? normalizedCountries : undefined;
  const yearsToFetch = normalizedYears.length ? normalizedYears : [undefined];

  const requests = yearsToFetch.map(async targetYear => {
    const url = buildDividendUrl({
      years: targetYear !== undefined ? targetYear : undefined,
      countries: requestCountries
    });

    const response = await fetchWithCache(url);
    const payload = response?.data ?? response ?? [];
    const data = normalizeDividendResponse(payload);

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

export function clearDividendsCache(years, countries) {
  const { years: normalizedYears, countries: normalizedCountries } = buildFetchContext(years, countries);

  const requestCountries = normalizedCountries.length ? normalizedCountries : undefined;
  const yearsToClear = normalizedYears.length ? normalizedYears : [undefined];

  yearsToClear.forEach(targetYear => {
    const url = buildDividendUrl({
      years: targetYear !== undefined ? targetYear : undefined,
      countries: requestCountries
    });

    clearCache(url);
  });
}

export function buildDividendRequestUrl(year, country, options = {}) {
  const normalizedYears = normalizeYearList(options?.years ?? year);
  const primaryYear = normalizedYears.length ? normalizedYears[0] : undefined;

  const mergedOptions = {
    years: primaryYear,
    countries: options?.countries ?? country,
    stockId: options?.stockId,
    fields: options?.fields
  };
  return buildDividendUrl(mergedOptions);
}

export { buildDividendUrl };
