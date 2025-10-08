const TW_HINTS = ['TW', 'TWN', 'TWSE', 'TSE', 'TPEX', 'TPEx', 'TAIWAN', 'TSEC', 'TPE', 'TWD', 'NTD', 'NT$', '台', '臺', '台灣', '臺灣', '台股', '臺股'];
const US_HINTS = ['US', 'USA', 'NYSE', 'NASDAQ', 'AMEX', 'ARCA', 'UNITED STATES', 'USD', 'US$', '美', '美國', '美股'];

function detectMarketFromStockId(stockId = '') {
  if (typeof stockId !== 'string') return 'TW';
  const trimmed = stockId.trim();
  if (!trimmed) return 'TW';
  return /^\d/.test(trimmed) ? 'TW' : 'US';
}

function normalizeHint(value) {
  if (value == null) return '';
  return String(value).trim();
}

function mapHintToMarket(value) {
  const raw = normalizeHint(value);
  if (!raw) return null;
  const upper = raw.toUpperCase();
  if (TW_HINTS.some(hint => upper.includes(hint) || raw.includes(hint))) {
    return 'TW';
  }
  if (US_HINTS.some(hint => upper.includes(hint) || raw.includes(hint))) {
    return 'US';
  }
  return null;
}

export function resolveMarketFromItem(item = {}) {
  const candidates = [
    item.market,
    item.exchange,
    item.region,
    item.country,
    item.currency,
    item.market_code,
  ];
  for (const candidate of candidates) {
    const mapped = mapHintToMarket(candidate);
    if (mapped) return mapped;
  }
  return null;
}

export function buildMarketMap(items = []) {
  const map = {};
  (Array.isArray(items) ? items : []).forEach(item => {
    const stockId = item?.stock_id;
    if (!stockId) return;
    if (map[stockId]) return;
    const market = resolveMarketFromItem(item) || detectMarketFromStockId(stockId);
    map[stockId] = market;
  });
  return map;
}

export function inferMarket(stockId, marketMap = {}) {
  if (!stockId) return 'TW';
  if (marketMap && marketMap[stockId]) return marketMap[stockId];
  return detectMarketFromStockId(stockId);
}

export function getCurrencySymbol(market) {
  return market === 'US' ? 'US$' : 'NT$';
}

export const MARKET_ORDER = ['TW', 'US'];

export const MARKET_LABELS = {
  TW: { zh: '台股', en: 'Taiwan' },
  US: { zh: '美股', en: 'U.S.' },
};
