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
  const totalsByYear = new Map();
  let accumulatedTotal = 0;

  const holdingsTimeline = getHoldingsTimeline(transactionHistory);
  const fallbackHoldings = holdingsTimeline ? null : buildInventoryHoldings(inventoryList);
  let lastMonth = null;
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
    lastMonth = eventDate.getMonth();

    const amount = perShareDividend * quantity;
    const eventYear = eventDate.getFullYear();
    totalsByYear.set(eventYear, (totalsByYear.get(eventYear) || 0) + amount);
    accumulatedTotal += amount;
  });

  const annualTotal = totalsByYear.get(currentYear) || 0;
  const monthlyAverage = annualTotal > 0 ? annualTotal / (lastMonth + 1) : 0;
  const result = {
    accumulatedTotal,
    annualTotal,
    annualYear: currentYear,
    monthlyAverage
  };

  summaryCache.set(cacheKey, result);
  return result;
}

export function buildDividendGoalViewModel({ summary = {}, goals = {}, messages = {}, formatCurrency = (value) => {
  if (!Number.isFinite(value)) return '0.00';
  return Number(value).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
} }) {
  const {
    accumulatedTotal = 0,
    annualTotal = 0,
    annualYear,
    monthlyAverage = 0,
    monthlyMinimum = 0
  } = summary;
  const annualGoal = Number(goals.totalTarget) || 0;
  const monthlyGoal = Number(goals.monthlyTarget) || 0;
  const minimumGoal = Number(goals.minimumTarget) || 0;

  const annualGoalSet = annualGoal > 0;
  const monthlyGoalSet = monthlyGoal > 0;
  const minimumGoalSet = minimumGoal > 0;
  const annualPercentValue = annualGoalSet && annualGoal > 0
    ? Math.min(1, accumulatedTotal / annualGoal)
    : 0;
  const monthlyPercentValue = monthlyGoalSet && monthlyGoal > 0
    ? Math.min(1, monthlyAverage / monthlyGoal)
    : 0;
  const minimumPercentValue = minimumGoalSet && minimumGoal > 0
    ? Math.min(1, monthlyMin / minimumGoal)
    : 0;
  const metrics = [
    {
      id: 'ytd',
      label: messages.goalDividendYtdLabel,
      value: formatCurrency(accumulatedTotal)
    },
    {
      id: 'annual',
      label: annualTotal > 0 && annualYear
        ? `${messages.goalDividendAnnualLabel} (${annualYear})`
        : messages.goalDividendAnnualLabel,
      value: formatCurrency(annualTotal)
    },
    {
      id: 'monthly',
      label: messages.goalDividendMonthlyLabel,
      value: formatCurrency(monthlyAverage)
    },
    {
      id: 'min',
      label: messages.goalDividendMinimumLabel,
      value: formatCurrency(monthlyMin)
    },
    {
      id: 'achievement',
      label: messages.goalAchievementLabel,
      value: annualGoalSet
        ? `${Math.min(100, Math.round(annualPercentValue * 100))}%`
        : `${Math.min(100, Math.round(monthlyPercentValue * 100))}%`
    }
  ].filter(metric => Boolean(metric.label));

  const rows = [];

  if (annualGoalSet) {
    rows.push({
      id: 'annual',
      label: messages.annualGoal,
      current: `${messages.goalDividendAccumulated}${formatCurrency(accumulatedTotal)}`,
      target: `${messages.goalTargetAnnual}${formatCurrency(annualGoal)}`,
      percent: annualPercentValue,
      percentLabel: `${Math.min(100, Math.round(annualPercentValue * 100))}%`,
      encouragement: annualPercentValue >= 1
        ? messages.goalAnnualDone
        : annualPercentValue >= 0.5
          ? messages.goalAnnualHalf
          : ''
    });
  }

  if (monthlyGoalSet) {
    rows.push({
      id: 'monthly',
      label: messages.monthlyGoal,
      current: `${messages.goalDividendMonthly}${formatCurrency(monthlyAverage)}`,
      target: `${messages.goalTargetMonthly}${formatCurrency(monthlyGoal)}`,
      percent: monthlyPercentValue,
      percentLabel: `${Math.min(100, Math.round(monthlyPercentValue * 100))}%`,
      encouragement: monthlyPercentValue >= 1
        ? messages.goalMonthlyDone
        : monthlyPercentValue >= 0.5
          ? messages.goalMonthlyHalf
          : ''
    });
  }

  if (minimumGoalSet) {
    rows.push({
      id: 'minimum',
      label: messages.minimumGoal,
      current: `${messages.goalDividendMinimum}${formatCurrency(monthlyMinimum)}`,
      target: `${messages.goalTargetMinimum}${formatCurrency(minimumGoal)}`,
      percent: minimumPercentValue,
      percentLabel: `${Math.min(100, Math.round(minimumPercentValue * 100))}%`,
      encouragement: minimumPercentValue >= 1
        ? messages.goalMinimumDone
        : minimumPercentValue >= 0.5
          ? messages.goalMinimumHalf
          : ''
    });
  }

  const emptyState = rows.length === 0 ? messages.goalEmpty || '' : '';

  return {
    metrics,
    rows,
    emptyState
  };
}
