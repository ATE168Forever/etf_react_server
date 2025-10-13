export const CURRENT_YEAR = new Date().getFullYear();
export const PREVIOUS_YEAR = CURRENT_YEAR - 1;

export const DIVIDEND_YEARS = [CURRENT_YEAR, PREVIOUS_YEAR];

export function normalizeDividendResponse(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.items)) return payload.items;
  return [];
}

function toValidDate(value) {
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime()) ? date : null;
}

const holdingsTimelineCache = new WeakMap();
const objectCacheKeyRegistry = new WeakMap();
const summaryCache = new Map();
let objectCacheKeySeed = 0;

function getObjectCacheKey(obj, fallback) {
  if (!obj || (typeof obj !== 'object' && typeof obj !== 'function')) {
    return fallback;
  }
  if (!objectCacheKeyRegistry.has(obj)) {
    objectCacheKeySeed += 1;
    objectCacheKeyRegistry.set(obj, `obj-${objectCacheKeySeed}`);
  }
  return objectCacheKeyRegistry.get(obj);
}

function normalizeTransactionHistory(transactionHistory = []) {
  const perStockTimeline = new Map();
  if (!Array.isArray(transactionHistory) || !transactionHistory.length) {
    return perStockTimeline;
  }

  transactionHistory.forEach((item, index) => {
    const stockId = item?.stock_id;
    if (!stockId) return;
    const rawQuantity = Number(item?.quantity);
    if (!Number.isFinite(rawQuantity) || rawQuantity === 0) return;
    const eventDate = toValidDate(item?.date || item?.purchased_date);
    if (!eventDate) return;
    const direction = item?.type === 'sell' ? -1 : 1;
    const delta = direction * rawQuantity;
    if (!perStockTimeline.has(stockId)) {
      perStockTimeline.set(stockId, []);
    }
    perStockTimeline.get(stockId).push({ date: eventDate, delta, index });
  });

  perStockTimeline.forEach((events, stockId) => {
    events.sort((a, b) => {
      const diff = a.date - b.date;
      return diff !== 0 ? diff : a.index - b.index;
    });
    let running = 0;
    const timeline = events.map(({ date, delta }) => {
      running += delta;
      if (running < 0) running = 0;
      return { date, quantity: running };
    });
    perStockTimeline.set(stockId, timeline);
  });

  return perStockTimeline;
}

function getHoldingsTimeline(transactionHistory) {
  if (!Array.isArray(transactionHistory) || !transactionHistory.length) {
    return null;
  }
  if (holdingsTimelineCache.has(transactionHistory)) {
    return holdingsTimelineCache.get(transactionHistory);
  }
  const timeline = normalizeTransactionHistory(transactionHistory);
  const result = timeline.size ? timeline : null;
  holdingsTimelineCache.set(transactionHistory, result);
  return result;
}

function getQuantityOnDate(timeline = [], targetDate) {
  if (!Array.isArray(timeline) || !timeline.length || !targetDate) {
    return 0;
  }
  const targetTime = targetDate.getTime();
  let left = 0;
  let right = timeline.length - 1;
  let quantity = 0;
  while (left <= right) {
    const mid = Math.floor((left + right) / 2);
    const midTime = timeline[mid].date.getTime();
    if (midTime <= targetTime) {
      quantity = timeline[mid].quantity;
      left = mid + 1;
    } else {
      right = mid - 1;
    }
  }
  return quantity > 0 ? quantity : 0;
}

function buildInventoryHoldings(inventoryList = []) {
  const holdings = new Map();
  if (!Array.isArray(inventoryList)) {
    return holdings;
  }
  inventoryList.forEach(item => {
    const stockId = item?.stock_id;
    const quantity = Number(item?.total_quantity);
    if (!stockId || !Number.isFinite(quantity) || quantity <= 0) return;
    holdings.set(stockId, quantity);
  });
  return holdings;
}

function getEventCurrency(event) {
  const raw = event?.currency
    ?? event?.dividend_currency
    ?? event?.payment_currency;
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (trimmed) {
      return trimmed.toUpperCase();
    }
  }
  return 'TWD';
}

export function calculateDividendSummary({
  inventoryList = [],
  dividendEvents = [],
  transactionHistory = [],
  asOfDate = new Date()
} = {}) {
  const now = toValidDate(asOfDate) || new Date();
  const asOfKey = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}`;
  const historyKey = getObjectCacheKey(Array.isArray(transactionHistory) ? transactionHistory : null, 'no-history');
  const dividendKey = getObjectCacheKey(Array.isArray(dividendEvents) ? dividendEvents : null, 'no-dividends');
  const inventoryKey = getObjectCacheKey(Array.isArray(inventoryList) ? inventoryList : null, 'no-inventory');
  const cacheKey = `${historyKey}|${dividendKey}|${inventoryKey}|${asOfKey}`;

  if (summaryCache.has(cacheKey)) {
    return summaryCache.get(cacheKey);
  }

  const currentYear = now.getFullYear();
  const currencyBuckets = new Map();

  const holdingsTimeline = getHoldingsTimeline(transactionHistory);
  const fallbackHoldings = holdingsTimeline ? null : buildInventoryHoldings(inventoryList);
  (Array.isArray(dividendEvents) ? dividendEvents : []).forEach(event => {
    const stockId = event?.stock_id;
    if (!stockId) return;
    const perShareDividend = Number(event?.dividend);
    if (!Number.isFinite(perShareDividend) || perShareDividend <= 0) return;
    const eventDate = toValidDate(event?.dividend_date) || toValidDate(event?.payment_date);
    if (!eventDate) return;

    let quantity = 0;
    if (holdingsTimeline) {
      const stockTimeline = holdingsTimeline.get(stockId);
      quantity = getQuantityOnDate(stockTimeline, eventDate);
    } else if (fallbackHoldings) {
      quantity = fallbackHoldings.get(stockId) || 0;
    }
    if (!quantity) return;
    const monthIndex = eventDate.getMonth();

    const currency = getEventCurrency(event);
    if (!currencyBuckets.has(currency)) {
      currencyBuckets.set(currency, {
        totalsByYear: new Map(),
        monthlyTotals: new Map(),
        accumulatedTotal: 0,
        maxMonthIndex: -1
      });
    }
    const bucket = currencyBuckets.get(currency);

    const amount = perShareDividend * quantity;
    const eventYear = eventDate.getFullYear();
    bucket.totalsByYear.set(eventYear, (bucket.totalsByYear.get(eventYear) || 0) + amount);
    bucket.accumulatedTotal += amount;

    if (eventYear === currentYear) {
      bucket.monthlyTotals.set(monthIndex, (bucket.monthlyTotals.get(monthIndex) || 0) + amount);
      if (monthIndex > bucket.maxMonthIndex) {
        bucket.maxMonthIndex = monthIndex;
      }
    }
  });

  const perCurrency = {};
  const currencyOrder = [];
  currencyBuckets.forEach((bucket, currency) => {
    const annualTotal = bucket.totalsByYear.get(currentYear) || 0;
    const monthsElapsed = bucket.maxMonthIndex >= 0
      ? bucket.maxMonthIndex + 1
      : now.getFullYear() === currentYear
        ? now.getMonth() + 1
        : 0;
    const monthlyAverage = annualTotal > 0 && monthsElapsed > 0 ? annualTotal / monthsElapsed : 0;

    let monthlyMinimum = 0;
    const currentMonthIndex = now.getFullYear() === currentYear ? now.getMonth() : bucket.maxMonthIndex;
    if (currentMonthIndex !== null && currentMonthIndex >= 0) {
      let min = Infinity;
      for (let month = 0; month <= currentMonthIndex; month += 1) {
        const value = bucket.monthlyTotals.get(month) || 0;
        if (value < min) {
          min = value;
        }
      }
      monthlyMinimum = Number.isFinite(min) ? min : 0;
    } else if (bucket.monthlyTotals.size) {
      monthlyMinimum = Math.min(...bucket.monthlyTotals.values());
    }

    perCurrency[currency] = {
      accumulatedTotal: bucket.accumulatedTotal,
      annualTotal,
      monthlyAverage,
      monthlyMinimum
    };
    currencyOrder.push(currency);
  });

  const preferredCurrency = currencyOrder.includes('TWD')
    ? 'TWD'
    : (currencyOrder[0] || 'TWD');
  const baseSummary = perCurrency[preferredCurrency] || {
    accumulatedTotal: 0,
    annualTotal: 0,
    monthlyAverage: 0,
    monthlyMinimum: 0
  };

  const result = {
    accumulatedTotal: baseSummary.accumulatedTotal,
    annualTotal: baseSummary.annualTotal,
    annualYear: currentYear,
    monthlyAverage: baseSummary.monthlyAverage,
    monthlyMinimum: baseSummary.monthlyMinimum,
    perCurrency,
    baseCurrency: preferredCurrency
  };

  summaryCache.set(cacheKey, result);
  return result;
}

export function buildDividendGoalViewModel({ summary = {}, goals = {}, messages = {}, formatCurrency = (value) => {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return '0.00';
  return numericValue.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
} }) {
  const {
    accumulatedTotal = 0,
    annualTotal = 0,
    annualYear,
    monthlyAverage = 0,
    monthlyMinimum = 0,
    perCurrency = {},
    baseCurrency = 'TWD'
  } = summary;
  const supportedCurrencies = ['TWD', 'USD'];

  const sanitizeGoalName = value => {
    if (typeof value !== 'string') return '';
    return value.trim().slice(0, 60);
  };

  const normalizeCurrency = value => {
    const raw = typeof value === 'string' ? value.trim().toUpperCase() : '';
    if (supportedCurrencies.includes(raw)) {
      return raw;
    }
    if (typeof baseCurrency === 'string' && baseCurrency.trim()) {
      return baseCurrency.trim();
    }
    return 'TWD';
  };

  const normalizeGoalType = value => {
    const raw = typeof value === 'string' ? value.trim().toLowerCase() : '';
    return ['annual', 'monthly', 'minimum'].includes(raw) ? raw : 'annual';
  };

  const normalizeCashflowGoalList = rawGoals => {
    const normalized = Array.isArray(rawGoals) ? rawGoals : [];
    const goalsList = normalized
      .map((goal, index) => {
        const targetValue = Number(goal?.target);
        if (!Number.isFinite(targetValue) || targetValue <= 0) {
          return null;
        }
        const goalType = normalizeGoalType(goal?.goalType);
        const currency = normalizeCurrency(goal?.currency);
        const id = typeof goal?.id === 'string' && goal.id.trim()
          ? goal.id.trim()
          : `goal-${index}`;
        return {
          id,
          goalType,
          target: targetValue,
          currency,
          name: sanitizeGoalName(goal?.name)
        };
      })
      .filter(Boolean);

    if (goalsList.length) {
      return goalsList;
    }

    const fallbackGoals = [];
    const appendFallback = (goalType, value) => {
      const numericValue = Number(value);
      if (!Number.isFinite(numericValue) || numericValue <= 0) {
        return;
      }
      fallbackGoals.push({
        id: `legacy-${goalType}`,
        goalType,
        target: numericValue,
        currency: normalizeCurrency('TWD'),
        name: ''
      });
    };
    appendFallback('annual', goals?.totalTarget);
    appendFallback('monthly', goals?.monthlyTarget);
    appendFallback('minimum', goals?.minimumTarget);
    return fallbackGoals;
  };

  const cashflowGoals = normalizeCashflowGoalList(goals?.cashflowGoals);

  const currencyLabelMap = {
    TWD: 'NT$',
    USD: 'US$',
    HKD: 'HK$',
    CNY: 'CN¥',
    JPY: 'JP¥',
    EUR: '€',
    GBP: '£',
    SGD: 'S$',
    AUD: 'A$',
    CAD: 'CA$',
    CHF: 'CHF',
    KRW: '₩',
    NZD: 'NZ$',
    SEK: 'SEK',
    NOK: 'NOK',
    DKK: 'DKK'
  };

  const resolveCurrencyLabel = (currency) => {
    if (typeof currency !== 'string' || !currency) return '';
    return currencyLabelMap[currency] || currency;
  };

  const formatCurrencyWithLabel = (value, currency = baseCurrency) => {
    const safeCurrency = typeof currency === 'string' && currency ? currency : baseCurrency;
    const numericValue = Number(value);
    const formatted = formatCurrency(Number.isFinite(numericValue) ? numericValue : 0, safeCurrency);
    const label = resolveCurrencyLabel(safeCurrency);
    return label ? `${label} ${formatted}` : formatted;
  };

  const getSortedCurrencies = () => {
    const currencies = Object.keys(perCurrency || {});
    if (!currencies.length) {
      return [];
    }
    return currencies.sort((a, b) => {
      if (a === baseCurrency) return -1;
      if (b === baseCurrency) return 1;
      return a.localeCompare(b);
    });
  };

  const getSortedCurrencyEntries = (key, { includeZero = false } = {}) => {
    const currencies = getSortedCurrencies();
    if (!currencies.length) {
      return [];
    }
    const normalized = currencies.map(currency => ({
      currency,
      amount: Number(perCurrency?.[currency]?.[key]) || 0
    }));
    if (includeZero) {
      return normalized;
    }
    const positiveEntries = normalized.filter(item => item.amount > 0);
    return positiveEntries.length ? positiveEntries : normalized;
  };

  const formatMultiCurrencyValue = (key) => {
    const entries = getSortedCurrencyEntries(key);
    if (!entries.length) {
      return formatCurrencyWithLabel(0, baseCurrency);
    }
    return entries
      .map(entry => formatCurrencyWithLabel(entry.amount, entry.currency))
      .join(' + ');
  };

  const currencyBreakdown = getSortedCurrencyEntries('accumulatedTotal')
    .map(entry => ({
      currency: entry.currency,
      label: resolveCurrencyLabel(entry.currency),
      value: formatCurrencyWithLabel(entry.amount, entry.currency)
    }));

  const currencyMetrics = getSortedCurrencyEntries('accumulatedTotal', { includeZero: true })
    .map(entry => {
      const data = perCurrency?.[entry.currency] || {};
      return {
        currency: entry.currency,
        label: resolveCurrencyLabel(entry.currency),
        accumulatedTotal: formatCurrencyWithLabel(data.accumulatedTotal, entry.currency),
        annualTotal: formatCurrencyWithLabel(data.annualTotal, entry.currency),
        monthlyAverage: formatCurrencyWithLabel(data.monthlyAverage, entry.currency),
        monthlyMinimum: formatCurrencyWithLabel(data.monthlyMinimum, entry.currency)
      };
    });

  const getCurrencySummary = currency => {
    if (currency && perCurrency?.[currency]) {
      const data = perCurrency[currency];
      return {
        accumulatedTotal: Number(data.accumulatedTotal) || 0,
        annualTotal: Number(data.annualTotal) || 0,
        monthlyAverage: Number(data.monthlyAverage) || 0,
        monthlyMinimum: Number(data.monthlyMinimum) || 0
      };
    }
    if (currency === baseCurrency) {
      return {
        accumulatedTotal: Number(accumulatedTotal) || 0,
        annualTotal: Number(annualTotal) || 0,
        monthlyAverage: Number(monthlyAverage) || 0,
        monthlyMinimum: Number(monthlyMinimum) || 0
      };
    }
    return {
      accumulatedTotal: 0,
      annualTotal: 0,
      monthlyAverage: 0,
      monthlyMinimum: 0
    };
  };

  const typeLabelMap = {
    annual: messages.annualGoal,
    monthly: messages.monthlyGoal,
    minimum: messages.minimumGoal
  };

  const encouragementMap = {
    annual: { half: messages.goalAnnualHalf, done: messages.goalAnnualDone },
    monthly: { half: messages.goalMonthlyHalf, done: messages.goalMonthlyDone },
    minimum: { half: messages.goalMinimumHalf, done: messages.goalMinimumDone }
  };

  const labelPrefixMap = {
    annual: messages.goalDividendAccumulated,
    monthly: messages.goalDividendMonthly,
    minimum: messages.goalDividendMinimum
  };

  const targetLabelMap = {
    annual: messages.goalTargetAnnual,
    monthly: messages.goalTargetMonthly,
    minimum: messages.goalTargetMinimum
  };

  const buildGoalRow = goal => {
    const currencySummary = getCurrencySummary(goal.currency);
    let currentValue = 0;
    if (goal.goalType === 'annual') {
      currentValue = currencySummary.accumulatedTotal;
    } else if (goal.goalType === 'monthly') {
      currentValue = currencySummary.monthlyAverage;
    } else if (goal.goalType === 'minimum') {
      currentValue = currencySummary.monthlyMinimum;
    }

    const percent = goal.target > 0
      ? Math.min(1, currentValue / goal.target)
      : 0;
    const encouragementConfig = encouragementMap[goal.goalType] || {};
    const encouragement = percent >= 1
      ? encouragementConfig.done
      : percent >= 0.5
        ? encouragementConfig.half
        : '';

    const baseLabel = goal.name || typeLabelMap[goal.goalType] || goal.goalType;
    const currencyLabel = resolveCurrencyLabel(goal.currency);
    const label = currencyLabel ? `${baseLabel} (${currencyLabel})` : baseLabel;
    const currentLabelPrefix = labelPrefixMap[goal.goalType] || '';
    const targetLabelPrefix = targetLabelMap[goal.goalType] || '';

    return {
      id: goal.id,
      label,
      current: currentLabelPrefix
        ? `${currentLabelPrefix}${formatCurrencyWithLabel(currentValue, goal.currency)}`
        : formatCurrencyWithLabel(currentValue, goal.currency),
      target: targetLabelPrefix
        ? `${targetLabelPrefix}${formatCurrencyWithLabel(goal.target, goal.currency)}`
        : formatCurrencyWithLabel(goal.target, goal.currency),
      percent,
      percentLabel: `${Math.min(100, Math.round(percent * 100))}%`,
      encouragement: encouragement || ''
    };
  };

  const goalRows = cashflowGoals.map(buildGoalRow).filter(Boolean);

  const primaryGoalType = goalRows.length > 0 ? cashflowGoals[0]?.goalType || '' : '';
  const achievementPercentValue = goalRows[0]?.percent || 0;
  const achievementLabel = `${Math.min(100, Math.round(achievementPercentValue * 100))}%`;

  const metrics = [
    {
      id: 'ytd',
      label: messages.goalDividendYtdLabel,
      value: formatMultiCurrencyValue('accumulatedTotal')
    },
    {
      id: 'annual',
      label: annualTotal > 0 && annualYear
        ? `${messages.goalDividendAnnualLabel} (${annualYear})`
        : messages.goalDividendAnnualLabel,
      value: formatMultiCurrencyValue('annualTotal'),
      isActive: primaryGoalType === 'annual'
    },
    {
      id: 'monthly',
      label: messages.goalDividendMonthlyLabel,
      value: formatMultiCurrencyValue('monthlyAverage'),
      isActive: primaryGoalType === 'monthly'
    },
    {
      id: 'minimum',
      label: messages.goalDividendMinimumLabel,
      value: formatMultiCurrencyValue('monthlyMinimum'),
      isActive: primaryGoalType === 'minimum'
    },
    {
      id: 'achievement',
      label: messages.goalAchievementLabel,
      value: achievementLabel,
      highlight: achievementPercentValue >= 0.5,
      showCelebration: achievementPercentValue >= 1
    }
  ].filter(metric => Boolean(metric.label));

  const rows = goalRows;

  const emptyState = rows.length === 0 ? messages.goalEmpty || '' : '';

  return {
    metrics,
    rows,
    emptyState,
    goalType: primaryGoalType,
    achievementPercent: achievementPercentValue,
    currencyBreakdown,
    currencyMetrics
  };
}
