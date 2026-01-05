/**
 * Centralized currency utilities and constants
 */

export const DEFAULT_CURRENCY = 'TWD';
export const SHARES_PER_LOT = 1000;

export const CURRENCY_NAME = {
  zh: {
    TWD: '台股配息',
    USD: '美股股息'
  },
  en: {
    TWD: 'NT$ dividends',
    USD: 'US$ dividends'
  }
};

export const CURRENCY_LABEL = {
  TWD: 'NT$',
  USD: 'US$'
};

export const CURRENCY_SYMBOLS = {
  TWD: 'NT$',
  USD: '$',
  NTD: 'NT$'
};

export const CURRENCY_ORDER = { TWD: 0, USD: 1 };

/**
 * Normalize currency code to standard format
 * @param {string} currency - Raw currency string
 * @returns {string} - Normalized currency code
 */
export function normalizeCurrency(currency) {
  if (!currency) return DEFAULT_CURRENCY;
  const upper = String(currency).toUpperCase().trim();
  if (upper === 'NTD' || upper === 'NT$') return 'TWD';
  if (upper === 'US$') return 'USD';
  return upper;
}

/**
 * Get currency display name based on language
 * @param {string} currency - Currency code
 * @param {string} lang - Language code ('zh' or 'en')
 * @returns {string} - Display name
 */
export function getCurrencyName(currency, lang = 'zh') {
  const names = CURRENCY_NAME[lang] || CURRENCY_NAME.zh;
  return names[currency] || `${currency} dividends`;
}

/**
 * Get currency label/symbol
 * @param {string} currency - Currency code
 * @returns {string} - Currency label
 */
export function getCurrencyLabel(currency) {
  return CURRENCY_LABEL[currency] || currency;
}

/**
 * Sort currencies in standard order (TWD first, then USD, then alphabetically)
 * @param {string[]} currencies - Array of currency codes
 * @returns {string[]} - Sorted array
 */
export function sortCurrencies(currencies) {
  return [...currencies].sort((a, b) => {
    const aOrder = CURRENCY_ORDER[a] ?? 99;
    const bOrder = CURRENCY_ORDER[b] ?? 99;
    if (aOrder !== bOrder) {
      return aOrder - bOrder;
    }
    return a.localeCompare(b);
  });
}

/**
 * Calculate lots needed and cost to reach monthly income goal
 * @param {number} dividend - Dividend per share
 * @param {number} price - Stock price
 * @param {number} goal - Monthly income goal
 * @param {number} freq - Dividend frequency per year (default 12)
 * @param {string} lang - Language code ('zh' or 'en')
 * @returns {string} - Formatted message or empty string
 */
export function calcIncomeGoalInfo(dividend, price, goal, freq = 12, lang = 'zh') {
  if (!price || dividend <= 0 || freq <= 0) return '';
  const annualDividend = dividend * freq;
  const lotsNeeded = Math.ceil((goal * 12) / (annualDividend * SHARES_PER_LOT));
  const cost = Math.round(lotsNeeded * SHARES_PER_LOT * price).toLocaleString();
  return lang === 'en'
    ? `\nTo reach a monthly return of ${goal.toLocaleString()}, you need ${lotsNeeded} lots\nCost: ${cost}`
    : `\n月報酬${goal.toLocaleString()}需: ${lotsNeeded}張\n成本: ${cost}元`;
}

/**
 * Create a number formatter for currency display
 * @param {string} lang - Language code
 * @param {number} minDecimals - Minimum fraction digits
 * @param {number} maxDecimals - Maximum fraction digits
 * @returns {Intl.NumberFormat} - Formatter instance
 */
export function createCurrencyFormatter(lang = 'zh', minDecimals = 0, maxDecimals = 2) {
  const locale = lang === 'en' ? 'en-US' : 'zh-TW';
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: minDecimals,
    maximumFractionDigits: maxDecimals,
  });
}

/**
 * Format a currency value
 * @param {number} value - Numeric value
 * @param {string} lang - Language code
 * @param {number} maxDecimals - Maximum fraction digits
 * @returns {string} - Formatted string
 */
export function formatCurrency(value, lang = 'zh', maxDecimals = 2) {
  const locale = lang === 'en' ? 'en-US' : 'zh-TW';
  return value.toLocaleString(locale, {
    minimumFractionDigits: 0,
    maximumFractionDigits: maxDecimals,
  });
}
