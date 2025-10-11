import { API_HOST } from './config';
import { fetchWithCache, clearCache } from './api';
import { normalizeDividendResponse, DIVIDEND_YEARS } from './utils/dividendGoalUtils';

const DEFAULT_DIVIDEND_COUNTRIES = ['tw', 'us'];

function normalizeCountryCode(country, fallback = 'tw') {
  if (typeof country === 'string') {
    const trimmed = country.trim();
    if (trimmed) {
      return trimmed.toLowerCase();
    }
  }
  return fallback.toLowerCase();
}

function buildDividendUrl(year, country) {
  const params = new URLSearchParams();
  params.set('year', String(year));
  const normalizedCountry = normalizeCountryCode(country, 'tw');
  params.set('country', normalizedCountry);
  return `${API_HOST}/get_dividend?${params.toString()}`;
}

export async function fetchDividendsByYears(years = DIVIDEND_YEARS, countries = DEFAULT_DIVIDEND_COUNTRIES) {
  const requestedYears = Array.isArray(years) ? years : [years];
  const uniqueYears = Array.from(new Set(requestedYears.map(year => Number(year)).filter(year => !Number.isNaN(year))));
  const requestedCountries = Array.isArray(countries) ? countries : [countries];
  const normalizedCountries = Array.from(new Set(requestedCountries.map(country => normalizeCountryCode(country)).filter(Boolean)));

  if (!normalizedCountries.length) {
    normalizedCountries.push('tw');
  }

  const combinations = normalizedCountries.flatMap(country =>
    uniqueYears.map(year => ({ year, country, request: fetchWithCache(buildDividendUrl(year, country)) }))
  );

  const results = await Promise.allSettled(combinations.map(entry => entry.request));

  const fulfilled = results
    .map((result, index) => (result.status === 'fulfilled'
      ? {
          year: combinations[index].year,
          country: combinations[index].country.toUpperCase(),
          ...result.value
        }
      : null))
    .filter(Boolean);

  if (!fulfilled.length) {
    const firstRejection = results.find(result => result.status === 'rejected');
    if (firstRejection?.reason) throw firstRejection.reason;
    throw new Error('Failed to fetch dividend data');
  }

  const data = fulfilled.flatMap(({ data }) => normalizeDividendResponse(data));
  const meta = fulfilled.map(({ year, country, cacheStatus, timestamp }) => ({
    year,
    country,
    cacheStatus: cacheStatus || null,
    timestamp: timestamp || null
  }));

  return { data, meta };
}

export function clearDividendsCache(years = DIVIDEND_YEARS, countries = DEFAULT_DIVIDEND_COUNTRIES) {
  const requestedYears = Array.isArray(years) ? years : [years];
  const uniqueYears = Array.from(new Set(requestedYears.map(year => Number(year)).filter(year => !Number.isNaN(year))));
  const requestedCountries = Array.isArray(countries) ? countries : [countries];
  const normalizedCountries = Array.from(new Set(requestedCountries.map(country => normalizeCountryCode(country)).filter(Boolean)));

  if (!normalizedCountries.length) {
    normalizedCountries.push('tw');
  }

  uniqueYears.forEach(year => {
    normalizedCountries.forEach(country => {
      clearCache(buildDividendUrl(year, country));
    });
  });
}

export { buildDividendUrl as buildDividendRequestUrl };
