import { API_HOST } from './config';
import { fetchWithCache, clearCache } from './api';
import { normalizeDividendResponse, DIVIDEND_YEARS } from './dividendGoalUtils';

function buildDividendUrl(year) {
  return `${API_HOST}/get_dividend?year=${year}`;
}

export async function fetchDividendsByYears(years = DIVIDEND_YEARS) {
  const requests = years.map(year => fetchWithCache(buildDividendUrl(year)));
  const results = await Promise.allSettled(requests);

  const fulfilled = results
    .map((result, index) => (result.status === 'fulfilled'
      ? { year: years[index], ...result.value }
      : null))
    .filter(Boolean);

  if (!fulfilled.length) {
    const firstRejection = results.find(result => result.status === 'rejected');
    if (firstRejection?.reason) throw firstRejection.reason;
    throw new Error('Failed to fetch dividend data');
  }

  const data = fulfilled.flatMap(({ data }) => normalizeDividendResponse(data));
  const meta = fulfilled.map(({ year, cacheStatus, timestamp }) => ({
    year,
    cacheStatus: cacheStatus || null,
    timestamp: timestamp || null
  }));

  return { data, meta };
}

export function clearDividendsCache(years = DIVIDEND_YEARS) {
  years.forEach(year => {
    clearCache(buildDividendUrl(year));
  });
}

export { buildDividendUrl as buildDividendRequestUrl };
