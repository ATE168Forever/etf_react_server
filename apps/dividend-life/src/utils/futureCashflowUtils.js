function buildHoldingsMap(inventoryList = []) {
  const holdings = new Map();
  (Array.isArray(inventoryList) ? inventoryList : []).forEach(item => {
    const stockId = item?.stock_id;
    const quantity = Number(item?.total_quantity);
    if (stockId && Number.isFinite(quantity) && quantity > 0) {
      holdings.set(stockId, quantity);
    }
  });
  return holdings;
}

function resolveCurrency(event) {
  return typeof event?.currency === 'string' && event.currency.trim()
    ? event.currency.trim().toUpperCase()
    : 'TWD';
}

export function calculateFutureCashflow({
  dividendData = [],
  inventoryList = [],
  baseCurrency = 'TWD',
  monthlyLivingCost = 0,
  monthsAhead = 6,
  asOfDate = new Date()
} = {}) {
  const holdings = buildHoldingsMap(inventoryList);
  const today = new Date(asOfDate);
  today.setHours(0, 0, 0, 0);

  const monthBuckets = [];
  const bucketIndex = new Map();
  for (let i = 0; i < monthsAhead; i += 1) {
    const d = new Date(today.getFullYear(), today.getMonth() + i, 1);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    bucketIndex.set(key, monthBuckets.length);
    monthBuckets.push({ year: d.getFullYear(), month: d.getMonth(), amount: 0, hasAnnouncedData: false });
  }

  (Array.isArray(dividendData) ? dividendData : []).forEach(event => {
    const stockId = event?.stock_id;
    const quantity = holdings.get(stockId);
    if (!quantity) return;
    if (resolveCurrency(event) !== baseCurrency) return;

    const paymentDateRaw = event?.payment_date;
    if (!paymentDateRaw) return;
    const paymentDate = new Date(paymentDateRaw);
    if (Number.isNaN(paymentDate.getTime())) return;

    // Normalize to midnight for day-level comparison
    const paymentDateNormalized = new Date(paymentDate);
    paymentDateNormalized.setHours(0, 0, 0, 0);

    if (paymentDateNormalized <= today) return;

    const perShare = Number(event?.dividend);
    if (!Number.isFinite(perShare) || perShare <= 0) return;

    const key = `${paymentDate.getFullYear()}-${paymentDate.getMonth()}`;
    const idx = bucketIndex.get(key);
    if (idx === undefined) return;

    monthBuckets[idx].amount += perShare * quantity;
    monthBuckets[idx].hasAnnouncedData = true;
  });

  const isLivingCostSet = Number(monthlyLivingCost) > 0;
  const months = monthBuckets.map(bucket => ({
    ...bucket,
    isBelowLivingCost: isLivingCostSet && bucket.hasAnnouncedData && bucket.amount < Number(monthlyLivingCost)
  }));

  return { currency: baseCurrency, months };
}
